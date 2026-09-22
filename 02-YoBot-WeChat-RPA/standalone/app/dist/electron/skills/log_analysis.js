import * as fs from 'fs';
import * as path from 'path';
import { resolveRuntimeAgentLogsDirectory } from '../core/platform/file_layout.js';
const DEFAULT_LINES = 50;
const MAX_LINES = 100;
const MAX_CONTEXT_RECORDS = 5;
const READ_BLOCK_BYTES = 64 * 1024;
const PROBE_BLOCK_BYTES = 4 * 1024;
const TAIL_SCAN_BYTES = 512 * 1024;
const MAX_SCAN_BYTES = 2 * 1024 * 1024;
const MAX_PROBE_BYTES = 16 * 1024;
const MAX_RESULT_CHARS = 10_000;
const MAX_RECORD_CHARS = 2_000;
const MAX_RECORD_BUFFER_CHARS = 100_000;
const MAX_RANGE_DAYS = 3;
const QUERY_TIMEOUT_MS = 3_000;
const MAX_UNANCHORED_WINDOW_MS = 30 * 60 * 1_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOG_FILE_RE = /^main-(\d{4}-\d{2}-\d{2})\.log$/;
const TS_RE = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/;
const LEVEL_RE = /^\[[^\]]+Z\]\s+\[(INFO|WARN|ERROR)\]/i;
const RPA_COMPONENT_RE = /^\[[^\]]+Z\]\s+\[(?:INFO|WARN|ERROR)\]\s+(?:\[(?:Server|Server Error)\]\s+)?\[(RPA|RPA Error|WeChatRPASkill|WeChatAdapter)\](?:\s|$)/i;
// SGR/CSI plus the common OSC form. Log matching must happen after removing these sequences.
const ANSI_RE = /\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;
const GENERIC_ANCHORS = new Set([
    'agent', 'auto_reply', 'chatmonitor', 'error', 'info', 'killing', 'log', 'message',
    'rpa', 'scheduler', 'task', 'warn', 'warning', '任务', '日志', '消息', '新消息', '监控', '跳过'
]);
const analyzeLogDefinition = {
    name: 'log_analysis',
    description: '查询本机 Agent/RPA 运行日志；不包含外部服务内部日志。',
    parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
            source: {
                type: 'string',
                enum: ['agent', 'rpa'],
                description: '首次查询必填：agent 或 rpa。'
            },
            from: {
                type: 'string',
                description: '起始时间（本机时区）："15:30" | "2026-07-21 15:30" | "-30m"。'
            },
            to: {
                type: 'string',
                description: '结束时间，格式同 from。省略时读取到当前时间。'
            },
            lines: {
                type: 'integer',
                minimum: 1,
                maximum: MAX_LINES,
                description: `最多返回多少条逻辑日志记录，默认 ${DEFAULT_LINES}，最大 ${MAX_LINES}。`
            },
            level: {
                type: 'string',
                enum: ['INFO', 'WARN', 'ERROR'],
                description: '按逻辑记录级别过滤；异常栈续行会随 ERROR 首行一起保留。'
            },
            anchor: {
                type: 'string',
                maxLength: 200,
                description: '目标任务 ID、traceId、联系人或消息片段。'
            },
            component: {
                type: 'string',
                maxLength: 100,
                description: '可选组件过滤，如 Scheduler、PiKernel、ChatMonitorV2。'
            },
            contextLines: {
                type: 'integer',
                minimum: 0,
                maximum: MAX_CONTEXT_RECORDS,
                description: 'anchor 命中前后各附带多少条同源记录，默认 0，最大 5。'
            },
            date: {
                type: 'string',
                pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                description: '无 from/to 时读取哪一天的文件，严格格式 YYYY-MM-DD；默认今天。'
            },
            cursor: {
                type: 'string',
                maxLength: 4096,
                description: '窗口被截断时返回的继续读取游标。继续读取时只需回传 cursor。'
            }
        }
    }
};
function pad2(n) {
    return String(n).padStart(2, '0');
}
function localDateOf(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function localDateTime(ms) {
    const d = new Date(ms);
    return `${localDateOf(ms)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function localTzLabel(ms = Date.now()) {
    const minutes = -new Date(ms).getTimezoneOffset();
    const sign = minutes >= 0 ? '+' : '-';
    const absolute = Math.abs(minutes);
    const h = Math.floor(absolute / 60);
    const m = absolute % 60;
    return `UTC${sign}${h}${m ? `:${pad2(m)}` : ''}`;
}
function validLocalDateTime(y, mo, d, h, mi, s) {
    if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d) ||
        !Number.isInteger(h) || !Number.isInteger(mi) || !Number.isInteger(s) ||
        mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23 || mi < 0 || mi > 59 || s < 0 || s > 59) {
        return null;
    }
    const value = new Date(y, mo - 1, d, h, mi, s, 0);
    if (value.getFullYear() !== y || value.getMonth() !== mo - 1 || value.getDate() !== d ||
        value.getHours() !== h || value.getMinutes() !== mi || value.getSeconds() !== s) {
        return null;
    }
    return value.getTime();
}
function parseDateParts(date) {
    if (!DATE_RE.test(date))
        return null;
    const [y, mo, d] = date.split('-').map(Number);
    return validLocalDateTime(y, mo, d, 0, 0, 0) === null ? null : [y, mo, d];
}
function parseTime(expr, baseDate) {
    const value = String(expr).trim();
    if (!value)
        return null;
    const relative = /^-(\d+)([smhd])$/.exec(value);
    if (relative) {
        const amount = Number(relative[1]);
        if (!Number.isSafeInteger(amount))
            return null;
        const multiplier = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[relative[2]];
        return Date.now() - amount * multiplier;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    if (timeOnly) {
        const parts = parseDateParts(baseDate);
        if (!parts)
            return null;
        return validLocalDateTime(parts[0], parts[1], parts[2], Number(timeOnly[1]), Number(timeOnly[2]), Number(timeOnly[3] || 0));
    }
    const full = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    if (full) {
        return validLocalDateTime(Number(full[1]), Number(full[2]), Number(full[3]), Number(full[4]), Number(full[5]), Number(full[6] || 0));
    }
    return null;
}
function dateRange(fromMs, toMs) {
    const dates = [];
    const cursor = new Date(fromMs);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(toMs);
    last.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= last.getTime()) {
        dates.push(localDateOf(cursor.getTime()));
        if (dates.length > MAX_RANGE_DAYS)
            return null;
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}
function clipRecord(text) {
    if (text.length <= MAX_RECORD_CHARS)
        return text;
    const head = Math.floor(MAX_RECORD_CHARS * 0.7);
    const tail = MAX_RECORD_CHARS - head;
    return `${text.slice(0, head)}\n...[单条记录已截断]...\n${text.slice(-tail)}`;
}
function ensureActive(guard) {
    if (guard.signal?.aborted)
        throw new Error('日志查询已取消');
    if (Date.now() > guard.deadline)
        throw new Error(`日志查询超过 ${QUERY_TIMEOUT_MS}ms，已停止；请缩小时间范围`);
}
function isSpecificAnchor(value) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || GENERIC_ANCHORS.has(normalized))
        return false;
    return /[^\x00-\x7F]/.test(normalized) ? normalized.length >= 2 : normalized.length >= 3;
}
function evidenceRelation(anchor, hits) {
    if (!anchor)
        return 'ambient';
    return hits > 0 ? 'anchored' : 'none';
}
function encodeCursor(cursor) {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}
function decodeCursor(raw) {
    try {
        if (!raw || raw.length > 4096)
            return null;
        const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
        if (parsed.v !== 2 || !parsed.fileDate || !parseDateParts(parsed.fileDate) ||
            !Number.isSafeInteger(parsed.offset) || (parsed.offset ?? -1) < 0 ||
            !Number.isFinite(parsed.toMs) || !Number.isInteger(parsed.lines) ||
            !parsed.source || !['agent', 'rpa'].includes(parsed.source) ||
            (parsed.lines ?? 0) < 1 || (parsed.lines ?? 0) > MAX_LINES ||
            !Number.isInteger(parsed.contextRecords) || (parsed.contextRecords ?? -1) < 0 ||
            (parsed.contextRecords ?? 99) > MAX_CONTEXT_RECORDS ||
            (parsed.level && !['INFO', 'WARN', 'ERROR'].includes(parsed.level)) ||
            (parsed.anchor && (parsed.anchor.length > 200 || !isSpecificAnchor(parsed.anchor))) ||
            (parsed.component && parsed.component.length > 100)) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
export class LogAnalysisSkill {
    name = 'log_analysis';
    description = '查询本机 Agent/RPA 运行日志。';
    scope = 'main';
    tools;
    constructor() {
        this.tools = [{
                definition: analyzeLogDefinition,
                execute: this.analyzeLogs.bind(this)
            }];
    }
    getLogDirectory() {
        return path.resolve(resolveRuntimeAgentLogsDirectory());
    }
    resolveLogFile(date) {
        if (!parseDateParts(date))
            throw new Error(`非法日志日期：${JSON.stringify(date)}，必须是有效的 YYYY-MM-DD`);
        const root = this.getLogDirectory();
        const result = path.resolve(root, `main-${date}.log`);
        if (path.dirname(result) !== root)
            throw new Error('日志文件路径越界');
        return result;
    }
    availableDates() {
        try {
            return fs.readdirSync(this.getLogDirectory())
                .map(file => LOG_FILE_RE.exec(file)?.[1])
                .filter((date) => !!date && !!parseDateParts(date))
                .sort()
                .reverse();
        }
        catch {
            return [];
        }
    }
    missingFileMessage(date, filePath) {
        const dates = this.availableDates();
        return `没有 ${date} 的日志文件。\n实际查找：${filePath}` +
            (dates.length ? `\n现有日志日期：${dates.slice(0, 10).join('、')}${dates.length > 10 ? ' …' : ''}` : '\n日志目录为空。');
    }
    async alignToNextLine(file, offset, size, guard) {
        if (offset <= 0)
            return { offset: 0, bytesRead: 0 };
        if (offset >= size)
            return { offset: size, bytesRead: 0 };
        const previous = Buffer.allocUnsafe(1);
        const previousRead = await file.read(previous, 0, 1, offset - 1);
        if (previousRead.bytesRead === 1 && previous[0] === 0x0a)
            return { offset, bytesRead: 1 };
        let position = offset;
        const scanEnd = Math.min(size, offset + PROBE_BLOCK_BYTES);
        let bytesRead = previousRead.bytesRead;
        const buffer = Buffer.allocUnsafe(PROBE_BLOCK_BYTES);
        while (position < scanEnd) {
            ensureActive(guard);
            const length = Math.min(buffer.length, scanEnd - position);
            const result = await file.read(buffer, 0, length, position);
            if (!result.bytesRead)
                break;
            bytesRead += result.bytesRead;
            const newline = buffer.subarray(0, result.bytesRead).indexOf(0x0a);
            if (newline >= 0)
                return { offset: position + newline + 1, bytesRead };
            position += result.bytesRead;
        }
        // A physical line can itself be huge. Stop after one probe block;
        // record parsing discards this leading partial line.
        return { offset: position, bytesRead };
    }
    async readRawLines(filePath, requestedStart, endExclusive, snapshotSize, guard) {
        const file = await fs.promises.open(filePath, 'r');
        try {
            const aligned = await this.alignToNextLine(file, Math.max(0, requestedStart), snapshotSize, guard);
            const start = aligned.offset;
            const end = Math.max(start, Math.min(endExclusive, snapshotSize));
            const lines = [];
            let position = start;
            let pending = Buffer.alloc(0);
            let pendingStart = start;
            let bytesRead = aligned.bytesRead;
            while (position < end) {
                ensureActive(guard);
                const buffer = Buffer.allocUnsafe(Math.min(READ_BLOCK_BYTES, end - position));
                const result = await file.read(buffer, 0, buffer.length, position);
                if (!result.bytesRead)
                    break;
                bytesRead += result.bytesRead;
                const chunk = buffer.subarray(0, result.bytesRead);
                const combined = pending.length ? Buffer.concat([pending, chunk]) : chunk;
                const combinedStart = pending.length ? pendingStart : position;
                let lineStartIndex = 0;
                let newline;
                while ((newline = combined.indexOf(0x0a, lineStartIndex)) >= 0) {
                    let lineBuffer = combined.subarray(lineStartIndex, newline);
                    if (lineBuffer.length && lineBuffer[lineBuffer.length - 1] === 0x0d) {
                        lineBuffer = lineBuffer.subarray(0, lineBuffer.length - 1);
                    }
                    lines.push({
                        text: lineBuffer.toString('utf8'),
                        startOffset: combinedStart + lineStartIndex,
                        endOffset: combinedStart + newline + 1
                    });
                    lineStartIndex = newline + 1;
                }
                pending = combined.subarray(lineStartIndex);
                pendingStart = combinedStart + lineStartIndex;
                position += result.bytesRead;
            }
            let completeEndOffset = pendingStart;
            // Only the true file snapshot tail may be emitted without a trailing newline.
            if (pending.length && end === snapshotSize) {
                lines.push({ text: pending.toString('utf8'), startOffset: pendingStart, endOffset: end });
                completeEndOffset = end;
            }
            else if (!pending.length) {
                completeEndOffset = end;
            }
            return { lines, bytesRead, completeEndOffset, alignedStart: start };
        }
        finally {
            await file.close();
        }
    }
    parseRecords(lines, fileDate, dropLeadingContinuation) {
        const records = [];
        let current = null;
        let seenTimestamp = false;
        const append = (record, text) => {
            if (record.text.length >= MAX_RECORD_BUFFER_CHARS)
                return;
            const room = MAX_RECORD_BUFFER_CHARS - record.text.length;
            const addition = record.text ? `\n${text}` : text;
            record.text += addition.slice(0, room);
        };
        for (const raw of lines) {
            const text = raw.text.replace(ANSI_RE, '');
            if (!text.trim())
                continue;
            const timestampMatch = TS_RE.exec(text);
            if (timestampMatch) {
                if (current)
                    records.push(current);
                const timestamp = Date.parse(timestampMatch[1]);
                if (Number.isNaN(timestamp)) {
                    current = null;
                    continue;
                }
                seenTimestamp = true;
                current = {
                    timestamp,
                    level: LEVEL_RE.exec(text)?.[1]?.toUpperCase(),
                    source: RPA_COMPONENT_RE.test(text) ? 'rpa' : 'agent',
                    text,
                    startOffset: raw.startOffset,
                    endOffset: raw.endOffset,
                    fileDate
                };
                continue;
            }
            if (!current) {
                if (dropLeadingContinuation && !seenTimestamp)
                    continue;
                current = {
                    timestamp: 0,
                    source: 'agent',
                    text,
                    startOffset: raw.startOffset,
                    endOffset: raw.endOffset,
                    fileDate
                };
            }
            else {
                append(current, text);
                current.endOffset = raw.endOffset;
            }
        }
        if (current)
            records.push(current);
        return records;
    }
    async readRecords(filePath, fileDate, start, end, snapshotSize, guard) {
        const raw = await this.readRawLines(filePath, start, end, snapshotSize, guard);
        return {
            records: this.parseRecords(raw.lines, fileDate, raw.alignedStart > 0),
            bytesRead: raw.bytesRead,
            completeEndOffset: raw.completeEndOffset
        };
    }
    async probeTimestampAtOrAfter(file, offset, size, guard) {
        const aligned = await this.alignToNextLine(file, offset, size, guard);
        let position = aligned.offset;
        let bytesRead = aligned.bytesRead;
        let pending = Buffer.alloc(0);
        let pendingStart = position;
        const probeEnd = Math.min(size, position + MAX_PROBE_BYTES);
        while (position < probeEnd) {
            ensureActive(guard);
            const buffer = Buffer.allocUnsafe(Math.min(PROBE_BLOCK_BYTES, probeEnd - position));
            const result = await file.read(buffer, 0, buffer.length, position);
            if (!result.bytesRead)
                break;
            bytesRead += result.bytesRead;
            const chunk = buffer.subarray(0, result.bytesRead);
            const combined = pending.length ? Buffer.concat([pending, chunk]) : chunk;
            const combinedStart = pending.length ? pendingStart : position;
            let cursor = 0;
            let newline;
            while ((newline = combined.indexOf(0x0a, cursor)) >= 0) {
                const line = combined.subarray(cursor, newline).toString('utf8').replace(ANSI_RE, '');
                const match = TS_RE.exec(line);
                if (match) {
                    const timestamp = Date.parse(match[1]);
                    if (!Number.isNaN(timestamp))
                        return { timestamp, offset: combinedStart + cursor, bytesRead };
                }
                cursor = newline + 1;
            }
            pending = combined.subarray(cursor);
            pendingStart = combinedStart + cursor;
            position += result.bytesRead;
        }
        return null;
    }
    async scanTimestampRange(file, requestedStart, endExclusive, targetMs, guard) {
        const aligned = await this.alignToNextLine(file, requestedStart, endExclusive, guard);
        let position = aligned.offset;
        let bytesRead = aligned.bytesRead;
        let pending = Buffer.alloc(0);
        let pendingStart = position;
        while (position < endExclusive) {
            ensureActive(guard);
            const buffer = Buffer.allocUnsafe(Math.min(READ_BLOCK_BYTES, endExclusive - position));
            const result = await file.read(buffer, 0, buffer.length, position);
            if (!result.bytesRead)
                break;
            bytesRead += result.bytesRead;
            const chunk = buffer.subarray(0, result.bytesRead);
            const combined = pending.length ? Buffer.concat([pending, chunk]) : chunk;
            const combinedStart = pending.length ? pendingStart : position;
            let cursor = 0;
            let newline;
            while ((newline = combined.indexOf(0x0a, cursor)) >= 0) {
                const line = combined.subarray(cursor, newline).toString('utf8').replace(ANSI_RE, '');
                const match = TS_RE.exec(line);
                if (match) {
                    const timestamp = Date.parse(match[1]);
                    if (!Number.isNaN(timestamp) && timestamp >= targetMs) {
                        return { offset: combinedStart + cursor, bytesRead };
                    }
                }
                cursor = newline + 1;
            }
            pending = combined.subarray(cursor);
            pendingStart = combinedStart + cursor;
            position += result.bytesRead;
        }
        return { offset: null, bytesRead };
    }
    async findOffsetForTime(filePath, targetMs, snapshotSize, guard) {
        if (snapshotSize <= 0)
            return { offset: 0, bytesRead: 0 };
        const file = await fs.promises.open(filePath, 'r');
        try {
            let low = 0;
            let high = snapshotSize;
            let bytesRead = 0;
            for (let i = 0; i < 32 && high - low > READ_BLOCK_BYTES; i++) {
                ensureActive(guard);
                const middle = low + Math.floor((high - low) / 2);
                const probe = await this.probeTimestampAtOrAfter(file, middle, snapshotSize, guard);
                if (!probe) {
                    high = middle;
                    continue;
                }
                bytesRead += probe.bytesRead;
                if (probe.timestamp < targetMs) {
                    low = Math.max(middle + 1, probe.offset + 1);
                }
                else {
                    high = probe.offset;
                }
            }
            const scanStart = Math.max(0, low - MAX_PROBE_BYTES);
            const scanLimit = Math.min(snapshotSize, high + MAX_PROBE_BYTES * 2);
            const scanned = await this.scanTimestampRange(file, scanStart, scanLimit, targetMs, guard);
            bytesRead += scanned.bytesRead;
            if (scanned.offset !== null)
                return { offset: scanned.offset, bytesRead };
            return { offset: snapshotSize, bytesRead };
        }
        finally {
            await file.close();
        }
    }
    selectRecords(records, source, level, anchor, component, contextRecords) {
        const normalizedLevel = level?.toUpperCase();
        const normalizedAnchor = anchor?.toLowerCase();
        const normalizedComponent = component?.toLowerCase();
        const sourceRecords = records.filter(record => record.source === source);
        const matchesFilters = (record) => (!normalizedLevel || record.level === normalizedLevel) &&
            (!normalizedComponent || record.text.toLowerCase().includes(normalizedComponent));
        if (!normalizedAnchor) {
            return { records: sourceRecords.filter(matchesFilters), hits: 0 };
        }
        const hitIndexes = [];
        sourceRecords.forEach((record, index) => {
            if (!matchesFilters(record))
                return;
            if (record.text.toLowerCase().includes(normalizedAnchor))
                hitIndexes.push(index);
        });
        const indexes = new Set();
        for (const hit of hitIndexes) {
            for (let i = Math.max(0, hit - contextRecords); i <= Math.min(sourceRecords.length - 1, hit + contextRecords); i++) {
                indexes.add(i);
            }
        }
        return {
            records: [...indexes].sort((a, b) => a - b).map(index => sourceRecords[index]),
            hits: hitIndexes.length
        };
    }
    buildResult(headerLines, records, nextCursorFactory) {
        const reserved = 900;
        const bodyBudget = Math.max(0, MAX_RESULT_CHARS - reserved - headerLines.join('\n').length);
        const body = [];
        let bodyChars = 0;
        let lastRecord = null;
        for (const record of records) {
            const text = clipRecord(record.text);
            const addition = (body.length ? 1 : 0) + text.length;
            if (bodyChars + addition > bodyBudget)
                break;
            body.push(text);
            bodyChars += addition;
            lastRecord = record;
        }
        const omittedByChars = body.length < records.length;
        const cursor = nextCursorFactory?.(lastRecord, omittedByChars) || null;
        if (omittedByChars)
            headerLines.push(`⚠️ 输出达到 ${MAX_RESULT_CHARS} 字符预算，仅返回 ${body.length}/${records.length} 条记录。`);
        if (cursor)
            headerLines.push(`继续读取 cursor="${cursor}"`);
        const result = `${headerLines.join('\n')}\n${body.length ? body.join('\n') : '(无匹配日志记录)'}`;
        return result.length <= MAX_RESULT_CHARS ? result : result.slice(0, MAX_RESULT_CHARS);
    }
    async readTail(filePath, fileDate, lines, source, level, anchor, component, contextRecords, guard) {
        const stats = await fs.promises.stat(filePath);
        const snapshotSize = stats.size;
        // Reserve one probe block for aligning an arbitrary byte position to the next full line.
        const tailContentBudget = TAIL_SCAN_BYTES - PROBE_BLOCK_BYTES - 1;
        const start = Math.max(0, snapshotSize - tailContentBudget);
        const read = await this.readRecords(filePath, fileDate, start, snapshotSize, snapshotSize, guard);
        const selected = this.selectRecords(read.records, source, level, anchor, component, contextRecords);
        const returned = selected.records.slice(-lines);
        const relation = evidenceRelation(anchor, selected.hits);
        const header = [
            `日志文件：${filePath}`,
            `读取模式：文件尾部；扫描 ${read.bytesRead} bytes（上限 ${TAIL_SCAN_BYTES}），逻辑记录 ${read.records.length} 条。`,
            `诊断元数据：source=${source} relation=${relation} anchorHits=${selected.hits} coverage=${start > 0 ? 'partial' : 'complete'}。`,
            `${anchor ? `anchor「${anchor}」；` : ''}${component ? `component「${component}」；` : ''}本次返回 ${returned.length} 条。`
        ];
        if (relation !== 'anchored')
            header.push('归因约束：当前结果未与具体目标建立关联，不能单独作为直接原因。');
        if (start > 0)
            header.push('提示：本次只检查文件尾部；排查历史问题请传 from/to。');
        return this.buildResult(header, returned);
    }
    async readWindow(dates, fromMs, toMs, cursor, lines, source, level, anchor, component, contextRecords, guard) {
        const allSelected = [];
        const filesRead = [];
        const warnings = [];
        let totalBytes = 0;
        let totalHits = 0;
        let truncatedAt = null;
        let stoppedForRecordLimit = false;
        for (const fileDate of dates) {
            ensureActive(guard);
            const filePath = this.resolveLogFile(fileDate);
            if (!fs.existsSync(filePath)) {
                warnings.push(`缺少日志文件：${filePath}`);
                continue;
            }
            filesRead.push(filePath);
            const stats = await fs.promises.stat(filePath);
            const snapshotSize = stats.size;
            let startOffset = 0;
            let endOffset = snapshotSize;
            if (cursor && fileDate === cursor.fileDate) {
                startOffset = Math.min(cursor.offset, snapshotSize);
            }
            else if (fileDate === localDateOf(fromMs)) {
                const found = await this.findOffsetForTime(filePath, fromMs, snapshotSize, guard);
                startOffset = found.offset;
                totalBytes += found.bytesRead;
            }
            if (fileDate === localDateOf(toMs)) {
                const found = await this.findOffsetForTime(filePath, toMs + 1, snapshotSize, guard);
                endOffset = found.offset;
                totalBytes += found.bytesRead;
            }
            const budgetLeft = MAX_SCAN_BYTES - totalBytes;
            if (budgetLeft <= PROBE_BLOCK_BYTES + 1) {
                truncatedAt = { fileDate, offset: startOffset };
                break;
            }
            const requestedEnd = endOffset;
            const boundedEnd = Math.min(endOffset, startOffset + budgetLeft - PROBE_BLOCK_BYTES - 1);
            const read = await this.readRecords(filePath, fileDate, startOffset, boundedEnd, snapshotSize, guard);
            totalBytes += read.bytesRead;
            const inRange = read.records.filter(record => record.timestamp > 0 && record.timestamp >= fromMs && record.timestamp <= toMs);
            const selected = this.selectRecords(inRange, source, level, anchor, component, contextRecords);
            totalHits += selected.hits;
            allSelected.push(...selected.records);
            if (allSelected.length > lines) {
                const last = allSelected[lines - 1];
                truncatedAt = { fileDate: last.fileDate, offset: last.endOffset };
                stoppedForRecordLimit = true;
                break;
            }
            if (boundedEnd < requestedEnd) {
                truncatedAt = { fileDate, offset: read.completeEndOffset };
                break;
            }
        }
        if (!filesRead.length) {
            const firstDate = dates[0] || localDateOf(fromMs);
            return this.missingFileMessage(firstDate, this.resolveLogFile(firstDate));
        }
        const returned = allSelected.slice(0, lines);
        const baseCursor = truncatedAt ? encodeCursor({
            v: 2,
            fileDate: truncatedAt.fileDate,
            offset: truncatedAt.offset,
            toMs,
            source,
            level,
            anchor,
            component,
            contextRecords,
            lines
        }) : null;
        const relation = evidenceRelation(anchor, totalHits);
        const coverage = warnings.length || truncatedAt ? 'partial' : 'complete';
        const header = [
            `日志文件：${filesRead.join('；')}`,
            `查询范围：${localDateTime(fromMs)} ~ ${localDateTime(toMs)}（${localTzLabel(fromMs)}）`,
            `按 byte offset 定位；本次读取 ${totalBytes} bytes（上限 ${MAX_SCAN_BYTES}）。`,
            `诊断元数据：source=${source} relation=${relation} anchorHits=${totalHits} coverage=${coverage}。`,
            `${anchor ? `anchor「${anchor}」；` : ''}${component ? `component「${component}」；` : ''}本次返回 ${returned.length} 条逻辑记录。`
        ];
        if (warnings.length)
            header.push(...warnings.map(item => `⚠️ ${item}`));
        if (truncatedAt)
            header.push(`⚠️ 时间窗口未读完（${stoppedForRecordLimit ? '达到记录数上限' : '达到扫描预算'}）。`);
        if (relation !== 'anchored')
            header.push('归因约束：当前结果未与具体目标建立关联，不能单独作为直接原因。');
        return this.buildResult(header, returned, (lastRecord, omittedByChars) => {
            if (omittedByChars && lastRecord) {
                return encodeCursor({
                    v: 2,
                    fileDate: lastRecord.fileDate,
                    offset: lastRecord.endOffset,
                    toMs,
                    source,
                    level,
                    anchor,
                    component,
                    contextRecords,
                    lines
                });
            }
            return baseCursor;
        });
    }
    async analyzeLogs(args, signal) {
        const guard = { signal, deadline: Date.now() + QUERY_TIMEOUT_MS };
        try {
            ensureActive(guard);
            const cursor = args.cursor ? decodeCursor(args.cursor) : null;
            if (args.cursor && !cursor)
                return '无效或已损坏的日志 cursor。';
            if (cursor && (args.source || args.from || args.to || args.date || args.level || args.anchor || args.component || args.lines || args.contextLines)) {
                return '继续读取时请只传 cursor，不要同时修改其他查询条件。';
            }
            const source = cursor?.source ?? args.source?.toLowerCase();
            if (source !== 'agent' && source !== 'rpa')
                return '首次查询必须指定 source=agent 或 source=rpa；外部服务内部日志不在本工具范围。';
            const rawLines = cursor?.lines ?? Number(args.lines ?? DEFAULT_LINES);
            const lines = Number.isInteger(rawLines) && rawLines >= 1 && rawLines <= MAX_LINES ? rawLines : NaN;
            if (!Number.isFinite(lines))
                return `lines 必须是 1~${MAX_LINES} 的整数。`;
            const rawContext = cursor?.contextRecords ?? Number(args.contextLines ?? 0);
            const contextRecords = Number.isInteger(rawContext) && rawContext >= 0 && rawContext <= MAX_CONTEXT_RECORDS ? rawContext : NaN;
            if (!Number.isFinite(contextRecords))
                return `contextLines 必须是 0~${MAX_CONTEXT_RECORDS} 的整数。`;
            const level = cursor?.level ?? args.level?.toUpperCase();
            if (level && !['INFO', 'WARN', 'ERROR'].includes(level))
                return 'level 只支持 INFO、WARN、ERROR。';
            const anchor = (cursor?.anchor ?? args.anchor)?.trim();
            if (anchor && anchor.length > 200)
                return 'anchor 最长 200 个字符。';
            if (anchor && !isSpecificAnchor(anchor))
                return 'status=needs_anchor：anchor 必须是具体任务 ID、traceId、联系人、群名或消息片段；通用技术词请放到 component。';
            const component = (cursor?.component ?? args.component)?.trim();
            if (component && component.length > 100)
                return 'component 最长 100 个字符。';
            if (cursor) {
                const fromMs = validLocalDateTime(...parseDateParts(cursor.fileDate), 0, 0, 0);
                const dates = dateRange(fromMs, cursor.toMs);
                if (!dates)
                    return `单次日志查询最多跨 ${MAX_RANGE_DAYS} 天，请缩小时间范围。`;
                return await this.readWindow(dates, fromMs, cursor.toMs, cursor, lines, source, level, anchor, component, contextRecords, guard);
            }
            const date = args.date || localDateOf(Date.now());
            if (!parseDateParts(date))
                return `date=${JSON.stringify(date)} 不是有效的 YYYY-MM-DD 日期。`;
            if (!args.from && !args.to) {
                const filePath = this.resolveLogFile(date);
                if (!fs.existsSync(filePath))
                    return this.missingFileMessage(date, filePath);
                return await this.readTail(filePath, date, lines, source, level, anchor, component, contextRecords, guard);
            }
            const fromMs = args.from
                ? parseTime(args.from, date)
                : validLocalDateTime(...parseDateParts(date), 0, 0, 0);
            const toMs = args.to ? parseTime(args.to, date) : Date.now();
            if (fromMs === null)
                return `无法解析 from=${JSON.stringify(args.from)}；可用格式："15:30"、"2026-07-21 15:30"、"-30m"。`;
            if (toMs === null)
                return `无法解析 to=${JSON.stringify(args.to)}；可用格式同 from。`;
            if (fromMs > toMs)
                return `时间窗口反了：from(${localDateTime(fromMs)}) 晚于 to(${localDateTime(toMs)})。`;
            if (!anchor && toMs - fromMs > MAX_UNANCHORED_WINDOW_MS) {
                return 'status=needs_anchor：无 anchor 的时间窗口最多 30 分钟；请提供任务 ID、traceId、联系人、群名或消息片段。';
            }
            const dates = dateRange(fromMs, toMs);
            if (!dates)
                return `单次日志查询最多跨 ${MAX_RANGE_DAYS} 天，请缩小时间范围。`;
            return await this.readWindow(dates, fromMs, toMs, null, lines, source, level, anchor, component, contextRecords, guard);
        }
        catch (error) {
            return `Error reading logs: ${error?.message || String(error)}`;
        }
    }
}
