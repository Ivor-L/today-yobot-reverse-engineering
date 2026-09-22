async function fetchBeijingTime() {
    // 苏宁时间API（国内可靠公共时间源）
    try {
        const resp = await fetch('http://quan.suning.com/getSysTime.do', {
            signal: AbortSignal.timeout(3000)
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.sysTime2)
                return data.sysTime2; // "2026-05-05 21:00:00"
        }
    }
    catch { }
    // 备用：系统时间 + Asia/Shanghai 时区格式化
    return new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
}
export const utilitySkill = {
    name: 'utility',
    description: '通用基础工具集。',
    tools: [
        {
            definition: {
                name: 'get_current_time',
                description: '获取北京实时精确时间（精确到秒）。仅在以下场景调用：(1)用户明确询问当前时间；(2)需要精确时间戳的定时/计划任务；(3)记录事件的准确发生时刻。一般性对话、仅需大致日期或星期时，直接使用系统上下文中的近似时间，无需调用此工具。',
                parameters: { type: 'object', properties: {}, required: [] },
                enterprise: {
                    namespace: 'utility',
                    capability: 'current_time',
                    sideEffect: 'none',
                    risk: 'low',
                    reversible: true,
                    idempotent: true,
                    approval: 'never',
                    estimatedCostClass: 'free',
                    executionMode: 'parallel',
                },
            },
            execute: async () => {
                const time = await fetchBeijingTime();
                return JSON.stringify({ beijing_time: time, timezone: 'Asia/Shanghai (UTC+8)' });
            }
        }
    ]
};
