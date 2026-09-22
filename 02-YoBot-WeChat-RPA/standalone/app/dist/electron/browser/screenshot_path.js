import * as path from "path";
/**
 * Where browser_action screenshots are written.
 *
 * They used to go to os.tmpdir(), but visual_understanding only reads images inside the
 * workspace (it must not ship arbitrary temp files to a remote model). The two built-in tools
 * could not be chained: the model took a screenshot, got "图片路径不在工作区内", and had to
 * work around it (2026-09-12). Keep screenshots next to uploads, partitioned by day the same way.
 */
export function browserScreenshotPath(workspaceDir, now = Date.now()) {
    const day = new Date(now).toISOString().slice(0, 10);
    return path.join(workspaceDir, "screenshots", day, `screenshot-${now}.png`);
}
/**
 * What browser_action reports back after a screenshot.
 *
 * The tool returns a path, never pixels, and no other built-in reads an image file into the
 * model's context — visual_understanding is the only reader. Saying just "Screenshot taken:
 * <path>" leaves the model to guess that, and the guess it makes is usually to describe a
 * picture it has never seen. Name the next step in the result itself.
 */
export const SCREENSHOT_RESULT_HINT = "This is a file path, not the image itself. To actually read what is on it, "
    + "pass this path to the `visual_understanding` tool. Never describe a screenshot you have not read.";
