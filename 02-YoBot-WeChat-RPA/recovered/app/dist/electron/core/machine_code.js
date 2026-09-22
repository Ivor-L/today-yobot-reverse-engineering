import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'node:child_process';
const MACOS_MACHINE_CODE_NAMESPACE = 'yoko-rpa-device/mac/v1\0';
const MACOS_PLATFORM_UUID_PATTERN = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
const MACOS_PLATFORM_UUID_LINE = /"IOPlatformUUID"\s*=\s*"([0-9A-Fa-f-]+)"/;
let cachedMacOSMachineCode = null;
function formatMachineCode(hex) {
    return (hex.match(/.{1,4}/g) || [hex]).join('-');
}
/**
 * Parse the physical/virtual Mac identity exposed by IOKit. Hostname, network,
 * user account and application files are deliberately excluded: none of them
 * identifies the Mac reliably enough for a device-bound entitlement.
 */
export function parseMacOSPlatformUUID(ioregOutput) {
    const match = MACOS_PLATFORM_UUID_LINE.exec(ioregOutput);
    const uuid = match?.[1]?.toUpperCase();
    if (!uuid || !MACOS_PLATFORM_UUID_PATTERN.test(uuid)) {
        throw new Error('macOS platform identity is unavailable');
    }
    return uuid;
}
/** The raw IOPlatformUUID never leaves this module; only its namespaced digest does. */
export function deriveMacOSMachineCode(platformUuid) {
    const normalized = platformUuid.toUpperCase();
    if (!MACOS_PLATFORM_UUID_PATTERN.test(normalized)) {
        throw new Error('macOS platform identity is invalid');
    }
    const hex = crypto
        .createHash('sha256')
        .update(`${MACOS_MACHINE_CODE_NAMESPACE}${normalized}`, 'utf8')
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();
    return formatMachineCode(hex);
}
function getMacOSMachineCode() {
    if (cachedMacOSMachineCode)
        return cachedMacOSMachineCode;
    let output;
    try {
        output = execFileSync('/usr/sbin/ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8', timeout: 3_000, maxBuffer: 1024 * 1024 });
    }
    catch {
        throw new Error('macOS platform identity is unavailable');
    }
    cachedMacOSMachineCode = deriveMacOSMachineCode(parseMacOSPlatformUUID(output));
    return cachedMacOSMachineCode;
}
/**
 * 本机机器码。
 *
 * Windows 保持生产算法：sha256(f"{node}-{processor}-{machine}")。
 * macOS 使用 namespaced IOPlatformUUID digest；不得退回 hostname 或随机值，
 * 以保证更新、替换 App、修改主机名和网络后设备绑定不漂移。
 *   node      = os.hostname()                                        (== Python platform.uname().node)
 *   machine   = %PROCESSOR_ARCHITEW6432% || %PROCESSOR_ARCHITECTURE% (== uname().machine on Windows)
 *   processor = %PROCESSOR_IDENTIFIER% || machine                    (== uname().processor on Windows)
 *
 * 这个值同时被三方使用：RPA 插件的席位绑定、客户端的激活状态查询、
 * 以及 Entitlement Bundle 的设备绑定（docs/ENTITLEMENT_BUNDLE.md §3）。
 * 三边必须逐字符一致，所以实现只能有这一份——不要在别处重新写一遍。
 */
export function getMachineCode() {
    if (process.platform === 'darwin')
        return getMacOSMachineCode();
    const node = os.hostname();
    const machine = process.env.PROCESSOR_ARCHITEW6432 || process.env.PROCESSOR_ARCHITECTURE || '';
    const processor = process.env.PROCESSOR_IDENTIFIER || machine;
    const machineInfo = `${node}-${processor}-${machine}`;
    const hex = crypto.createHash('sha256').update(machineInfo, 'utf8').digest('hex').slice(0, 16).toUpperCase();
    return formatMachineCode(hex);
}
