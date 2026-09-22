// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/utils.ts.
// The original TypeScript and import graph are not restored.





// MARK: kick reason 的语义维度
/** 只有 `EKEventStoreChanged` 需要去抖。 */ const isDebouncedReason = (reason)=>{
    return reason === (/* inlined export .DeviceConnectorSyncKickReason.StoreChanged */"store-changed");
};
/** 退避中的在途请求只由到点的 retry、周期兜底、手动触发提前重发。 */ const mayRetryPendingEarly = (reason)=>{
    switch(reason){
        case (/* inlined export .DeviceConnectorSyncKickReason.Retry */"retry"):
        case (/* inlined export .DeviceConnectorSyncKickReason.BackgroundRefresh */"background-refresh"):
        case (/* inlined export .DeviceConnectorSyncKickReason.Manual */"manual"):
            return true;
        default:
            return false;
    }
};
/** 跳过每 capability 15s 的最小间隔：本地写入是「确知有变化」的信号，手动与周期兜底不该被压平。 */ const bypassesMinInterval = (reason)=>{
    switch(reason){
        case (/* inlined export .DeviceConnectorSyncKickReason.LocalWrite */"local-write"):
        case (/* inlined export .DeviceConnectorSyncKickReason.BackgroundRefresh */"background-refresh"):
        case (/* inlined export .DeviceConnectorSyncKickReason.Manual */"manual"):
            return true;
        default:
            return false;
    }
};
/** 不可重试失败后的冷却只在「外部条件确实变了」时提前解除。 */ const clearsCooldown = (reason)=>{
    switch(reason){
        case (/* inlined export .DeviceConnectorSyncKickReason.PolicyChanged */"policy-changed"):
        case (/* inlined export .DeviceConnectorSyncKickReason.SignIn */"sign-in"):
        case (/* inlined export .DeviceConnectorSyncKickReason.PermissionChanged */"permission-changed"):
        case (/* inlined export .DeviceConnectorSyncKickReason.DeviceRegistered */"device-registered"):
        case (/* inlined export .DeviceConnectorSyncKickReason.ConnectorChanged */"connector-changed"):
            return true;
        default:
            return false;
    }
};
/** 「被动」触发：本身不携带任何「数据变了」的证据，只是应用生命周期到了这一步。 */ const isPassiveReason = (reason)=>{
    switch(reason){
        case (/* inlined export .DeviceConnectorSyncKickReason.Launch */"launch"):
        case (/* inlined export .DeviceConnectorSyncKickReason.Foreground */"foreground"):
            return true;
        default:
            return false;
    }
};
const createKickIntent = (reason)=>{
    return {
        reasons: new Set([
            reason
        ])
    };
};
const mergeKickIntent = (intent, other)=>{
    return {
        reasons: new Set([
            ...intent.reasons,
            ...other.reasons
        ])
    };
};
const intentMayRetryPendingEarly = (intent)=>{
    return [
        ...intent.reasons
    ].some(mayRetryPendingEarly);
};
const intentBypassesMinInterval = (intent)=>{
    return [
        ...intent.reasons
    ].some(bypassesMinInterval);
};
const intentClearsCooldown = (intent)=>{
    return [
        ...intent.reasons
    ].some(clearsCooldown);
};
/** 排队期间只要混进一个有证据的触发，整轮就不再受被动触发的时间门约束。 */ const intentIsPassiveOnly = (intent)=>{
    return [
        ...intent.reasons
    ].every(isPassiveReason);
};
const intentLabel = (intent)=>{
    return [
        ...intent.reasons
    ].sort().join('+');
};
// MARK: key 的字节语义
/** key 按 UTF-8 字节比较与排序，不走 Unicode 规范等价（`café` 的两种形态是两条不同的事实）。 */ const compareKeyBytes = (left, right)=>{
    return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
};
/** 去重用的字节身份；`Set<Buffer>` 按对象身份比较，不能直接用。 */ const keyByteIdentity = (key)=>{
    return Buffer.from(key, 'utf8').toString('base64');
};
// MARK: canonical JSON 与指纹
const canonicalize = (value)=>{
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }
    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value).sort(([left], [right])=>{
            return compareKeyBytes(left, right);
        });
        const result = {};
        for (const [key, entry] of entries){
            result[key] = canonicalize(entry);
        }
        return result;
    }
    return value;
};
/** 递归按 key 排序后序列化：同一集合每次编码字节一致，重试时按契约原样重发。 */ const canonicalJson = (value)=>{
    return JSON.stringify(canonicalize(value));
};
const fingerprintOf = (data)=>{
    return (0,external_node_crypto_namespaceObject.createHash)('sha256').update(data).digest('base64url');
};
// MARK: 策略解析
const utils_isInteger = (value)=>{
    return typeof value === 'number' && Number.isInteger(value);
};
const parseCapabilityPolicy = (value)=>{
    if (value === null || typeof value !== 'object') {
        return null;
    }
    const record = value;
    const { pastDays, futureDays, incrementalIntervalSeconds, fullSnapshotIntervalSeconds } = record;
    if (!utils_isInteger(pastDays) || !utils_isInteger(futureDays) || !utils_isInteger(incrementalIntervalSeconds) || !utils_isInteger(fullSnapshotIntervalSeconds)) {
        return null;
    }
    // 数值越界的 capability 整条丢弃：0 天窗口会静默上传空快照并触发服务端删除。
    if (pastDays < 0 || pastDays > (/* inlined export .DEVICE_CONNECTOR_SYNC_MAX_POLICY_DAYS */365) || futureDays < 0 || futureDays > (/* inlined export .DEVICE_CONNECTOR_SYNC_MAX_POLICY_DAYS */365) || incrementalIntervalSeconds < (/* inlined export .DEVICE_CONNECTOR_SYNC_MIN_INCREMENTAL_INTERVAL_SECONDS */15) || fullSnapshotIntervalSeconds < (/* inlined export .DEVICE_CONNECTOR_SYNC_MIN_FULL_SNAPSHOT_INTERVAL_SECONDS */60)) {
        return null;
    }
    return {
        pastDays,
        futureDays,
        incrementalIntervalSeconds,
        fullSnapshotIntervalSeconds
    };
};
const isKnownCapability = (value)=>{
    return Object.values(cpi_DeviceConnectorCapability).includes(value);
};
/**
 * 解析 `/v1/config.deviceConnectorSync`。`policyVersion` / `enabled` 与服务端 zod 一样必填；单个
 * capability 缺字段、类型不对或越界只丢该条；不认识的 capability 忽略。整份不合法返回 null。
 */ const parseDeviceConnectorSyncPolicy = (value)=>{
    if (value === null || typeof value !== 'object') {
        return {
            policy: null,
            rejected: []
        };
    }
    const record = value;
    if (!utils_isInteger(record.policyVersion) || typeof record.enabled !== 'boolean') {
        return {
            policy: null,
            rejected: []
        };
    }
    const capabilities = {};
    const rejected = [];
    const rawCapabilities = record.capabilities !== null && typeof record.capabilities === 'object' ? record.capabilities : {};
    for (const [id, raw] of Object.entries(rawCapabilities)){
        if (!isKnownCapability(id)) {
            continue;
        }
        const parsed = parseCapabilityPolicy(raw);
        if (parsed) {
            capabilities[id] = parsed;
        } else {
            rejected.push(id);
        }
    }
    return {
        policy: {
            policyVersion: record.policyVersion,
            enabled: record.enabled,
            capabilities
        },
        rejected: rejected.sort()
    };
};
const policiesEqual = (left, right)=>{
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
};
const partsFormatters = new Map();
const formatterFor = (timeZone)=>{
    let formatter = partsFormatters.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'longOffset'
        });
        partsFormatters.set(timeZone, formatter);
    }
    return formatter;
};
const parseOffsetMinutes = (label)=>{
    // `GMT`（UTC 零偏移）或 `GMT+08:00` / `GMT-03:30`。
    const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(label);
    if (!match) {
        return 0;
    }
    if (!match[1]) {
        return 0;
    }
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3]));
};
const zonedParts = (epochMs, timeZone)=>{
    const parts = formatterFor(timeZone).formatToParts(new Date(epochMs));
    const read = (type)=>{
        return parts.find((part)=>part.type === type)?.value ?? '0';
    };
    return {
        year: Number(read('year')),
        month: Number(read('month')),
        day: Number(read('day')),
        hour: Number(read('hour')),
        minute: Number(read('minute')),
        second: Number(read('second')),
        offsetMinutes: parseOffsetMinutes(read('timeZoneName'))
    };
};
const isValidTimeZone = (timeZone)=>{
    try {
        formatterFor(timeZone);
        return true;
    } catch  {
        return false;
    }
};
const utils_pad = (value, width)=>{
    return String(value).padStart(width, '0');
};
/** 秒级精度的本地 RFC 3339，永远带数字偏移（UTC 写 `+00:00`，不写 `Z`）。 */ const localIso8601 = (epochMs, timeZone)=>{
    const parts = zonedParts(epochMs, timeZone);
    const sign = parts.offsetMinutes < 0 ? '-' : '+';
    const absolute = Math.abs(parts.offsetMinutes);
    return `${utils_pad(parts.year, 4)}-${utils_pad(parts.month, 2)}-${utils_pad(parts.day, 2)}` + `T${utils_pad(parts.hour, 2)}:${utils_pad(parts.minute, 2)}:${utils_pad(parts.second, 2)}` + `${sign}${utils_pad(Math.floor(absolute / 60), 2)}:${utils_pad(absolute % 60, 2)}`;
};
const localDay = (epochMs, timeZone)=>{
    const parts = zonedParts(epochMs, timeZone);
    return `${utils_pad(parts.year, 4)}-${utils_pad(parts.month, 2)}-${utils_pad(parts.day, 2)}`;
};
/** 该时区某个自然日的零点。两次迭代收敛 DST 边界（零点不存在时取过渡后的第一个时刻）。 */ const localMidnightEpochMs = (year, month, day, timeZone)=>{
    const wallClock = Date.UTC(year, month - 1, day, 0, 0, 0);
    let guess = wallClock - zonedParts(wallClock, timeZone).offsetMinutes * 60000;
    guess = wallClock - zonedParts(guess, timeZone).offsetMinutes * 60000;
    return guess;
};
const addDays = (year, month, day, delta)=>{
    const shifted = new Date(Date.UTC(year, month - 1, day + delta));
    return [
        shifted.getUTCFullYear(),
        shifted.getUTCMonth() + 1,
        shifted.getUTCDate()
    ];
};
/**
 * 采集窗口：`start = 今天 00:00 − pastDays 天`，`end = 今天 00:00 + (futureDays + 1) 天`，按自然日加减，
 * 不能用 86,400 秒推算（DST 会让窗口漂移）。越界返回 null。
 */ const computeCoverageWindow = (policy, policyVersion, nowMs, timeZone)=>{
    if (!isValidTimeZone(timeZone)) {
        return null;
    }
    const today = zonedParts(nowMs, timeZone);
    const [startYear, startMonth, startDay] = addDays(today.year, today.month, today.day, -policy.pastDays);
    const [endYear, endMonth, endDay] = addDays(today.year, today.month, today.day, policy.futureDays + 1);
    const startEpochMs = localMidnightEpochMs(startYear, startMonth, startDay, timeZone);
    const endEpochMs = localMidnightEpochMs(endYear, endMonth, endDay, timeZone);
    if (startEpochMs >= endEpochMs || endEpochMs - startEpochMs > (/* inlined export .DEVICE_CONNECTOR_SYNC_MAX_COVERAGE_DAYS */732) * 86400000) {
        return null;
    }
    return {
        startDay: `${utils_pad(startYear, 4)}-${utils_pad(startMonth, 2)}-${utils_pad(startDay, 2)}`,
        endDay: `${utils_pad(endYear, 4)}-${utils_pad(endMonth, 2)}-${utils_pad(endDay, 2)}`,
        startEpochMs,
        endEpochMs,
        timeZone,
        pastDays: policy.pastDays,
        futureDays: policy.futureDays,
        policyVersion
    };
};
/** 影响采集集合的策略维度；变化时必须重新完整读取并上传。 */ const windowFingerprint = (window)=>{
    return `${window.pastDays}/${window.futureDays}/${window.timeZone}`;
};
const currentTimeZone = ()=>{
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
// MARK: 退避与冷却
/** 契约 §11：401 短冷却；404 / 409 长冷却等注册或配置变化；其余 4xx 1h。 */ const rejectionCooldownMs = (httpStatus)=>{
    switch(httpStatus){
        case 401:
            return (/* inlined export .DEVICE_CONNECTOR_SYNC_UNAUTHENTICATED_COOLDOWN_MS */300000);
        case 404:
        case 409:
            return DEVICE_CONNECTOR_SYNC_STOPPED_COOLDOWN_MS;
        default:
            return DEVICE_CONNECTOR_SYNC_REJECTION_COOLDOWN_MS;
    }
};
/** `min(300s, 5s·2^(n−1)) + jitter(0…5s)`，与 iOS / 原生 macOS 同一节奏。 */ const utils_retryDelayMs = (attempt, random = Math.random)=>{
    const exponent = Math.max(0, attempt - 1);
    const base = Math.min((/* inlined export .DEVICE_CONNECTOR_SYNC_RETRY_MAX_DELAY_MS */300000), (/* inlined export .DEVICE_CONNECTOR_SYNC_RETRY_BASE_DELAY_MS */5000) * 2 ** exponent);
    return Math.floor(base + random() * (/* inlined export .DEVICE_CONNECTOR_SYNC_RETRY_JITTER_MS */5000));
};
// MARK: 本地写入工具
/** `calendar.events.create` 这类 agent 写类工具执行成功后，对应 capability 立即读一遍。 */ const writeToolCapability = (capabilityId)=>{
    const segments = capabilityId.split('.');
    const verb = segments.at(-1);
    if (!verb || !DEVICE_CONNECTOR_SYNC_WRITE_TOOL_VERBS.has(verb)) {
        return null;
    }
    if (capabilityId.startsWith('calendar.')) {
        return cpi_DeviceConnectorCapability.CalendarEvents;
    }
    if (capabilityId.startsWith('reminders.')) {
        return cpi_DeviceConnectorCapability.Reminders;
    }
    return null;
};
/** 目录 / 文件名里的账号与设备身份：不落明文 id。 */ const identityToken = (value)=>{
    return (0,external_node_crypto_namespaceObject.createHash)('sha256').update(value, 'utf8').digest('hex').slice(0, 16);
};
