/** Conservative language check used only when deterministic execution evidence says an effect failed. */
export function claimsCompletedSideEffect(response) {
    const mutationPositive = /(?:\b(?:successfully\s+)?(?:created|wrote|written|saved|deleted|removed|moved|renamed|updated|modified|generated)\b|(?:已|成功)(?:创建|写入|保存|删除|移除|移动|重命名|更新|修改|生成))/i;
    const fileSubject = /(?:\b(?:file|document|folder|directory|path|artifact)\b|文件|文档|目录|路径|附件|产物|[a-z]:[\\/]|(?:^|\s)[./\\][^\s]+|[\w\u4e00-\u9fff-]+\.[a-z0-9]{1,12}\b)/i;
    const explicitFileCompletion = /(?:\b(?:file|document|folder|directory|path)\b[^.!?\r\n]{0,80}\b(?:completed|done|finished)\b|\b(?:completed|done|finished)\b[^.!?\r\n]{0,80}\b(?:file|document|folder|directory|path)\b|(?:文件|文档|目录|路径)[^。！？\r\n]{0,40}(?:已|成功)?完成|(?:已|成功)完成[^。！？\r\n]{0,40}(?:文件|文档|目录|路径))/i;
    const negative = /(?:\b(?:not|never|unable|cannot|can't|failed|blocked|denied|pending)\b|未(?:能|成功)?|没有|无法|不能|失败|被(?:阻止|拦截|拒绝)|待确认|需要确认|尚未)/i;
    return response
        .split(/[。！？!?；;，,\r\n]+/)
        .map((clause) => clause.trim())
        .filter(Boolean)
        .some((clause) => ((mutationPositive.test(clause) && fileSubject.test(clause))
        || explicitFileCompletion.test(clause)) && !negative.test(clause));
}
