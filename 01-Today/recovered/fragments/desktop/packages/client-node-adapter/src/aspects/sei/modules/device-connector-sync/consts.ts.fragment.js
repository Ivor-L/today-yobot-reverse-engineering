// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/consts.ts.
// The original TypeScript and import graph are not restored.


/** 日志 category；PII 规则：只记 capability 短名、计数、字节数、HTTP 状态、错误 case。 */ const DEVICE_CONNECTOR_SYNC_LOG_CATEGORY = 'device-connector-sync';
/** 本地状态目录名（与 `settingsPath` 同级）。 */ const DEVICE_CONNECTOR_SYNC_STATE_DIRECTORY_NAME = 'device-connector-sync';
const DEVICE_CONNECTOR_SYNC_UPLOAD_PATH = '/data/v1/device-connectors/sync';
const DEVICE_CONNECTOR_SYNC_CONFIG_PATH = '/v1/config';
/** 契约限额：超限不截断、不上传。 */ const DEVICE_CONNECTOR_SYNC_MAX_ITEMS = 2000;
/** wire body 上限 5 MiB（未压缩 JSON）。 */ const DEVICE_CONNECTOR_SYNC_MAX_BODY_BYTES = 5 * 1024 * 1024;
/** 策略里 pastDays / futureDays 的合法范围（服务端 zod 上限）。 */ const DEVICE_CONNECTOR_SYNC_MAX_POLICY_DAYS = 365;
/** coverage 总长度上限（服务端 `maxCoverage`）。 */ const DEVICE_CONNECTOR_SYNC_MAX_COVERAGE_DAYS = 732;
const DEVICE_CONNECTOR_SYNC_MIN_INCREMENTAL_INTERVAL_SECONDS = 15;
const DEVICE_CONNECTOR_SYNC_MIN_FULL_SNAPSHOT_INTERVAL_SECONDS = 60;
/** `EKEventStoreChanged` 成批到达（一次 iCloud 同步可能连发几十条），去抖后再读。 */ const DEVICE_CONNECTOR_SYNC_STORE_CHANGED_DEBOUNCE_MS = 2000;
/** 同一 capability 两轮之间的最小间隔，只为压平成批到达的变化通知。 */ const DEVICE_CONNECTOR_SYNC_MIN_RUN_INTERVAL_MS = 15000;
/** interval 定时器在「从未成功 / 已经逾期」时的下限，防退化成分钟级紧循环。 */ const DEVICE_CONNECTOR_SYNC_OVERDUE_INTERVAL_KICK_MS = 15 * 60000;
/** 周期兜底唤醒（对齐 iOS BGAppRefresh 的 15 分钟 earliest）。 */ const DEVICE_CONNECTOR_SYNC_PERIODIC_WAKE_INTERVAL_MS = 15 * 60000;
/** 周期 tick 之间墙钟漂移超过这么多视同睡醒：先刷策略再重算窗口。 */ const DEVICE_CONNECTOR_SYNC_WAKE_DRIFT_MS = 5 * 60000;
/** 策略刷新的最小间隔。 */ const DEVICE_CONNECTOR_SYNC_POLICY_REFRESH_INTERVAL_MS = 60 * 60000;
/** 上传请求整体 deadline（含读 body）。 */ const DEVICE_CONNECTOR_SYNC_UPLOAD_TIMEOUT_MS = 60000;
/** 策略请求 deadline。 */ const DEVICE_CONNECTOR_SYNC_POLICY_TIMEOUT_MS = 15000;
/** 超过这个次数后不再自动起 retry 定时器，只跟随自然触发重发；body 仍保留。 */ const DEVICE_CONNECTOR_SYNC_MAX_TIMED_RETRY_ATTEMPTS = 6;
/** 退避：`min(300s, 5s·2^(n−1)) + jitter(0…5s)`，与 iOS `retryDelay(attempts:)` 同一节奏。 */ const DEVICE_CONNECTOR_SYNC_RETRY_BASE_DELAY_MS = 5000;
const DEVICE_CONNECTOR_SYNC_RETRY_MAX_DELAY_MS = 300000;
const DEVICE_CONNECTOR_SYNC_RETRY_JITTER_MS = 5000;
/** 结果未知的 body 最多保留这么久；之后丢弃并冷却。 */ const DEVICE_CONNECTOR_SYNC_MAX_PENDING_AGE_MS = 48 * 60 * 60000;
const DEVICE_CONNECTOR_SYNC_ABANDONED_PENDING_COOLDOWN_MS = 10 * 60000;
const DEVICE_CONNECTOR_SYNC_REJECTION_COOLDOWN_MS = 60 * 60000;
const DEVICE_CONNECTOR_SYNC_UNAUTHENTICATED_COOLDOWN_MS = 5 * 60000;
/** 404（设备不在 registry）/ 409（capability 未启用）：等注册或配置变化，24h 兜底自愈。 */ const DEVICE_CONNECTOR_SYNC_STOPPED_COOLDOWN_MS = 24 * 60 * 60000;
/** 登出时最多等在跑轮次这么久，然后再删目录。 */ const DEVICE_CONNECTOR_SYNC_SIGN_OUT_DRAIN_MS = 5000;
/** Permissions 模块里对应的权限 id。 */ const DEVICE_CONNECTOR_SYNC_PERMISSION_IDS = {
    [cpi_DeviceConnectorCapability.CalendarEvents]: 'apple_calendar',
    [cpi_DeviceConnectorCapability.Reminders]: 'apple_reminders'
};
/**
 * 产品连接器 id（`tools.setAuthorization` 的 `connectorIds`）。服务端按设备已发布的 connector 判定
 * capability 是否启用（未启用上传 409），所以未连接的 connector 不读不传。
 */ const DEVICE_CONNECTOR_SYNC_CONNECTOR_IDS = {
    [cpi_DeviceConnectorCapability.CalendarEvents]: 'apple_calendar',
    [cpi_DeviceConnectorCapability.Reminders]: 'apple_reminders'
};
/** 本地文件名里的 capability 短名。 */ const DEVICE_CONNECTOR_SYNC_CAPABILITY_SLUGS = {
    [cpi_DeviceConnectorCapability.CalendarEvents]: 'calendar-events',
    [cpi_DeviceConnectorCapability.Reminders]: 'reminders'
};
/** agent 写类工具的 capabilityId 后缀；执行成功即刻读一遍（`localWrite`）。 */ const DEVICE_CONNECTOR_SYNC_WRITE_TOOL_VERBS = new Set([
    'create',
    'update',
    'delete',
    'complete',
    'uncomplete'
]);
