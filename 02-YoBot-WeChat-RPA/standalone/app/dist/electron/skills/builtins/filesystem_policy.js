import path from "node:path";
export const FILESYSTEM_USER_DATA_PATH = process.env.USER_DATA_PATH || process.cwd();
export const FILESYSTEM_WORKSPACE_ROOT = path.resolve(FILESYSTEM_USER_DATA_PATH, "workspace");
export const FILESYSTEM_SKILLS_ROOT = path.resolve(process.cwd(), "skills");
export const FILESYSTEM_USER_SKILLS_ROOT = path.resolve(FILESYSTEM_USER_DATA_PATH, "skills");
export const FILESYSTEM_ALLOWED_ROOTS = [
    FILESYSTEM_WORKSPACE_ROOT,
    FILESYSTEM_SKILLS_ROOT,
    FILESYSTEM_USER_SKILLS_ROOT,
];
/** Pi filesystem tools use process.cwd() as their base for relative paths. */
export function resolveFilesystemTarget(target) {
    return path.resolve(process.cwd(), target);
}
