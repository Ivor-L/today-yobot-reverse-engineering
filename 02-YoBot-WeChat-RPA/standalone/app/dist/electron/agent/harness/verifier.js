import { TaskContractStore } from "./task_contract.js";
import { stableTraceHash } from "./context_projection_trace.js";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { SecurePathUtils } from "../../utils/fs-secure.js";
import { FILESYSTEM_ALLOWED_ROOTS, resolveFilesystemTarget, } from "../../skills/builtins/filesystem_policy.js";
function terminalResult(verifierId, verifierVersion, status, message, attempts) {
    return {
        status,
        criterionResults: [{
                criterionId: "verifier",
                status,
                method: "evidence",
                evidence: [],
                message,
            }],
        repairable: false,
        verifierId,
        verifierVersion,
        attempts,
    };
}
async function runAttempt(verifier, context, timeoutMs) {
    if (context.signal?.aborted) {
        return terminalResult(verifier.id, verifier.version, "aborted", "Verification was aborted.", 1);
    }
    const controller = new AbortController();
    const onAbort = () => controller.abort(context.signal?.reason);
    context.signal?.addEventListener("abort", onAbort, { once: true });
    let timer;
    try {
        const verification = Promise.resolve(verifier.verify({ ...context, signal: controller.signal }));
        const timeout = new Promise((resolve) => {
            timer = setTimeout(() => {
                controller.abort(new Error("verification_timeout"));
                resolve(terminalResult(verifier.id, verifier.version, "timed_out", "Verification timed out.", 1));
            }, timeoutMs);
        });
        return await Promise.race([verification, timeout]);
    }
    catch (error) {
        if (context.signal?.aborted) {
            return terminalResult(verifier.id, verifier.version, "aborted", "Verification was aborted.", 1);
        }
        return terminalResult(verifier.id, verifier.version, "inconclusive", error instanceof Error ? error.message : String(error), 1);
    }
    finally {
        if (timer)
            clearTimeout(timer);
        context.signal?.removeEventListener("abort", onAbort);
    }
}
export class VerifierRegistry {
    static instance;
    verifiers = new Map();
    static getInstance() {
        if (!VerifierRegistry.instance)
            VerifierRegistry.instance = new VerifierRegistry();
        return VerifierRegistry.instance;
    }
    register(verifier) {
        if (!verifier.id || !verifier.version)
            throw new Error("Verifier id and version are required.");
        this.verifiers.set(verifier.id, verifier);
    }
    has(verifierId) {
        return this.verifiers.has(verifierId);
    }
    clear() {
        this.verifiers.clear();
    }
    async verify(verifierId, context, options = {}) {
        const verifier = this.verifiers.get(verifierId);
        if (!verifier) {
            return terminalResult(verifierId, "missing", "inconclusive", "Verifier is not registered.", 0);
        }
        const timeoutMs = Math.max(1, Math.min(options.timeoutMs ?? 10_000, 60_000));
        const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 2, 3));
        let attempts = 0;
        let result;
        do {
            attempts += 1;
            result = await runAttempt(verifier, context, timeoutMs);
            if (result.status !== "inconclusive" || context.signal?.aborted)
                break;
        } while (attempts < maxAttempts);
        return {
            ...result,
            verifierId: verifier.id,
            verifierVersion: verifier.version,
            attempts,
        };
    }
}
function hashRef(value) {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
const MAX_EXACT_FILE_VERIFY_BYTES = 8 * 1024 * 1024;
const localFileWriteVerifier = {
    id: "local-file-write-v1",
    version: "1.1.0",
    async verify(context) {
        const params = context.params && typeof context.params === "object"
            ? context.params
            : {};
        const targetInput = params.file_path ?? params.filename ?? params.path;
        const expected = params.content;
        const failed = (message) => ({
            status: "failed",
            criterionResults: [{
                    criterionId: "file_content_matches",
                    status: "failed",
                    method: "read_back",
                    evidence: [],
                    message,
                }],
            repairable: true,
            suggestedRepair: "Retry the write once with the same target and expected content.",
        });
        if (typeof targetInput !== "string" || !targetInput.trim() || typeof expected !== "string") {
            return failed("The write parameters do not contain a valid target and string content.");
        }
        const expectedBytes = Buffer.from(expected, "utf8");
        if (expectedBytes.byteLength > MAX_EXACT_FILE_VERIFY_BYTES) {
            return {
                status: "inconclusive",
                criterionResults: [],
                repairable: false,
                suggestedRepair: "Use a streaming artifact verifier for files larger than 8 MiB.",
            };
        }
        const target = resolveFilesystemTarget(targetInput);
        try {
            await SecurePathUtils.assertSandbox(target, FILESYSTEM_ALLOWED_ROOTS);
        }
        catch {
            return failed("The target is outside the filesystem sandbox.");
        }
        if (context.signal?.aborted) {
            return {
                status: "aborted",
                criterionResults: [],
                repairable: false,
            };
        }
        try {
            const pathStat = await fs.lstat(target);
            if (pathStat.isSymbolicLink())
                return failed("The write target is a symbolic link, not a regular file.");
            if (!pathStat.isFile())
                return failed("The write target is not a regular file.");
            if (pathStat.size !== expectedBytes.byteLength) {
                return failed(`Persisted size mismatch (${pathStat.size} bytes).`);
            }
            const handle = await fs.open(target, "r");
            let actual;
            let beforeRead;
            let afterRead;
            try {
                beforeRead = await handle.stat();
                actual = await handle.readFile();
                afterRead = await handle.stat();
            }
            finally {
                await handle.close();
            }
            if (beforeRead.size !== afterRead.size || beforeRead.mtimeMs !== afterRead.mtimeMs) {
                return {
                    status: "inconclusive",
                    criterionResults: [],
                    repairable: true,
                    suggestedRepair: "The file changed during verification; retry after concurrent writers finish.",
                };
            }
            const matches = actual.equals(expectedBytes);
            const targetRef = hashRef(target);
            return {
                status: matches ? "passed" : "failed",
                criterionResults: [{
                        criterionId: "file_content_matches",
                        status: matches ? "passed" : "failed",
                        method: "read_back",
                        evidence: [{
                                type: "read_back",
                                ref: targetRef,
                                summary: matches
                                    ? `Exact byte match (${actual.byteLength} bytes, ${hashRef(actual)}).`
                                    : `Content mismatch (${actual.byteLength} bytes).`,
                            }],
                        ...(!matches ? { message: "The persisted file does not match the requested content." } : {}),
                    }],
                repairable: !matches,
                ...(!matches ? { suggestedRepair: "Retry the write once with the same target and expected content." } : {}),
            };
        }
        catch (error) {
            if (error?.code === "ENOENT")
                return failed("The target file does not exist after the write.");
            if (error?.code === "EISDIR")
                return failed("The write target is a directory, not a file.");
            return {
                status: "inconclusive",
                criterionResults: [],
                repairable: true,
                suggestedRepair: "Read the target with the filesystem tool and compare it manually.",
            };
        }
    },
};
function verifierParams(context) {
    return context.params && typeof context.params === "object"
        ? context.params
        : {};
}
function rawReceipt(rawResult) {
    if (rawResult && typeof rawResult === "object")
        return rawResult;
    if (typeof rawResult !== "string")
        return {};
    try {
        const parsed = JSON.parse(rawResult);
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch {
        return {};
    }
}
const localFileDeleteVerifier = {
    id: "local-file-delete-v1",
    version: "1.0.0",
    async verify(context) {
        const targetInput = verifierParams(context).file_path;
        const receipt = rawReceipt(context.rawResult);
        const failed = (message) => ({
            status: "failed",
            criterionResults: [{
                    criterionId: "file_absent_after_delete",
                    status: "failed",
                    method: "read_back",
                    evidence: [],
                    message,
                }],
            repairable: false,
        });
        if (typeof targetInput !== "string" || !targetInput.trim())
            return failed("Delete target is missing.");
        if (receipt.deleted !== true || typeof receipt.contentHash !== "string") {
            return failed("Delete execution did not return a valid pre-delete receipt.");
        }
        const target = resolveFilesystemTarget(targetInput);
        try {
            await SecurePathUtils.assertSandbox(target, FILESYSTEM_ALLOWED_ROOTS);
        }
        catch {
            return failed("The delete target is outside the filesystem sandbox.");
        }
        try {
            await fs.lstat(target);
            return failed("The target still exists after delete.");
        }
        catch (error) {
            if (error?.code !== "ENOENT") {
                return {
                    status: "inconclusive",
                    criterionResults: [],
                    repairable: false,
                };
            }
        }
        return {
            status: "passed",
            criterionResults: [{
                    criterionId: "file_absent_after_delete",
                    status: "passed",
                    method: "read_back",
                    evidence: [{
                            type: "read_back",
                            ref: hashRef(target),
                            summary: `Target is absent; deleted content receipt ${receipt.contentHash}.`,
                        }],
                }],
            repairable: false,
        };
    },
};
const localFileMoveVerifier = {
    id: "local-file-move-v1",
    version: "1.0.0",
    async verify(context) {
        const params = verifierParams(context);
        const sourceInput = params.source_path;
        const targetInput = params.target_path;
        const receipt = rawReceipt(context.rawResult);
        const failed = (message) => ({
            status: "failed",
            criterionResults: [{
                    criterionId: "file_moved_with_content",
                    status: "failed",
                    method: "read_back",
                    evidence: [],
                    message,
                }],
            repairable: false,
        });
        if (typeof sourceInput !== "string" || !sourceInput.trim()
            || typeof targetInput !== "string" || !targetInput.trim()) {
            return failed("Move source or target is missing.");
        }
        if (receipt.moved !== true || typeof receipt.contentHash !== "string") {
            return failed("Move execution did not return a valid content receipt.");
        }
        const source = resolveFilesystemTarget(sourceInput);
        const target = resolveFilesystemTarget(targetInput);
        try {
            await SecurePathUtils.assertSandbox(source, FILESYSTEM_ALLOWED_ROOTS);
            await SecurePathUtils.assertSandbox(target, FILESYSTEM_ALLOWED_ROOTS);
        }
        catch {
            return failed("The move source or target is outside the filesystem sandbox.");
        }
        try {
            await fs.lstat(source);
            return failed("The source still exists after move.");
        }
        catch (error) {
            if (error?.code !== "ENOENT") {
                return { status: "inconclusive", criterionResults: [], repairable: false };
            }
        }
        try {
            const actual = await fs.readFile(target);
            const actualHash = hashRef(actual);
            if (actualHash !== receipt.contentHash)
                return failed("Moved target content does not match the source receipt.");
            return {
                status: "passed",
                criterionResults: [{
                        criterionId: "file_moved_with_content",
                        status: "passed",
                        method: "read_back",
                        evidence: [{
                                type: "read_back",
                                ref: hashRef(target),
                                summary: `Source absent and target content matches (${actual.byteLength} bytes, ${actualHash}).`,
                            }],
                    }],
                repairable: false,
            };
        }
        catch (error) {
            if (error?.code === "ENOENT")
                return failed("The target does not exist after move.");
            return { status: "inconclusive", criterionResults: [], repairable: false };
        }
    },
};
export function registerBuiltInVerifiers(registry = VerifierRegistry.getInstance()) {
    if (!registry.has(localFileWriteVerifier.id))
        registry.register(localFileWriteVerifier);
    if (!registry.has(localFileDeleteVerifier.id))
        registry.register(localFileDeleteVerifier);
    if (!registry.has(localFileMoveVerifier.id))
        registry.register(localFileMoveVerifier);
}
export function resolveVerifierMode(value = process.env.YOKO_VERIFIER) {
    const normalized = String(value ?? "shadow").trim().toLowerCase();
    if (["off", "false", "0"].includes(normalized))
        return "off";
    if (["enforce", "true", "1", "on"].includes(normalized))
        return "enforce";
    return "shadow";
}
export async function verifyToolExecution(record, input) {
    const metadata = input.metadata;
    const verifierId = metadata?.verifierId;
    if (!metadata || !verifierId || resolveVerifierMode() === "off" || record.status !== "ok")
        return undefined;
    registerBuiltInVerifiers();
    return VerifierRegistry.getInstance().verify(verifierId, {
        record,
        toolName: input.toolName,
        params: input.params,
        rawResult: input.rawResult,
        metadata,
        contract: TaskContractStore.getInstance().active(input.sessionId),
        signal: input.signal,
    });
}
export function verificationResultTrace(result) {
    return {
        schemaVersion: 1,
        verifierId: result.verifierId,
        verifierVersion: result.verifierVersion,
        status: result.status,
        attempts: result.attempts,
        repairable: result.repairable,
        criteria: result.criterionResults.map((criterion) => ({
            criterionHash: stableTraceHash(criterion.criterionId),
            status: criterion.status,
            method: criterion.method,
            evidenceCount: criterion.evidence.length,
            evidenceTypes: criterion.evidence.map((item) => item.type),
        })),
    };
}
