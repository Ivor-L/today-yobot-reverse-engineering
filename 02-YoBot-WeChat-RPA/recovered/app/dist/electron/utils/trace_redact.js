// trace 上报脱敏。
//
// 只作用于「要离开本机的那一份」——本地 logs/traces/*.log 保持完整，
// 用户自己排查问题时仍需要原文。
//
// ⚠️ 能力边界（写在最前面，避免被误当成隐私保障）：
//   本模块处理的是【结构化标识符】：手机号、token、密钥、邮箱、身份证、wxid、uuid。
//   它【处理不了】自由文本里的客户数据——RETRIEVED MEMORIES 段是用户知识库原文，
//   工具返回里有群聊记录、客户姓名、对话内容，这些没有任何模式可匹配。
//   真正兜底的是「私有桶 + 生命周期自动删除 + 用完即关开关」，不是这里的正则。
//
// 设计取舍：一律【保留结构、抹掉取值】而不是整段删除。
//   分析要回答的是「agent 有没有正确解析出名单」「工具入参对不对」，
//   把整行删掉就等于把分析价值也删了。
/** 键名命中这些词的 JSON 字段，值整个替换。密钥类一律不保留任何片段。 */
const SECRET_KEY_PATTERN = /"([^"]*(?:token|secret|password|passwd|api[_-]?key|apikey|accesskey|access[_-]?key|credential|authorization|botid|bot[_-]?id|appsecret|app[_-]?secret)[^"]*)"\s*:\s*"([^"]*)"/gi;
/**
 * 已知密钥前缀的字面量。
 *
 * 为什么必须有这条：真实测试里用户是这么说的——
 *     「我的 Coze 秘钥是 pat_TestSecret123456」
 * 纯散文，没有任何 JSON 结构，上面那条键值对规则一个都匹配不到，
 * 结果密钥原样上了云（首次真机验收就抓到 5 处明文）。
 *
 * 密钥虽然出现在自由文本里，但它本身是有形状的：固定前缀 + 长随机串。
 * LTAI 是阿里云 AccessKeyId 前缀——它一旦泄露，整个 OSS 桶就没了。
 */
const TOKEN_LITERAL_PATTERN = /\b(pat_|sk-|sk_|ghp_|gho_|ghs_|github_pat_|xox[baprs]-|AKIA|LTAI|AIza|hf_|glpat-|sk-ant-)[A-Za-z0-9_\-]{8,}/g;
/**
 * 散文里「密钥是 xxx」这类说法。
 *
 * 覆盖没有已知前缀的自定义 token。要求取值至少 8 位且全是 token 字符，
 * 这样「需要密钥的话」这种纯中文尾巴不会被误伤。
 */
const PROSE_SECRET_PATTERN = /(秘钥|密钥|密码|token|api[ _-]?key|access[ _-]?key|secret|password)([\s是为:：=]{1,6})([A-Za-z0-9_\-.]{8,})/gi;
/** 中国大陆手机号。前后加数字边界，避免把长数字串（订单号、时间戳）误伤。 */
const PHONE_PATTERN = /(?<!\d)(1[3-9]\d)(\d{4})(\d{4})(?!\d)/g;
const EMAIL_PATTERN = /([A-Za-z0-9._%+-])([A-Za-z0-9._%+-]*)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
/** 18 位身份证（末位可能是 X）。 */
const ID_CARD_PATTERN = /(?<![0-9Xx])(\d{6})(\d{8})(\d{3}[\dXx])(?![0-9Xx])/g;
const BEARER_PATTERN = /(Bearer\s+)[A-Za-z0-9._\-]{16,}/gi;
const WXID_PATTERN = /\bwxid_[a-zA-Z0-9]+/g;
/**
 * uuid：保留前 8 位。
 * 不能全抹——session_id / message_id / traceId 要用来把这份 trace 和数据库记录对上，
 * 全抹掉就串不起来了。前 8 位在当前数据量级下足够定位，也不构成可用标识。
 */
const UUID_PATTERN = /\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/**
 * 对一段 trace 文本做脱敏。
 *
 * 顺序有讲究：先处理键值对（密钥），再处理裸值（手机号等）。
 * 反过来的话，密钥里若恰好含 11 位数字会先被手机号规则改写，
 * 之后密钥规则匹配的就不是原值了——结果是两条规则都只做对了一半。
 */
