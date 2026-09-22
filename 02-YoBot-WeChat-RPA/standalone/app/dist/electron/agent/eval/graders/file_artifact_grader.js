import fs from "node:fs";
import path from "node:path";
function withinRoot(root, target) {
    const relative = path.relative(root, target);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
export function gradeFileArtifact(testCase, artifactRoot) {
    if (!testCase.artifact)
        return [];
    if (!artifactRoot)
        return [{ criterion: "artifact_root", passed: false, message: "artifactRoot was not provided" }];
    const root = path.resolve(artifactRoot);
    const target = path.resolve(root, testCase.artifact.relativePath);
    if (!withinRoot(root, target)) {
        return [{ criterion: "artifact_authorized_path", passed: false, message: "artifact path escapes authorized root" }];
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        return [{ criterion: "artifact_exists", passed: false, message: "artifact file does not exist" }];
    }
    const bytes = fs.statSync(target).size;
    const results = [{
            criterion: "artifact_non_empty",
            passed: bytes >= (testCase.artifact.minBytes ?? 1),
        }];
    const content = fs.readFileSync(target, "utf8");
    if (testCase.artifact.format === "json") {
        try {
            JSON.parse(content);
            results.push({ criterion: "artifact_parseable", passed: true });
        }
        catch {
            results.push({ criterion: "artifact_parseable", passed: false, message: "invalid JSON" });
        }
    }
    else {
        results.push({ criterion: "artifact_parseable", passed: content.trim().length > 0 });
    }
    for (const section of testCase.artifact.requiredSections || []) {
        results.push({
            criterion: `artifact_section:${section}`,
            passed: content.includes(section),
        });
    }
    return results;
}
