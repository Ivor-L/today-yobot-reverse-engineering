import path from 'path';
// @ts-ignore
import * as pdf from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';
const EXCEL_FULL_CONTEXT_MAX_CELLS = 400;
const EXCEL_PREVIEW_MAX_SHEETS = 12;
const EXCEL_PREVIEW_MAX_ROWS = 12;
const EXCEL_PREVIEW_MAX_COLUMNS = 20;
const EXCEL_PREVIEW_MAX_CELL_CHARS = 160;
const EXCEL_FULL_MAX_CELL_CHARS = 1000;
const EXCEL_CONTEXT_MAX_CHARS = 24000;
/**
 * 知识库摄取模式的上限。
 *
 * 为什么必须和 context 模式分开：context 模式是给 **Agent 上下文**用的**有界预览**
 * （>400 单元格就截到 12 行 × 20 列，并附一句「用 spreadsheet 技能读原文件」）。
 * 那套限制对上下文是对的，但拿来做**知识库摄取**会把表格内容直接切掉大半 ——
 * 用户传了 5000 行报价表，索引里只有前 12 行，检索时永远搜不到第 13 行以后的内容，
 * 而且毫无报错。
 *
 * 摄取模式下不做行列截断（文件体积由 KB 的 maxFileBytes 闸门管），
 * 只保留一个很宽松的字符上限防病态膨胀。
 */
const EXCEL_INGEST_MAX_CHARS = 5_000_000;
/**
 * 转换模式。
 * - `context`（默认）：喂给 Agent 上下文，有界预览，保持既有行为不变。
 * - `ingest`：知识库摄取，要完整内容。
 */
/**
 * PDF 正文低于这个字符数即判为扫描件。
 *
 * 取 20：文字版 PDF 哪怕只有一页封面也远不止 20 个字符；
 * 而扫描件通常只能抽出页码标记之类的零星字符。
 */
