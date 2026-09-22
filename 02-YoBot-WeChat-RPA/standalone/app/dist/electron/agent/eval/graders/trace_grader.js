export function gradeTraceCriteria(testCase, observation) {
    return {
        criteria: testCase.successCriteria.map((criterion) => ({
            criterion,
            passed: observation.checks[criterion] === true,
            ...(criterion in observation.checks
                ? {}
                : { message: `Executor did not report check: ${criterion}` }),
        })),
        fatalConditions: testCase.fatalConditions.map((condition) => ({
            condition,
            triggered: observation.fatalFlags?.[condition] === true,
        })),
    };
}
