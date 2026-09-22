// 名单表格的读取与表头改写。
//
// 为什么单独成文件：这一段是整条导入链路里唯一确定性的部分——
// 「哪一列是微信号」由模型判断（它擅长），「把表格改成规范格式」必须由代码做（它才可靠）。
// 让模型直接去写 xlsx 既不可靠也没必要，出错还查不出来。
//
// RPA 侧的契约（源码：WeRobotCore/utils/excel_parser.py `parse_friend_list`）：
//   · 必填表头 `微信号/手机号` —— **精确字符串匹配**，没有任何模糊匹配或大小写宽容
//   · 可选表头 `备注` `标签`
//   · 表头必须在第一行；其余列被忽略（不报错）
//   · 号码含 `.` 会被截断取前半（兼容 Excel 把手机号存成数字的 13800138000.0）
//   · 号码为空的行会被跳过；一行有效数据都没有则报「文件中没有有效的好友数据」
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
/** RPA 必填列名。改这个字符串等于改与 RPA 的契约，必须同步改 excel_parser.py。 */
export const REQUIRED_HEADER = '微信号/手机号';
/** RPA 可选列名。不在这个集合里的列一律被 RPA 忽略。 */
export const OPTIONAL_HEADERS = ['备注', '标签'];
/** 服务端上限（api_server.py:5352）。本地先挡一道，省得传完 20MB 才被拒。 */
export const MAX_ROWS = 20000;
/** 只读前几行做样本：给模型看清「这列装的是什么」，不需要把整份名单灌进上下文。 */
const SAMPLE_ROWS = 3;
function readSheet(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
        throw new Error(`不支持的文件格式 ${ext || '(无扩展名)'}，RPA 只收 .xlsx / .xls / .csv`);
    }
    if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在：${filePath}`);
    }
    // 用 read(buffer) 而不是 readFile(path)：ESM 下 xlsx 的文件系统函数不可用
    // （仓库里 doc_converter.ts 也是这么用的）。自己读 buffer 反而更可控。
    const wb = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws)
        throw new Error('表格里没有任何工作表');
    // raw:false + defval:'' → 全部取成字符串且不留空洞，避免手机号被读成 1.38e10
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
}
/**
 * 读表头与样本，不做任何改写。
 *
 * 导入前必须先走这一步：不看表头就映射等于瞎猜，而名单一旦写进 RPA
 * 就会被真的拿去加好友——把「订单号」当成微信号导进去是会骚扰真实用户的。
 */
export function inspectSheet(filePath) {
    const rows = readSheet(filePath);
    if (rows.length === 0)
        throw new Error('表格是空的');
    const headers = (rows[0] || []).map(h => String(h ?? '').trim());
    const body = rows.slice(1).filter(r => r.some(c => String(c ?? '').trim() !== ''));
    return {
        headers,
        sample: body.slice(0, SAMPLE_ROWS).map(r => headers.map((_, i) => String(r[i] ?? '').trim())),
        rowCount: body.length,
        matched: headers.includes(REQUIRED_HEADER),
    };
}
/**
 * 按映射生成一份符合 RPA 规范的临时表格，返回新文件路径。
 *
 * 只输出 RPA 认识的三列，其余一律丢弃——多余列 RPA 本来就忽略，
 * 带过去只会让临时文件变大、也让人误以为它们有用。
 *
 * @param mapping 目标列名 → 源列名。必须至少给出 REQUIRED_HEADER 的来源。
 */
export function rewriteToRpaFormat(filePath, mapping, outDir) {
    const rows = readSheet(filePath);
    if (rows.length === 0)
        throw new Error('表格是空的');
    const headers = (rows[0] || []).map(h => String(h ?? '').trim());
    const srcOf = (target) => {
        const src = mapping[target];
        if (!src)
            return -1;
        const idx = headers.indexOf(String(src).trim());
        if (idx < 0)
            throw new Error(`表格里没有列「${src}」，现有列：${headers.join(' / ')}`);
        return idx;
    };
    const wxidIdx = srcOf(REQUIRED_HEADER);
    if (wxidIdx < 0) {
        throw new Error(`必须指定哪一列是「${REQUIRED_HEADER}」，现有列：${headers.join(' / ')}`);
    }
    const remarkIdx = srcOf('备注');
    const tagsIdx = srcOf('标签');
    const out = [[REQUIRED_HEADER, '备注', '标签']];
    let skipped = 0;
    for (const row of rows.slice(1)) {
        // 与 RPA 同款清洗：号码为空就跳过；含 `.` 取前半（Excel 数字化的手机号）。
        // 在这里先做一遍，是为了能如实告诉用户「有多少行会被丢掉」——
        // 交给 RPA 做的话，用户只会看到一个对不上的总数。
        let wxid = String(row[wxidIdx] ?? '').trim();
        if (wxid.includes('.'))
            wxid = wxid.split('.')[0];
        if (!wxid) {
            skipped++;
            continue;
        }
        out.push([
            wxid,
            remarkIdx >= 0 ? String(row[remarkIdx] ?? '').trim() : '',
            tagsIdx >= 0 ? String(row[tagsIdx] ?? '').trim() : '',
        ]);
    }
    const rowCount = out.length - 1;
    if (rowCount === 0)
        throw new Error('按这个映射一行有效数据都取不到，请确认选对了号码列');
    if (rowCount > MAX_ROWS) {
        throw new Error(`共 ${rowCount} 条，超过单次上限 ${MAX_ROWS} 条，请拆分成多个文件分批导入`);
    }
    const dir = outDir || path.dirname(filePath);
    const outPath = path.join(dir, `rpa_名单_${Date.now()}.xlsx`);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(out), 'Sheet1');
    // 同理：write 成 buffer 再自己落盘，不用 writeFile
    fs.writeFileSync(outPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    return { outPath, rowCount, skipped };
}
