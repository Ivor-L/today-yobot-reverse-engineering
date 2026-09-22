function money(value) {
    return value === null ? "n/a" : `$${value.toFixed(6)}`;
}
export function evalReportMarkdown(report) {
    const lines = [
        "# Agent Harness Eval Report",
        "",
        `- Cases: ${report.caseCount}`,
        `- Runs: ${report.runCount}`,
        `- Passed: ${report.passedRuns}`,
        `- Failed: ${report.failedRuns}`,
        `- Fatal: ${report.fatalRuns}`,
        `- Cost / fulfilled success: ${money(report.costPerFulfilledSuccess)}`,
        `- Cost / acceptable outcome: ${money(report.costPerAcceptableOutcome)}`,
        "",
        "| Case | Run | Level | Outcome | Passed | Cost |",
        "|---|---:|---|---|---|---:|",
    ];
    for (const result of report.results) {
        lines.push(`| ${result.caseId} | ${result.repetition} | ${result.level} | ${result.outcome} | ${result.passed ? "yes" : "no"} | $${result.usage.costUsd.toFixed(6)} |`);
    }
    return `${lines.join("\n")}\n`;
}
