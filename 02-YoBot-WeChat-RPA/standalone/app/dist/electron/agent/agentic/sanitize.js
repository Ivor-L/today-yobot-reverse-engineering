/**
 * agentic 路径的**独立输出净化出口**。
 *
 * 刻意不复用 `Gateway.handleMessage` 的出口:后者会往空回复/纯 JSON 回复里注入
 * 「(任务已完成,但Agent未生成文本总结。请查看上方工具执行结果。)」这类兜底文案
 * (`src/gateway/index.ts`)。那话发给微信客户会很离谱。
 *
 * 目标:让输出看起来像一个人在微信里打字,而不是一个 markdown 渲染器的产物。
 */
const MAX_SEGMENT_CHARS = 300;
const MAX_SEGMENTS = 5;
/**
 * Phase-1 追发自评标记（§13.3）。模型判定"需要深度回答"时在末尾输出它。
 * 单一来源：`AgenticService` 用 `hasEscalationMarker` 探测是否追发，本文件负责
 * 在发给客户前把它剥掉——探测与剥离共用同一模式，不会出现"检测到却没删干净"。
 */
const ESCALATION_MARKER = /\[\[\s*ESCALATE\s*\]\]/gi;
/** 原始 Phase-1 文本里是否带追发标记。用非全局副本，避免 `lastIndex` 状态残留。 */
export function hasEscalationMarker(text) {
    return /\[\[\s*ESCALATE\s*\]\]/i.test(text);
}
/**
 * 「本条不回复」哨兵。
 *
 * 背景:`AgenticAction` 里 `no_reply` 是一等公民,但此前**唯一**能产生它的路径是
 * "净化后为空"——没有任何字符串能触发。而大量人设(用户自己写的 AGENT.md,以及
 * 各类客服 prompt 模板的通行写法)都指示模型「不需要回复时输出 NO_REPLY」。
 * 两边对不上的结果:模型输出 `NO_REPLY` → 非空 → action=reply → **字面量被发进客户群**。
 * 线上真实发生过,当时唯一挡住它的是 RPA 侧过滤词里恰好有一条 `NO_REPLY`——
 * 一块纯属巧合的挡板,过滤词一清空就穿透。
 *
 * ⚠️ **必须整串全等,绝不能用 includes**。RPA 侧 `check_filter_words` 用子串匹配,
 * 过滤词若含「1」「行」这类高频字,「10:00」「严格执行」会被连带命中,
 * 曾造成大批回复被静默丢弃。同一个坑不能在客户端再踩一次:这里只认"整条输出就是这个词",
 * 正文里出现「这条我不回复」不受任何影响。
 *
 * 长度闸门是第二道保险:哨兵都很短,超过阈值一定是正常句子。
 */
const NO_REPLY_SENTINELS = new Set([
    "NO_REPLY", "NOREPLY", "NO REPLY", "SKIP", "NONE", "NULL",
    "无需回复", "不回复", "不需要回复", "无需跟进", "无",
]);
const MAX_SENTINEL_CHARS = 12;
/**
 * 整条输出是否只是一个「不回复」哨兵。
 *
 * 传入的应当是**已净化的单个 segment**（markdown 已剥离），这里再兜一层常见包裹符:
 * 模型很爱写 `[NO_REPLY]`、`【NO_REPLY】`、`(no_reply)`、`NO_REPLY。`。
 */
