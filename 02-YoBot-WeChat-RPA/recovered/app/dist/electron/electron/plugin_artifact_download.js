import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
const DOWNLOAD_METADATA_VERSION = 1;
const COPY_BUFFER_BYTES = 1024 * 1024;
const DEFAULT_CONNECT_TIMEOUT_MS = 45_000;
const DEFAULT_IDLE_TIMEOUT_MS = 60_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 15 * 60_000;
export class PluginArtifactIntegrityError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PluginArtifactIntegrityError';
    }
}
export class PluginArtifactDownloadTimeoutError extends Error {
    phase;
    code = 'PLUGIN_ARTIFACT_DOWNLOAD_TIMEOUT';
    constructor(phase) {
        super(`插件下载${phase === 'connect' ? '连接' : phase === 'idle' ? '数据流' : '总时长'}超时，已保留断点数据`);
        this.phase = phase;
        this.name = 'PluginArtifactDownloadTimeoutError';
    }
}
function boundedTimeout(value, fallback, label) {
    const timeout = value ?? fallback;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60 * 60_000) {
        throw new Error(`${label} 无效`);
    }
    return timeout;
}
function waitForTransport(task, signal, error) {
    if (signal.aborted)
        return Promise.reject(error());
    return new Promise((resolve, reject) => {
        const aborted = () => reject(error());
        signal.addEventListener('abort', aborted, { once: true });
        void task.then((value) => { signal.removeEventListener('abort', aborted); resolve(value); }, (cause) => { signal.removeEventListener('abort', aborted); reject(cause); });
    });
}
function partialPaths(destinationPath) {
    return {
        partial: `${destinationPath}.partial`,
        metadata: `${destinationPath}.partial.json`,
    };
}
function validateOptions(options) {
    if (!path.isAbsolute(options.destinationPath))
        throw new Error('插件下载目标必须是绝对路径');
    if (!/^[a-f0-9]{64}$/.test(options.expectedSha256))
        throw new Error('插件下载 SHA-256 无效');
    if (!Number.isSafeInteger(options.expectedSizeBytes) || options.expectedSizeBytes <= 0) {
        throw new Error('插件下载字节数无效');
    }
    let artifactUrl;
    try {
        artifactUrl = new URL(options.artifactUrl);
    }
    catch {
        throw new Error('插件下载 URL 无效');
    }
    if (artifactUrl.protocol !== 'https:' || artifactUrl.username || artifactUrl.password
        || artifactUrl.search || artifactUrl.hash) {
        throw new Error('插件下载只接受无凭据、query、fragment 的 HTTPS URL');
    }
    boundedTimeout(options.connectTimeoutMs, DEFAULT_CONNECT_TIMEOUT_MS, '插件连接超时');
    boundedTimeout(options.idleTimeoutMs, DEFAULT_IDLE_TIMEOUT_MS, '插件停流超时');
    boundedTimeout(options.totalTimeoutMs, DEFAULT_TOTAL_TIMEOUT_MS, '插件总下载超时');
}
async function rejectSymlink(filePath) {
    const stat = await fs.promises.lstat(filePath).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (stat?.isSymbolicLink())
        throw new PluginArtifactIntegrityError('插件下载路径不能是符号链接');
    if (stat && !stat.isFile())
        throw new PluginArtifactIntegrityError('插件下载路径必须是普通文件');
}
async function updateHashFromFile(hash, filePath) {
    let total = 0;
    const stream = fs.createReadStream(filePath, { highWaterMark: COPY_BUFFER_BYTES });
    for await (const chunk of stream) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        hash.update(bytes);
        total += bytes.length;
    }
    return total;
}
async function hashFile(filePath) {
    const hash = crypto.createHash('sha256');
    const bytes = await updateHashFromFile(hash, filePath);
    return { sha256: hash.digest('hex'), bytes };
}
async function removePartial(destinationPath) {
    const paths = partialPaths(destinationPath);
    await Promise.all([
        fs.promises.rm(paths.partial, { force: true }),
        fs.promises.rm(paths.metadata, { force: true }),
    ]);
}
async function writeMetadata(filePath, metadata) {
    const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try {
        await fs.promises.writeFile(temporary, `${JSON.stringify(metadata)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        // Windows rename cannot reliably replace an existing file. Losing only this
        // resumability hint on a crash is safe: the unmatched partial is discarded.
        await fs.promises.rm(filePath, { force: true });
        await fs.promises.rename(temporary, filePath);
    }
    finally {
        await fs.promises.rm(temporary, { force: true }).catch(() => { });
    }
}
async function writeAll(handle, bytes) {
    let offset = 0;
    while (offset < bytes.length) {
        const result = await handle.write(bytes, offset, bytes.length - offset, null);
        if (result.bytesWritten <= 0)
            throw new Error('插件下载写入未取得进展');
        offset += result.bytesWritten;
    }
}
async function readMatchingPartialSize(options, partialPath, metadataPath) {
    await rejectSymlink(partialPath);
    await rejectSymlink(metadataPath);
    const partialStat = await fs.promises.stat(partialPath).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (!partialStat) {
        await fs.promises.rm(metadataPath, { force: true });
        return 0;
    }
    let metadata = null;
    try {
        const raw = await fs.promises.readFile(metadataPath, 'utf8');
        if (raw.length <= 8192)
            metadata = JSON.parse(raw);
    }
    catch {
        metadata = null;
    }
    const matches = metadata?.schema_version === DOWNLOAD_METADATA_VERSION
        && metadata.artifact_url === options.artifactUrl
        && metadata.expected_sha256 === options.expectedSha256
        && metadata.expected_size_bytes === options.expectedSizeBytes
        && partialStat.size <= options.expectedSizeBytes;
    if (!matches) {
        await removePartial(options.destinationPath);
        return 0;
    }
    return partialStat.size;
}
async function finalizePartial(options, partialPath, metadataPath, resumed) {
    const actual = await hashFile(partialPath);
    if (actual.bytes !== options.expectedSizeBytes || actual.sha256 !== options.expectedSha256) {
        throw new PluginArtifactIntegrityError('插件下载完成后的大小或 SHA-256 不匹配');
    }
    const destinationStat = await fs.promises.lstat(options.destinationPath).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (destinationStat) {
        if (!destinationStat.isFile() || destinationStat.isSymbolicLink()) {
            throw new PluginArtifactIntegrityError('插件最终下载路径不是普通文件');
        }
        const existing = await hashFile(options.destinationPath);
        if (existing.bytes !== actual.bytes || existing.sha256 !== actual.sha256) {
            throw new PluginArtifactIntegrityError('插件最终下载路径已被其他内容占用');
        }
        await removePartial(options.destinationPath);
        return { path: options.destinationPath, bytes: actual.bytes, sha256: actual.sha256, resumed, reused: true };
    }
    await fs.promises.rename(partialPath, options.destinationPath);
    await fs.promises.chmod(options.destinationPath, 0o600).catch(() => { });
    await fs.promises.rm(metadataPath, { force: true });
    return { path: options.destinationPath, bytes: actual.bytes, sha256: actual.sha256, resumed, reused: false };
}
/**
 * Streams an immutable plugin artifact to disk and resumes a matching partial with Range.
 * Network interruption preserves the partial; any integrity/contract violation removes it.
 */
export async function downloadPluginArtifact(options) {
    validateOptions(options);
    await fs.promises.mkdir(path.dirname(options.destinationPath), { recursive: true, mode: 0o700 });
    await rejectSymlink(options.destinationPath);
    const existing = await fs.promises.stat(options.destinationPath).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    if (existing) {
        const actual = await hashFile(options.destinationPath);
        if (actual.bytes !== options.expectedSizeBytes || actual.sha256 !== options.expectedSha256) {
            throw new PluginArtifactIntegrityError('已存在的插件制品与签名清单不匹配');
        }
        return { path: options.destinationPath, bytes: actual.bytes, sha256: actual.sha256, resumed: false, reused: true };
    }
    const paths = partialPaths(options.destinationPath);
    let resumeBytes = await readMatchingPartialSize(options, paths.partial, paths.metadata);
    const resumed = resumeBytes > 0;
    const metadata = {
        schema_version: DOWNLOAD_METADATA_VERSION,
        artifact_url: options.artifactUrl,
        expected_sha256: options.expectedSha256,
        expected_size_bytes: options.expectedSizeBytes,
    };
    let cleanupNetwork = () => { };
    try {
        if (resumeBytes === options.expectedSizeBytes) {
            return await finalizePartial(options, paths.partial, paths.metadata, true);
        }
        await writeMetadata(paths.metadata, metadata);
        const headers = {};
        if (resumeBytes > 0)
            headers.Range = `bytes=${resumeBytes}-`;
        const networkAbort = new AbortController();
        let timeoutPhase = null;
        const abortForTimeout = (phase) => {
            timeoutPhase ??= phase;
            networkAbort.abort();
        };
        const networkSignal = options.signal
            ? AbortSignal.any([options.signal, networkAbort.signal])
            : networkAbort.signal;
        const transportError = () => timeoutPhase
            ? new PluginArtifactDownloadTimeoutError(timeoutPhase)
            : new Error('插件下载已取消');
        let idleTimer = null;
        const connectTimer = setTimeout(() => abortForTimeout('connect'), boundedTimeout(options.connectTimeoutMs, DEFAULT_CONNECT_TIMEOUT_MS, '插件连接超时'));
        const totalTimer = setTimeout(() => abortForTimeout('total'), boundedTimeout(options.totalTimeoutMs, DEFAULT_TOTAL_TIMEOUT_MS, '插件总下载超时'));
        cleanupNetwork = () => {
            clearTimeout(connectTimer);
            clearTimeout(totalTimer);
            if (idleTimer)
                clearTimeout(idleTimer);
            networkAbort.abort();
        };
        let response;
        try {
            response = await waitForTransport(options.fetchFn(options.artifactUrl, {
                method: 'GET',
                headers,
                redirect: 'error',
                signal: networkSignal,
            }), networkSignal, transportError);
        }
        catch (error) {
            if (timeoutPhase)
                throw new PluginArtifactDownloadTimeoutError(timeoutPhase);
            throw error;
        }
        finally {
            clearTimeout(connectTimer);
        }
        if (!response.ok)
            throw new Error(`插件下载失败：http_${response.status}`);
        if (resumeBytes > 0 && response.status === 206) {
            const contentRange = response.headers.get('content-range') || '';
            const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange);
            if (!match
                || Number(match[1]) !== resumeBytes
                || Number(match[2]) < resumeBytes
                || Number(match[3]) !== options.expectedSizeBytes) {
                throw new PluginArtifactIntegrityError('插件断点下载 Content-Range 与签名清单不匹配');
            }
        }
        else if (response.status === 200) {
            resumeBytes = 0;
            await fs.promises.rm(paths.partial, { force: true });
        }
        else {
            throw new PluginArtifactIntegrityError('插件下载服务器未返回可验证的完整或 Range 响应');
        }
        const contentLength = Number(response.headers.get('content-length'));
        if (Number.isFinite(contentLength)
            && contentLength >= 0
            && contentLength > options.expectedSizeBytes - resumeBytes) {
            throw new PluginArtifactIntegrityError('插件下载 Content-Length 超出签名清单大小');
        }
        if (!response.body)
            throw new Error('插件下载响应缺少流式正文');
        const hash = crypto.createHash('sha256');
        if (resumeBytes > 0) {
            const hashedBytes = await updateHashFromFile(hash, paths.partial);
            if (hashedBytes !== resumeBytes)
                throw new PluginArtifactIntegrityError('插件断点文件大小在下载期间发生变化');
        }
        const handle = await fs.promises.open(paths.partial, resumeBytes > 0 ? 'a' : 'w', 0o600);
        let transferred = resumeBytes;
        const reader = response.body.getReader();
        try {
            while (true) {
                idleTimer = setTimeout(() => abortForTimeout('idle'), boundedTimeout(options.idleTimeoutMs, DEFAULT_IDLE_TIMEOUT_MS, '插件停流超时'));
                let chunk;
                try {
                    chunk = await waitForTransport(reader.read(), networkSignal, transportError);
                }
                catch (error) {
                    if (timeoutPhase)
                        throw new PluginArtifactDownloadTimeoutError(timeoutPhase);
                    throw error;
                }
                finally {
                    clearTimeout(idleTimer);
                    idleTimer = null;
                }
                if (chunk.done)
                    break;
                const bytes = Buffer.from(chunk.value);
                if (transferred + bytes.length > options.expectedSizeBytes) {
                    throw new PluginArtifactIntegrityError('插件下载数据超过签名清单大小');
                }
                await writeAll(handle, bytes);
                hash.update(bytes);
                transferred += bytes.length;
                options.onProgress?.({ transferred, total: options.expectedSizeBytes, resumed });
            }
            await handle.sync();
        }
        finally {
            // A stalled reader may still have a pending read when the network signal
            // wins the timeout race. Releasing that lock can throw; the timeout must
            // remain the reported failure, and outer cleanup aborts the stream.
            try {
                reader.releaseLock();
            }
            catch { /* pending read is aborted below */ }
            await handle.close();
        }
        cleanupNetwork();
        cleanupNetwork = () => { };
        if (transferred !== options.expectedSizeBytes) {
            throw new Error(`插件下载未完成：${transferred}/${options.expectedSizeBytes}`);
        }
        const digest = hash.digest('hex');
        if (digest !== options.expectedSha256) {
            throw new PluginArtifactIntegrityError('插件下载 SHA-256 与签名清单不匹配');
        }
        return await finalizePartial(options, paths.partial, paths.metadata, resumed);
    }
    catch (error) {
        if (error instanceof PluginArtifactIntegrityError)
            await removePartial(options.destinationPath);
        throw error;
    }
    finally {
        cleanupNetwork();
    }
}
export async function discardPluginArtifactPartial(destinationPath) {
    if (!path.isAbsolute(destinationPath))
        throw new Error('插件下载目标必须是绝对路径');
    await removePartial(destinationPath);
}