const SCANNED_PDF_MIN_CHARS = 20;
export class DocConverter {
    /**
     * Converts a file buffer to Markdown text based on its extension/mime type.
     * @param buffer The file buffer
     * @param filename The filename (used for extension detection)
     * @param mimeType The mime type (optional fallback)
     */
    static async convertToMarkdown(buffer, filename, mimeType, opts) {
        const ext = path.extname(filename).toLowerCase();
        const mode = opts?.mode ?? 'context';
        try {
            if (ext === '.pdf' || mimeType === 'application/pdf') {
                return await this.convertPdf(buffer);
            }
            else if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                return await this.convertDocx(buffer);
            }
            else if (ext === '.xlsx' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                return await this.convertExcel(buffer, mode);
            }
            else if (ext === '.txt' || mimeType === 'text/plain' || ext === '.md' || ext === '.json' || ext === '.fireflow' || ext === '.js' || ext === '.ts' || ext === '.tsx') {
                return await this.convertText(buffer);
            }
            else {
                throw new Error(`Unsupported file type: ${ext}`);
            }
        }
        catch (error) {
            console.error(`[DocConverter] Failed to convert ${filename}:`, error);
            throw error;
        }
    }
    static async convertPdf(buffer) {
        // Handle pdf-parse import differences and version compatibility
        let pdfModule = pdf;
        try {
            // Try to use 'require' if available (injected by esbuild banner) to bypass some ESM/CJS interop issues
            // This is especially useful since we externalized pdf-parse in build config
            // @ts-ignore
            if (typeof require !== 'undefined') {
                // @ts-ignore
                pdfModule = require('pdf-parse');
            }
        }
        catch (e) {
            console.warn('[DocConverter] require("pdf-parse") failed, using import fallback', e);
        }
        console.log('[DocConverter] Inspecting pdf-parse module:', {
            keys: Object.keys(pdfModule),
            type: typeof pdfModule,
            hasDefault: 'default' in pdfModule,
            hasPDFParse: 'PDFParse' in pdfModule
        });
        // Check for pdf-parse v2.x (Class based API)
        let PDFParseClass = pdfModule.PDFParse;
        // Check if it's nested in default (e.g. CJS export via ESM interop)
        if (!PDFParseClass && pdfModule.default && pdfModule.default.PDFParse) {
            PDFParseClass = pdfModule.default.PDFParse;
        }
        if (PDFParseClass) {
            console.log('[DocConverter] Using PDFParse Class API (v2.x)');
            const parser = new PDFParseClass({ data: buffer });
            try {
                const data = await parser.getText();
                let text = data.text;
                // Heuristic: Check if text is effectively empty (only whitespace or page markers)
                // pdf-parse v2 adds markers like "-- 1 of 4 --"
                const cleanText = text.replace(/-- \d+ of \d+ --/g, '').replace(/\s+/g, '');
                // 扫描件（纯图片 PDF）解析不出正文。
                //
                // ⚠️ **绝不能把提示语拼进 content。** 以前这里往 text 里追加一句英文
                // System Warning，于是内容从「空」变成「非空」—— 调用方只判 `chars === 0`，
                // 就把这份文档当成解析成功入库了。最终结果是：用户看到「导入成功」，
                // 而 RAG 里躺着的是一句英文报错，检索时还会被召回。
                //
                // 正确做法是把它变成**结构化的失败**，由调用方决定怎么告诉用户。
                if (cleanText.length < SCANNED_PDF_MIN_CHARS) {
                    return {
                        type: 'text',
                        content: '',
                        metadata: {
                            unsupported: 'scanned_pdf',
                            reason: '这份 PDF 几乎没有可提取的文字，通常是扫描件或图片版，暂不支持（需要 OCR）',
                            extractedChars: cleanText.length,
                        },
                    };
                }
                return {
                    type: 'text',
                    content: text
                };
            }
            finally {
                // Ensure resources are cleaned up
                if (typeof parser.destroy === 'function') {
                    await parser.destroy();
                }
            }
        }
        // Fallback for pdf-parse v1.x (Function based API)
        const parser = pdfModule.default || pdfModule;
        if (typeof parser === 'function') {
            console.log('[DocConverter] Using pdf-parse Function API (v1.x)');
            const data = await parser(buffer);
            return {
                type: 'text',
                content: data.text
            };
        }
        throw new Error(`Could not initialize pdf-parse: Incompatible version or import. Keys: ${Object.keys(pdfModule).join(', ')}`);
    }
    static async convertDocx(buffer) {
        const result = await mammoth.extractRawText({ buffer });
        if (result.messages && result.messages.length > 0) {
            console.warn('[DocConverter] Mammoth messages:', result.messages);
        }
        return {
            type: 'text',
            content: result.value
        };
    }
    static async convertExcel(buffer, mode = 'context') {
        const ingest = mode === 'ingest';
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetInfo = workbook.SheetNames.map(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const ref = sheet?.['!ref'];
            if (!ref)
                return { sheetName, sheet, ref: null, rows: 0, columns: 0 };
            const range = xlsx.utils.decode_range(ref);
            return {
                sheetName,
                sheet,
                ref,
                rows: range.e.r - range.s.r + 1,
                columns: range.e.c - range.s.c + 1,
            };
        });
        const totalCells = sheetInfo.reduce((sum, info) => sum + info.rows * info.columns, 0);
        // 摄取模式恒取全量：预览截断对上下文合理，对索引是静默丢内容。
        const includeFullContent = ingest || totalCells <= EXCEL_FULL_CONTEXT_MAX_CELLS;
        const previewSheets = includeFullContent
            ? sheetInfo
            : sheetInfo.slice(0, EXCEL_PREVIEW_MAX_SHEETS);
        // 字符预算在**拼字符串之前**就定下来。
        // 旧实现是「先把整本工作簿拼成 markdown，再一刀截断」—— 一个 50MB 的 xlsx
        // 能膨胀出几百 MB 字符串，截断之前那份内存已经吃掉了。
        const charLimit = ingest ? EXCEL_INGEST_MAX_CHARS : EXCEL_CONTEXT_MAX_CHARS;
        let markdown = [
            `Workbook sheets (${workbook.SheetNames.length}): ${workbook.SheetNames.join(', ')}`,
            `Workbook size estimate: ${totalCells.toLocaleString('en-US')} cells across used ranges.`,
        ].join('\n') + '\n\n';
        if (!includeFullContent) {
            markdown += [
                '> Bounded preview only. Read the attached file path with the spreadsheet skill before calculating, transforming, or editing the workbook.',
                `> Preview limits: ${EXCEL_PREVIEW_MAX_ROWS} rows × ${EXCEL_PREVIEW_MAX_COLUMNS} columns per sheet, up to ${EXCEL_PREVIEW_MAX_SHEETS} sheets.`,
                '',
            ].join('\n');
        }
        let budgetExhausted = false;
        previewSheets.forEach(info => {
            // 预算用尽就不再拼 —— 后面的内容反正会被截掉，构造它只是白烧内存。
            if (markdown.length >= charLimit) {
                budgetExhausted = true;
                return;
            }
            markdown += `## Sheet: ${info.sheetName}\n\n`;
            markdown += `Used range: ${info.ref || 'empty'}; estimated size: ${info.rows} rows × ${info.columns} columns.\n\n`;
            if (info.ref && info.rows > 0 && info.columns > 0) {
                const sourceRange = xlsx.utils.decode_range(info.ref);
                const previewRange = {
                    s: sourceRange.s,
                    e: {
                        r: includeFullContent
                            ? sourceRange.e.r
                            : Math.min(sourceRange.e.r, sourceRange.s.r + EXCEL_PREVIEW_MAX_ROWS - 1),
                        c: includeFullContent
                            ? sourceRange.e.c
                            : Math.min(sourceRange.e.c, sourceRange.s.c + EXCEL_PREVIEW_MAX_COLUMNS - 1),
                    },
                };
                const json = xlsx.utils.sheet_to_json(info.sheet, {
                    header: 1,
                    range: previewRange,
                    blankrows: true,
                    defval: '',
                });
                // 按剩余预算估算能放多少行，**先裁行再生成表格**。
                // 直接把 10 万行喂给 jsonToMarkdownTable 会先在内存里生成完整表格，
                // 之后才被外层截断 —— 那一步的峰值内存是真实风险，不是理论风险。
                const rows = json;
                const rowsToRender = this.boundRowsByBudget(rows, charLimit - markdown.length);
                if (rowsToRender < rows.length)
                    budgetExhausted = true;
                markdown += this.jsonToMarkdownTable(rows.slice(0, Math.max(1, rowsToRender)), includeFullContent ? EXCEL_FULL_MAX_CELL_CHARS : EXCEL_PREVIEW_MAX_CELL_CHARS);
                if (!includeFullContent && (info.rows > EXCEL_PREVIEW_MAX_ROWS || info.columns > EXCEL_PREVIEW_MAX_COLUMNS)) {
                    markdown += `\n_Preview truncated; use the attached file for the complete ${info.rows} × ${info.columns} used range._\n`;
                }
            }
            markdown += '\n\n';
        });
        if (previewSheets.length < sheetInfo.length) {
            markdown += `_Preview omitted ${sheetInfo.length - previewSheets.length} additional sheet(s); all sheet names are listed above._\n`;
        }
        let truncatedByCharacterLimit = false;
        if (markdown.length > charLimit) {
            truncatedByCharacterLimit = true;
            const suffix = ingest
                ? '\n\n_内容超出单文档上限，已截断。请拆分该表格后重新上传。_\n'
                : '\n\n_Context truncated at the attachment preview limit; use the attached file path for complete data._\n';
            markdown = markdown.slice(0, charLimit - suffix.length) + suffix;
        }
        return {
            type: 'markdown',
            content: markdown,
            metadata: {
                sheetCount: workbook.SheetNames.length,
                totalUsedRangeCells: totalCells,
                boundedPreview: !includeFullContent || truncatedByCharacterLimit || budgetExhausted,
                truncatedByCharacterLimit: truncatedByCharacterLimit || budgetExhausted,
            },
        };
    }
    /**
     * 按字符预算估算可渲染的行数。
     *
     * 用**前若干行的实际宽度**估平均行宽，而不是拍常数 —— 表格列宽差异可达两个
     * 数量级（一列 ID vs 一列长描述），拍常数会让宽表严重超预算、窄表白白浪费。
     */
    static boundRowsByBudget(rows, budgetChars) {
        if (budgetChars <= 0 || rows.length === 0)
            return 0;
        const sampleSize = Math.min(rows.length, 20);
        let sampleChars = 0;
        for (let i = 0; i < sampleSize; i++) {
            // +3/列 覆盖 markdown 的 ` | ` 分隔符开销
            sampleChars += (rows[i] || []).reduce((n, cell) => n + String(cell ?? '').length + 3, 0) + 1;
        }
        const avgRowChars = Math.max(1, Math.ceil(sampleChars / sampleSize));
        const affordable = Math.floor((budgetChars - 64) / avgRowChars); // 表头/分隔行留余量
        return Math.max(0, Math.min(rows.length, affordable));
    }
    static async convertText(buffer) {
        return {
            type: 'text',
            content: buffer.toString('utf-8')
        };
    }
    static jsonToMarkdownTable(data, maxCellChars = Number.POSITIVE_INFINITY) {
        if (data.length === 0)
            return '';
        // Helper to escape pipes
        const escape = (val) => {
            const text = String(val ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
            if (text.length <= maxCellChars)
                return text;
            return `${text.slice(0, Math.max(0, maxCellChars - 1))}…`;
        };
        const header = data[0];
        const rows = data.slice(1);
        let table = '| ' + header.map(escape).join(' | ') + ' |\n';
        table += '| ' + header.map(() => '---').join(' | ') + ' |\n';
        rows.forEach(row => {
            // Ensure row has same length as header
            const normalizedRow = Array(header.length).fill('');
            row.forEach((val, i) => { if (i < header.length)
                normalizedRow[i] = val; });
            table += '| ' + normalizedRow.map(escape).join(' | ') + ' |\n';
        });
        return table;
    }
}
