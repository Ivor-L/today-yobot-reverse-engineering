// traceId 的统一生成口径。
//
// 为什么需要这个模块：同一个 traceId 会被三处各自「清洗」一遍，而规则并不一致——
//   1. debug_logger 建日志文件名：  [^a-zA-Z0-9_-] → '_'
//   2. trace_reporter 回头找文件：  [^a-zA-Z0-9_-] → '_'
//   3. 服务端 issueSlot 生成 object key：[^a-zA-Z0-9_-] → 【删除】
// 前两者一致，第 3 处是删不是替换。于是像飞书那种 `chatId::messageId` 的 id，
// 客户端算出 `chatId__messageId`、服务端算出 `chatIdmessageId`，两边对不上。
//
// 与其去对齐三个 sanitizer，不如让 traceId 生成时就只含安全字符：
// 三处清洗全部退化成恒等变换，天然一致，且以后再加第四处也不会出错。
/** 三处 sanitizer 共同认可的字符集。 */
const SAFE_TRACE_ID = /^[A-Za-z0-9_-]+$/;
/**
 * object key 里 traceId 段的长度上限。
 *
 * 纯防御：渠道侧的 id 由第三方系统给出，长度不由我们控制。
 * OSS key 总长有限制，超长不会在本地报错，只会在签名上传时才失败——
 * 那时已经读完文件、脱敏完毕，白做一遍。
 */
const MAX_LEN = 120;
/**
 * 拼一个只含 [A-Za-z0-9_-] 的 traceId。
 *
 * 各段内部的非法字符替换为 '-'，段与段之间用 '_' 连接——用不同的分隔符，
 * 是为了让「段内原本就有分隔符」和「段边界」在肉眼看日志时还能分得开。
 *
 * 例：makeTraceId('feishu', 'oc_abc', 'om_x:y') → 'feishu_oc-abc_om-x-y'
 */
export function makeTraceId(...parts) {
    const segs = parts
        .filter(p => p !== null && p !== undefined && p !== '')
        .map(p => String(p).replace(/[^A-Za-z0-9_-]/g, '-'))
        .filter(s => s.length > 0);
    if (!segs.length)
        return '';
    const id = segs.join('_');
    // 超长时截尾部而非头部：前缀带渠道名和账号，是人工翻日志时的定位依据。
    return id.length > MAX_LEN ? id.slice(0, MAX_LEN) : id;
}
/** 是否可以原样用作文件名后缀与 OSS object key 的一段。 */
export function isSafeTraceId(id) {
    return typeof id === 'string' && id.length > 0 && id.length <= MAX_LEN && SAFE_TRACE_ID.test(id);
}
