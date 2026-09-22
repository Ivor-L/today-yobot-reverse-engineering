import { cmpSemver } from '../utils/version_gate.js';
export function checkWorkerIdentity(worker, installedVersion, supervisor) {
    if (!worker || worker.service !== 'yokobot' || !Number.isInteger(worker.pid) || (worker.pid || 0) <= 0
        || typeof worker.version !== 'string' || !worker.version || (worker.status && worker.status !== 'ok'))
        return 'unresponsive';
    // Installation metadata can lag behind a healthy executable (including local
    // upgrade tests). Only an older runtime is evidence of an unapplied upgrade.
    // Explicit installation still verifies the exact requested version separately.
    if (installedVersion && installedVersion !== '0.0.0' && cmpSemver(worker.version, installedVersion) < 0)
        return 'version_mismatch';
    if (supervisor?.worker_pid && supervisor.worker_pid !== worker.pid)
        return 'identity_mismatch';
    if (supervisor?.worker_generation && worker.runtime?.worker_generation && supervisor.worker_generation !== worker.runtime.worker_generation)
        return 'identity_mismatch';
    return null;
}
/**
 * 判「该不该升级」时以**运行版本**为准，本地记录只是兜底。
 *
 * version.json 是安装时写下的，它说 1.9.18 不代表跑着的就是 1.9.18（升级中断、手工替换目录
 * 都会让两者分家）。2026-09-12 线上：用户的朋友圈任务因为旧插件连续失败，而排查时既没有
 * 只读的版本入口，也没人核对过运行版本，最后给出的建议是把微信降级——真正的修复其实就在
 * 当天早上发布的新插件里。
 */
export function summarizePluginVersions(input) {
    const clean = (value) => {
        const text = String(value ?? '').trim();
        return text && text !== '0.0.0' ? text : undefined;
    };
    const running = clean(input.running);
    const installed = clean(input.installed);
    const latest = clean(input.latest);
    const current = running ?? installed;
    return {
        ...(running ? { running } : {}),
        ...(installed ? { installed } : {}),
        ...(latest ? { latest } : {}),
        ...(latest && current ? { updateAvailable: cmpSemver(latest, current) > 0 } : {}),
    };
}
export async function readWorkerIdentity(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
        if (!response.ok)
            return null;
        return await response.json();
    }
    catch {
        return null;
    }
}
