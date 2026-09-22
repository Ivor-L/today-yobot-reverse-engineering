// 任务组汇总生成器
//
// 阶段一: 机械拼接 SubTaskResult,产出可读的 finalSummary 写入 group.
// 阶段二可替换为"调主 agent 用 LLM 生成自然语言汇总",接口保持不变。
/**
 * 把已 finalize 的 group 中的所有 SubTaskResult 拼接为给用户看的多行文本。
 * 不会修改入参,返回纯字符串。
 */
export function summarizeGroup(group) {
    const lines = [];
    const headStatus = describeGroupHeadStatus(group);
    lines.push(headStatus);
    lines.push("");
    // 1. 子任务级别的小结
    const succeeded = group.subTasks.filter((t) => t.status === "completed");
    const failed = group.subTasks.filter((t) => t.status === "failed" || t.status === "timed_out" || t.status === "cancelled");
    if (succeeded.length > 0) {
        lines.push(`✓ 完成 ${succeeded.length} 个子任务:`);
        for (const t of succeeded) {
            const r = t.result;
            if (r) {
                lines.push(`  · ${t.title}: ${r.summary}`);
                if (r.findings.length > 0) {
                    for (const f of r.findings.slice(0, 3)) {
                        lines.push(`      - ${f}`);
                    }
                    if (r.findings.length > 3) {
                        lines.push(`      - …(还有 ${r.findings.length - 3} 项发现)`);
                    }
                }
            }
            else {
                lines.push(`  · ${t.title}: (无结构化结果)`);
            }
        }
        lines.push("");
    }
    if (failed.length > 0) {
        lines.push(`✗ 失败/取消 ${failed.length} 个子任务:`);
        for (const t of failed) {
            const reason = t.error || t.errorCode || t.status;
            lines.push(`  · ${t.title}: ${reason}`);
        }
        lines.push("");
    }
    // 2. 聚合产物
    const artifacts = collectArtifacts(group);
    if (artifacts.length > 0) {
        lines.push("产物:");
        for (const a of artifacts) {
            const head = artifactGlyph(a.type);
            lines.push(`  ${head} ${a.title}${a.uri ? ` (${a.uri})` : ""}`);
        }
        lines.push("");
    }
    // 3. 阻塞与下一步建议
    const blockers = collectBlockers(group);
    if (blockers.length > 0) {
        lines.push("未解决:");
        for (const b of blockers) {
            lines.push(`  · ${b}`);
        }
        lines.push("");
    }
    const next = collectNextActions(group);
    if (next.length > 0) {
        lines.push("建议下一步:");
        for (const n of next) {
            lines.push(`  · ${n}`);
        }
        lines.push("");
    }
    return lines.join("\n").trimEnd();
}
function describeGroupHeadStatus(group) {
    const total = group.subTasks.length;
    const ok = group.subTasks.filter((t) => t.status === "completed").length;
    switch (group.status) {
        case "completed":
            return `任务组全部完成 (${ok}/${total})。`;
        case "completed_with_errors":
            return `任务组完成,含失败子任务 (${ok}/${total} 成功)。`;
        case "cancelled":
            return `任务组已取消 (${ok}/${total} 完成)。`;
        case "failed":
            return `任务组失败。`;
        default:
            return `任务组状态: ${group.status} (${ok}/${total})`;
    }
}
function collectArtifacts(group) {
    const result = [];
    for (const t of group.subTasks) {
        if (t.result?.artifacts) {
            result.push(...t.result.artifacts);
        }
    }
    // 去重 (按 title + uri)
    const seen = new Set();
    return result.filter((a) => {
        const k = `${a.type}|${a.title}|${a.uri ?? ""}`;
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
}
function collectBlockers(group) {
    const all = [];
    for (const t of group.subTasks) {
        if (t.result?.blockers) {
            for (const b of t.result.blockers) {
                all.push(`[${t.title}] ${b}`);
            }
        }
    }
    return all;
}
function collectNextActions(group) {
    const all = [];
    for (const t of group.subTasks) {
        if (t.result?.nextActions) {
            all.push(...t.result.nextActions);
        }
    }
    // 去重
    return [...new Set(all)];
}
function artifactGlyph(type) {
    switch (type) {
        case "file": return "📄";
        case "url": return "🔗";
        case "table": return "📊";
        case "message_draft": return "✉";
        default: return "·";
    }
}
