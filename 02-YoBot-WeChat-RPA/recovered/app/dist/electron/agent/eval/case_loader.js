import fs from "node:fs";
import path from "node:path";
export function validateEvalCase(value) {
    const errors = [];
    const testCase = value;
    if (!testCase || typeof testCase !== "object")
        return ["case must be an object"];
    if (typeof testCase.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(testCase.id))
        errors.push("id is invalid");
    if (!Array.isArray(testCase.userTurns) || testCase.userTurns.length < 1
        || testCase.userTurns.some((turn) => typeof turn !== "string" || !turn.trim())) {
        errors.push("userTurns must contain non-empty strings");
    }
    if (!Array.isArray(testCase.successCriteria) || testCase.successCriteria.length < 1
        || testCase.successCriteria.some((item) => typeof item !== "string" || !item.trim())) {
        errors.push("successCriteria must contain non-empty check keys");
    }
    if (!Array.isArray(testCase.fatalConditions)
        || testCase.fatalConditions.some((item) => typeof item !== "string" || !item.trim())) {
        errors.push("fatalConditions must be a string array");
    }
    if (typeof testCase.category !== "string" || !testCase.category.trim())
        errors.push("category is required");
    if (testCase.level && !["L0", "L1", "L2"].includes(testCase.level))
        errors.push("level is invalid");
    if (testCase.repeats !== undefined && (!Number.isInteger(testCase.repeats) || testCase.repeats < 1 || testCase.repeats > 10)) {
        errors.push("repeats must be an integer between 1 and 10");
    }
    return errors;
}
export function loadEvalCases(filePath) {
    const absolute = path.resolve(filePath);
    const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
    const cases = Array.isArray(parsed) ? parsed : [parsed];
    const ids = new Set();
    return cases.map((testCase, index) => {
        const errors = validateEvalCase(testCase);
        if (errors.length > 0)
            throw new Error(`Invalid eval case at index ${index}: ${errors.join("; ")}`);
        if (ids.has(testCase.id))
            throw new Error(`Duplicate eval case id: ${testCase.id}`);
        ids.add(testCase.id);
        return testCase;
    });
}
