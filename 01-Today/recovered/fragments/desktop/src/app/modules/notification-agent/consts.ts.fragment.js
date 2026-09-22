// Compiled fragment from ./src/app/modules/notification-agent/consts.ts.
// The original TypeScript and import graph are not restored.

/** 打进 `Contents/MacOS` 的通知系统代理可执行文件名，与 build-macos-tools.mjs 一致。 */ const NOTIFICATION_AGENT_EXECUTABLE_NAME = 'today-notification-agent';
/** 代理的清角标模式参数，与 `TodayNotificationAgentProcess/main.swift` 的契约一致。 */ const NOTIFICATION_AGENT_CLEAR_BADGE_FLAG = '--clear-badge';
/**
 * 父进程侧超时。代理内部有 5 秒超时，但只在它跑到 main 之后才生效——
 * dyld 阶段挂住（签名 / 公证问题、损坏的二进制）时子进程永远不退出。
 */ const NOTIFICATION_AGENT_TIMEOUT_MS = 8000;
