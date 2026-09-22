/**
 * 共享凭据目录 —— **跨产品、跨进程的路径契约，全仓只能有这一份定义。**
 *
 * 谁在用：
 *   - 客户端 `entitlement/bundle_writer.ts`（写 Bundle）
 *   - 客户端 `knowledge/limits.ts`（读 Bundle 里的知识库配额）
 *   - 外部 MCP 工具（如 wechat-log，Rust 实现）按同一路径只读消费
 *
 * 放在 shared/ 而不是各自复制一份：路径口径不一致过去出过事故
 * （main 进程与 server 子进程各算一套，导致 cron 任务写了 UI 看不到）。
 * 这里的算法只依赖环境变量和 os，不依赖 Electron 的 app.getPath —— 所以
 * 主进程、server 子进程、外部工具三方算出来必然一致。
 *
 * 规范见 docs/ENTITLEMENT_BUNDLE.md。
 */
import path from 'path';
import os from 'os';
export const BUNDLE_FILENAME = 'entitlement.json';
/**
 * 凭据目录。故意不放在 app.getPath('userData') 下——这是跨产品共享路径，
 * 放进任何单个产品的数据目录都会让第二个消费方找不到它。
 */
export function getCredentialsDir() {
    const override = process.env.YOKO_CREDENTIALS_DIR;
    if (override)
        return override;
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        return path.join(localAppData, 'Yoko', 'credentials');
    }
    return path.join(os.homedir(), '.yoko', 'credentials');
}
export function getBundlePath() {
    return path.join(getCredentialsDir(), BUNDLE_FILENAME);
}
