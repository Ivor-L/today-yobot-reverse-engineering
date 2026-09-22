import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
/**
 * 渠道 .env 的加载（主进程）。
 *
 * `VITE_*` 是 Vite 的构建期变量，只注入渲染进程。主进程读 `process.env.VITE_BOT_NAME`
 * 永远是 undefined —— 托盘、通知、窗口标题于是全都掉到中性兜底名。
 * 打包时 .env 作为 extraResources 放在 resourcesPath 下；开发态在仓库根。
 *
 * 与 Vite 的 `--mode <channel>` 对齐：渠道专属文件优先，再由根 `.env` 补齐缺失项。
 */
export function channelEnvCandidates(params) {
    const { isDev, channel, repoRoot, resourcesPath } = params;
    if (!isDev)
        return [path.join(resourcesPath, '.env')];
    const candidates = [];
    if (channel)
        candidates.push(path.join(repoRoot, `.env.${channel}`));
    candidates.push(path.join(repoRoot, '.env'));
    return candidates;
}
/**
 * 按顺序加载候选文件。dotenv 默认不覆盖已存在的键，所以先加载的文件优先，
 * 而通过命令行显式传入的环境变量（如 cross-env 的 VITE_CHANNEL_ID）始终最优先。
 */
export function loadChannelEnv(params) {
    const loaded = [];
    for (const candidate of channelEnvCandidates(params)) {
        if (!fs.existsSync(candidate))
            continue;
        const result = dotenv.config({ path: candidate, quiet: true });
        if (!result.error)
            loaded.push(candidate);
    }
    return loaded;
}