export function redactTrace(input) {
    let out = input;
    // 1) 密钥类字段：值整个换掉。用户让 agent 配智能体时走 wechat_update_config，
    //    botId 里装的就是他的 Coze 秘钥 / FireFlow API Token，会原样进日志。
    out = out.replace(SECRET_KEY_PATTERN, (_m, key) => `"${key}": "***REDACTED***"`);
    // 2) Bearer token
    out = out.replace(BEARER_PATTERN, (_m, prefix) => `${prefix}***REDACTED***`);
    // 2b) 散文里的「密钥是 xxx」。必须先于前缀规则跑：
    //     否则 pat_xxx 会先被换成 pat_***，这条再匹配时取值已不足 8 位而漏掉，
    //     标签后面就会留下一个半截的 pat_***，看着像脱敏了其实规则没生效。
    out = out.replace(PROSE_SECRET_PATTERN, (_m, label, sep) => `${label}${sep}***REDACTED***`);
    // 2c) 已知前缀的密钥字面量（保留前缀便于判断是哪类凭据泄露过）
    out = out.replace(TOKEN_LITERAL_PATTERN, (_m, prefix) => `${prefix}***REDACTED***`);
    // 3) 手机号：保留前 3 后 4。
    //    全抹会让「名单有没有被正确解析出号码」这类问题无法分析——
    //    而那恰恰是加人 SOP 最常见的排查点。
    out = out.replace(PHONE_PATTERN, (_m, head, _mid, tail) => `${head}****${tail}`);
    // 4) 身份证：保留前 6 后 4
    out = out.replace(ID_CARD_PATTERN, (_m, head, _mid, tail) => `${head}********${tail}`);
    // 5) 邮箱：保留首字母与域名
    out = out.replace(EMAIL_PATTERN, (_m, first, _rest, domain) => `${first}***@${domain}`);
    // 6) wxid：保留前缀，仍能看出这是个微信号
    out = out.replace(WXID_PATTERN, 'wxid_***');
    // 7) uuid：保留前 8 位
    out = out.replace(UUID_PATTERN, (_m, head) => `${head}-****-****-****-************`);
    return out;
}
/**
 * 把「文件头一段」与「文件尾一段」拼成一份带截断标记的文本。
 *
 * 为什么要有这个函数而不是只用 truncateBytes：调用方拿到的是两段【分别定位读】
 * 出来的 buffer，中间那一大块从来没有进过内存——几 MB 的日志不该为了截断先整读一遍。
 * truncateBytes 处理的是「已经在内存里的完整 buffer」，两者的输入形态不同。
 *
 * 对齐规则与 truncateBytes 一致：头段回退到最后一个换行、尾段前进到第一个换行之后。
 * 日志本来就是按行写的，代价可忽略；而任意字节处硬切会劈开一个 UTF-8 字符，
 * 解码出替换符——尾段的起点尤其危险，它几乎必然落在某个字符中间。
 *
 * @param omittedBytes 调用方已知被跳过的字节数（size - head.length - tail.length）。
 *                     函数会把对齐过程中额外丢弃的字节一并算进标记里，
 *                     让标记里的数字始终等于真实丢失量。
 */
export function joinHeadTail(head, tail, omittedBytes) {
    // 头段：回退到最后一个换行（含），保证不在多字节字符中间收尾
    let headEnd = head.length;
    while (headEnd > 0 && head[headEnd - 1] !== 0x0a)
        headEnd--;
    if (headEnd === 0)
        headEnd = head.length; // 整段没有换行，只能硬切
    // 尾段：前进到第一个换行之后
    let tailStart = 0;
    while (tailStart < tail.length && tail[tailStart] !== 0x0a)
        tailStart++;
    if (tailStart >= tail.length)
        tailStart = 0; // 整段没有换行，只能硬切
    else
        tailStart += 1;
    const omitted = omittedBytes + (head.length - headEnd) + tailStart;
    return (head.subarray(0, headEnd).toString('utf8') +
        `\n\n...[TRUNCATED ${omitted} bytes by trace reporter]...\n\n` +
        tail.subarray(tailStart).toString('utf8'));
}
/**
 * 按字节上限截断【已在内存中的完整 buffer】，且不在多字节字符中间下刀。
 *
 * 头尾各留一半——开头有 system prompt 与用户输入，结尾有最终回复，
 * 只留一头会丢掉分析最需要的另一头。卡死 / 死循环的日志尤其如此：
 * 证据全在尾部。
 */
export function truncateBytes(buf, maxBytes) {
    if (buf.length <= maxBytes)
        return buf.toString('utf8');
    const half = Math.floor(maxBytes / 2);
    return joinHeadTail(buf.subarray(0, half), buf.subarray(buf.length - half), buf.length - 2 * half);
}
