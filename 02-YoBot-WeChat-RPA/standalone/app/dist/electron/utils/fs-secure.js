import path from "path";
import fs from "fs/promises";
import { ConfigManager } from "../core/config/manager.js";
import { UserInteractionRequiredError } from "../agent/errors.js";
/**
 * 安全路径解析工具
 * 确保所有文件操作都被限制在指定的沙箱根目录内
 */
export class SecurePathUtils {
    /**
     * 检查路径是否在允许的根目录内
     * @param targetPath 目标绝对路径
     * @param allowedRoots 允许的根目录列表
     */
    static isAllowed(targetPath, allowedRoots) {
        // Dynamic Config Check
        const config = ConfigManager.getInstance().getSystemConfig();
        if (config.shellSafetyLevel === 'loose') {
            return true; // Bypass check in loose mode
        }
        const resolved = path.resolve(targetPath);
        return allowedRoots.some(root => {
            const relative = path.relative(root, resolved);
            return !relative.startsWith("..") && !path.isAbsolute(relative);
        });
    }
    /**
     * 断言路径安全，否则抛出异常
     */
    static async assertSandbox(targetPath, allowedRoots) {
        if (!this.isAllowed(targetPath, allowedRoots)) {
            // Check if strict mode is the cause
            const config = ConfigManager.getInstance().getSystemConfig();
            if (config.shellSafetyLevel !== 'loose') {
                throw new UserInteractionRequiredError(`Access Denied: Path '${targetPath}' is outside the allowed sandbox. ` +
                    `Current mode is Strict. Please ask the user to switch to Loose Mode to allow access.`);
            }
            throw new Error(`Access Denied: Path '${targetPath}' is outside the allowed sandbox roots: [${allowedRoots.join(", ")}]`);
        }
        // 额外的符号链接检查 (防止通过 symlink 逃逸)
        // 简单起见，我们只检查最终解析路径。严格模式下应该逐级检查。
        try {
            const realPath = await fs.realpath(targetPath);
            if (!this.isAllowed(realPath, allowedRoots)) {
                throw new Error(`Access Denied: Symlink target '${realPath}' escapes sandbox.`);
            }
        }
        catch (e) {
            // 如果文件不存在，realpath 会失败，这是正常的 (比如写新文件)
            // 但如果父目录是 symlink 逃逸，我们需要注意。
            // 这里为了性能和简单，对于不存在的文件，我们假设其父目录已经被检查过（通常 mkdir -p 会被检查）
            if (e.code !== 'ENOENT') {
                throw e;
            }
        }
    }
}
