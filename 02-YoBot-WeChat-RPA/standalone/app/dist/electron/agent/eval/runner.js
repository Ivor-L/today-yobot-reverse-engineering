import { gradeFileArtifact } from "./graders/file_artifact_grader.js";
import { gradeTraceCriteria } from "./graders/trace_grader.js";
const ZERO_USAGE = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
};
function finiteNonNegative(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}
function normalizeUsage(value) {
    return {
        inputTokens: finiteNonNegative(value?.inputTokens),
        outputTokens: finiteNonNegative(value?.outputTokens),
        cacheReadTokens: finiteNonNegative(value?.cacheReadTokens),
        cacheWriteTokens: finiteNonNegative(value?.cacheWriteTokens),
        costUsd: finiteNonNegative(value?.costUsd),
    };
}
export class EvalRunner {
    executor;
    constructor(executor) {
        this.executor = executor;
    }
    async run(cases) {
        const startedAt = Date.now();
        const results = [];
        for (const testCase of cases) {
            const repeats = testCase.repeats ?? 1;
            for (let repetition = 1; repetition <= repeats; repetition += 1) {
                const runStartedAt = Date.now();
                try {
                    const observation = await this.executor(testCase, repetition);
                    const trace = gradeTraceCriteria(testCase, observation);
                    const artifactCriteria = testCase.level === "L2"
                        ? gradeFileArtifact(testCase, observation.artifactRoot)
                        : [];
                    const criteria = [...trace.criteria, ...artifactCriteria];
                    const fatal = trace.fatalConditions.some((condition) => condition.triggered);
                    const passed = !fatal && criteria.every((criterion) => criterion.passed);
                    const outcome = passed
                        ? (observation.outcome === "correctly_blocked" ? "correctly_blocked" : "verified_success")
                        : observation.outcome === "inconclusive" ? "inconclusive" : "failed";
                    results.push({
                        caseId: testCase.id,
                        repetition,
                        level: testCase.level ?? "L1",
                        passed,
                        outcome,
                        criteria,
                        fatalConditions: trace.fatalConditions,
                        usage: normalizeUsage(observation.usage),
                        durationMs: Date.now() - runStartedAt,
                    });
                }
                catch (error) {
                    results.push({
                        caseId: testCase.id,
                        repetition,
                        level: testCase.level ?? "L1",
                        passed: false,
                        outcome: "inconclusive",
                        criteria: [],
                        fatalConditions: testCase.fatalConditions.map((condition) => ({ condition, triggered: false })),
                        usage: { ...ZERO_USAGE },
                        durationMs: Date.now() - runStartedAt,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
        const totalCostUsd = results.reduce((sum, result) => sum + result.usage.costUsd, 0);
        const verifiedSuccesses = results.filter((result) => result.outcome === "verified_success").length;
        const correctlyBlocked = results.filter((result) => result.outcome === "correctly_blocked").length;
        const acceptableOutcomes = verifiedSuccesses + correctlyBlocked;
        return {
            schemaVersion: 1,
            startedAt,
            finishedAt: Date.now(),
            caseCount: cases.length,
            runCount: results.length,
            passedRuns: results.filter((result) => result.passed).length,
            failedRuns: results.filter((result) => !result.passed).length,
            fatalRuns: results.filter((result) => result.fatalConditions.some((item) => item.triggered)).length,
            verifiedSuccesses,
            correctlyBlocked,
            acceptableOutcomes,
            totalCostUsd,
            costPerFulfilledSuccess: verifiedSuccesses > 0 ? totalCostUsd / verifiedSuccesses : null,
            costPerAcceptableOutcome: acceptableOutcomes > 0 ? totalCostUsd / acceptableOutcomes : null,
            results,
        };
    }
}
