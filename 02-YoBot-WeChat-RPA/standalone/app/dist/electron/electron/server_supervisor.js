/**
 * server 子进程的重启决策。
 *
 * 从 main.ts 抽出来的原因很实际：这里的判断错一次的后果是两极的——漏判会让客户端
 * 停在「界面在、服务没了」的假活状态（线上出现过）；误判则会在数据迁移或退出过程中
 * 把服务重新拉起来。两种都不能靠人眼 review 保证，得有用例锁住。
 *
 * 这个文件不 import electron，纯逻辑。
 */
/** 这次退出是否属于「意外死亡、应当接管」。 */
export function shouldSuperviseExit(input) {
    if (!input.wasCurrentProcess)
        return false;
    if (input.isQuitting)
        return false;
    if (input.teardownDone)
        return false;
    if (input.localServerDisabled)
        return false;
    return true;
}
/**
 * 退避重启的计数器。
 *
 * 「连续存活满 stableMs 才清零」这条很关键：如果一起来就清零，崩溃循环会因为每次都
 * 短暂起来而不断重置计数，退避形同虚设，客户端会在后台无限重启烧 CPU。
 */
export class RestartPolicy {
    backoffMs;
    used = 0;
    constructor(backoffMs) {
        this.backoffMs = backoffMs;
        if (backoffMs.length === 0)
            throw new Error("backoffMs must not be empty");
    }
    /** 已经用掉的重试次数。 */
    get attempts() {
        return this.used;
    }
    get exhausted() {
        return this.used >= this.backoffMs.length;
    }
    /** 取下一次重试的延迟；配额用尽返回 null（调用方应转入失败态并告知用户）。 */
    next() {
        if (this.exhausted)
            return null;
        const delayMs = this.backoffMs[this.used];
        this.used += 1;
        return { delayMs, attempt: this.used, max: this.backoffMs.length };
    }
    /** 服务已稳定运行，恢复全部配额。返回是否确实发生了重置（用于决定要不要通知 UI）。 */
    reset() {
        if (this.used === 0)
            return false;
        this.used = 0;
        return true;
    }
}