export function isNoReplySentinel(text) {
    const s = (text || "")
        .trim()
        .replace(/^[\[\]【】（）()<>「」"'`*_\s]+|[\[\]【】（）()<>「」"'`*_\s。.!！~～]+$/g, "")
        .trim();
    if (!s || s.length > MAX_SENTINEL_CHARS)
        return false;
    return NO_REPLY_SENTINELS.has(s.toUpperCase());
}
/**
 * 表格 → 自然语言行。
 *
 * 实测(2026-07-10 真机):即便 profile prompt 明写"不要输出 markdown",DeepSeek 依然
 * 会用表格回答价格类问题,结果是客户在微信里收到一坨 `| 版本 | 价格 |` 和 `|---|---|`。
 * **prompt 是建议,净化出口才是保证**——这正是设计文档 §6.4 坚持独立出口的理由。
 *
 * 策略:丢掉分隔行,用表头把每个数据行拼成一句人话。没有表头就直接空格连接。
 */
function flattenTables(raw) {
    const lines = raw.split(/\r?\n/);
    const out = [];
    const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const isRow = (line) => /^\s*\|.*\|\s*$/.test(line);
    const isSeparator = (line) => /^\s*\|[\s:|-]*\|\s*$/.test(line) && /-/.test(line);
    let i = 0;
    while (i < lines.length) {
        if (!isRow(lines[i])) {
            out.push(lines[i]);
            i++;
            continue;
        }
        const block = [];
        while (i < lines.length && isRow(lines[i]))
            block.push(lines[i++]);
        const rows = block.filter((l) => !isSeparator(l)).map(cells);
        if (rows.length === 0)
            continue;
        const hadSeparator = block.some(isSeparator);
        const header = hadSeparator && rows.length > 1 ? rows[0] : null;
        const body = header ? rows.slice(1) : rows;
        for (const row of body) {
            // 第一列当主语("个人版")，其余列带上表头("价格 299 元/年")，
            // 否则会读成"版本个人版"这种不像人话的东西。
            const parts = row.map((v, idx) => {
                if (idx === 0 || !header?.[idx] || !v)
                    return v;
                return `${header[idx]} ${v}`;
            });
            const text = parts.filter(Boolean).join("，");
            if (text)
                out.push(text);
        }
    }
    return out.join("\n");
}
/** 剥掉 markdown 结构标记,保留其中的文本。 */
function stripMarkdown(raw) {
    let s = raw;
    // 追发控制标记绝不能发给客户。放在最前面：它不是 markdown，后续规则不会碰它。
    s = s.replace(ESCALATION_MARKER, " ");
    // 代码块整体移除(微信里贴代码块毫无意义,且常是工具产物泄漏)
    s = s.replace(/```[\s\S]*?```/g, " ");
    s = s.replace(/`([^`]+)`/g, "$1");
    // 表格必须在剥掉加粗/分隔线之前处理:`|---|---|` 会被分隔线规则误伤,
    // 单元格里的 `**299**` 也要先随行结构一起提取。
    s = flattenTables(s);
    // 图片/链接:保留可读文本,丢掉 URL 语法
    s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
    s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    // 标题、引用、列表符号
    s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");
    s = s.replace(/^\s{0,3}>\s?/gm, "");
    s = s.replace(/^\s*[-*+]\s+/gm, "");
    s = s.replace(/^\s*\d+\.\s+/gm, "");
    // 强调标记
    s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
    s = s.replace(/\*([^*]+)\*/g, "$1");
    s = s.replace(/__([^_]+)__/g, "$1");
    // 分隔线
    s = s.replace(/^\s*([-*_]\s*){3,}$/gm, "");
    return s;
}
/**
 * Agent 偶尔会输出纯 JSON(裸工具调用残留)或内部标记。这些绝不能发给客户。
 * 与 Gateway 不同,这里的处理是**丢弃**而非追加解释文案。
 */
function looksLikeInternalArtifact(text) {
    const t = text.trim();
    if (!t)
        return true;
    if (/^[[{][\s\S]*[\]}]$/.test(t)) {
        try {
            JSON.parse(t);
            return true;
        }
        catch {
            /* 不是合法 JSON,当普通文本 */
        }
    }
    if (/^<\/?[a-z_]+>/i.test(t))
        return true;
    return false;
}
/** 兜底硬切:没有任何句读的超长文本(模型偶尔会吐)必须切开,否则整段发出去。 */
function hardChunk(s) {
    const out = [];
    for (let i = 0; i < s.length; i += MAX_SEGMENT_CHARS) {
        out.push(s.slice(i, i + MAX_SEGMENT_CHARS));
    }
    return out;
}
/** 按微信习惯把长文本切成多条短消息。空行优先,其次句末,最后硬切。 */
function splitIntoSegments(text) {
    const byBlankLine = text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
    const out = [];
    const push = (piece) => {
        const t = piece.trim();
        if (!t)
            return;
        // 单句本身就超长(无句读)时,句末切分帮不上忙 —— 硬切
        if (t.length > MAX_SEGMENT_CHARS)
            out.push(...hardChunk(t));
        else
            out.push(t);
    };
    for (const para of byBlankLine) {
        if (para.length <= MAX_SEGMENT_CHARS) {
            out.push(para);
            continue;
        }
        // 过长段落按句末切,避免把一句话劈成两条消息
        let buf = "";
        for (const sentence of para.split(/(?<=[。！？!?\n])/)) {
            if ((buf + sentence).length > MAX_SEGMENT_CHARS && buf) {
                push(buf);
                buf = sentence;
            }
            else {
                buf += sentence;
            }
        }
        push(buf);
    }
    return out;
}
export function sanitizeForWeChat(raw) {
    if (!raw || looksLikeInternalArtifact(raw)) {
        return { segments: [], empty: true };
    }
    const stripped = stripMarkdown(raw)
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    if (!stripped || looksLikeInternalArtifact(stripped)) {
        return { segments: [], empty: true };
    }
    const all = splitIntoSegments(stripped);
    // 超出上限时**合并**尾部,而不是丢弃。
    // MAX_SEGMENTS 的本意是"别给客户刷屏",不是"少答一半"——回复的结尾往往正是
    // 结论或收束语("还需要别的吗"),静默截断会让客服看起来话说到一半就走了。
    const segments = all.length > MAX_SEGMENTS
        ? [...all.slice(0, MAX_SEGMENTS - 1), all.slice(MAX_SEGMENTS - 1).join("\n")]
        : all;
    return { segments, empty: segments.length === 0 };
}
