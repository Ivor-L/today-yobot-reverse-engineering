/**
 * 只识别“明确的纯查询/诊断”，不再用动作关键词白名单给自然语言发通行证。
 *
 * 这是一个保守的防误写护栏，不是意图分类器：
 * - 只要出现任何改变任务的迹象，就交给 Agent 继续理解；
 * - 没有匹配到已知表达时也默认放行；
 * - 仅当消息同时具有查询/诊断意图且完全没有改变意图时，才禁止写操作。
 *
 * 真正的写入安全由 job_detail、expected_revision/CAS、参数校验和原子持久化负责。
 */
export function isClearlyReadOnlyCronRequest(text) {
    const input = String(text ?? "").trim().toLowerCase();
    if (!input)
        return false;
    // 这里故意使用宽泛、与具体 action 无关的信号。命中任一信号就不在文本层阻断，
    // 以支持“挪到九点半”“以后别发这段”“按刚才说的处理”等自然表达。
    const mayChangeTask = /(?:创建|新建|新增|添加|安排|设置|设为|提醒我|通知我|发给我|改|调整|调到|挪|移到|提前|延后|推迟|换|更新|编辑|处理|修|去掉|去除|不要|别再|停止|停掉|暂停|恢复|继续|启用|开启|重开|删除|删掉|移除|取消|清空|只保留|必须|以后|从.+开始|照.+做|按.+做|create|add|schedule|remind|update|edit|change|adjust|move|reschedule|fix|remove|without|pause|stop|disable|resume|enable|restart|delete|cancel)/i;
    if (mayChangeTask.test(input))
        return false;
    const asksToInspect = /(?:查一下|查询|查看|看看|看下|帮我看|检查|核对|排查|分析|诊断|解释|说明一下|告诉我|列出|详情|记录|日志|状态|几点(?:执行|运行|发送|开始)?|什么时候(?:执行|运行|发送|开始)?|执行了吗|运行了吗|跑了吗|发了吗|有没有执行|是否执行|why|what happened|status|history|logs?|check|inspect|diagnos|explain|show|list)/i;
    const asksWhy = /(?:为什么|为何|怎么回事|什么原因|原因是什么|为啥|why)/i;
    return asksToInspect.test(input) || asksWhy.test(input);
}
export function cronReadOnlyMutationError(action) {
    return `Error: 当前用户消息明确表达的是查询或诊断，因此未执行 ${action} 定时任务。` +
        "本轮只允许使用 list/job_detail/runs/run_detail；如果用户同时要求修复或调整，请依据原话继续执行相应写操作。";
}
