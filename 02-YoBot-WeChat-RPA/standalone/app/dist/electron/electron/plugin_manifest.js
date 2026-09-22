import * as crypto from 'node:crypto';
import { versionToCode } from './app_update_contract.js';
export const PLUGIN_MANIFEST_FORMAT_VERSION = 2;
export const PLUGIN_MANIFEST_ALGORITHM = 'Ed25519';
export const MAX_PLUGIN_MANIFEST_BYTES = 64 * 1024;
export const MAX_PLUGIN_ARTIFACT_BYTES = 8 * 1024 * 1024 * 1024;
export const RPA_MACOS_CONTROL_BUNDLE_ID = 'com.yokowebot.rpa-control';
export const RPA_MACOS_HELPER_BUNDLE_ID = 'com.yokowebot.rpa-helper';
export const RPA_MACOS_TEAM_ID = '2M27ML4PY2';
export const RPA_MACOS_BUNDLE_NAME = 'YokoWebot RPA Control.app';
export const RPA_MACOS_HELPER_RELATIVE_PATH = 'Contents/Helpers/YokoRpaDistributionHelper.app';
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
function decodeBase64(value, expectedBytes) {
    if (typeof value !== 'string' || !value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
        return null;
    try {
        const decoded = Buffer.from(value, 'base64');
        if (expectedBytes !== undefined && decoded.length !== expectedBytes)
            return null;
        return decoded.toString('base64').replace(/=+$/, '') === value.replace(/=+$/, '') ? decoded : null;
    }
    catch {
        return null;
    }
}
function stringValue(value, maxLength, pattern) {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= maxLength
        && (!pattern || pattern.test(value));
}
function exactKeys(value, expected) {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
export function parseTrustedPluginManifestKeys(raw) {
    const keys = new Map();
    for (const entry of String(raw || '').split(';').map((item) => item.trim()).filter(Boolean)) {
        const separator = entry.indexOf(':');
        if (separator <= 0)
            throw new Error('插件清单公钥格式无效，应为 key_id:SPKI_BASE64');
        const keyId = entry.slice(0, separator).trim();
        const encoded = entry.slice(separator + 1).trim();
        if (!/^[a-z0-9._-]{1,64}$/i.test(keyId))
            throw new Error(`插件清单 key_id 无效：${keyId}`);
        if (keys.has(keyId))
            throw new Error(`插件清单 key_id 重复：${keyId}`);
        const der = decodeBase64(encoded);
        if (!der)
            throw new Error(`插件清单公钥不是有效 Base64：${keyId}`);
        let key;
        try {
            key = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
        }
        catch {
            throw new Error(`插件清单公钥不是有效 SPKI：${keyId}`);
        }
        if (key.asymmetricKeyType !== 'ed25519')
            throw new Error(`插件清单公钥不是 Ed25519：${keyId}`);
        keys.set(keyId, key);
    }
    return keys;
}
function validateMacOSIdentity(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Mac 插件清单缺少制品身份');
    const identity = value;
    if (!exactKeys(identity, [
        'control_bundle_identifier',
        'helper_bundle_identifier',
        'team_identifier',
        'control_bundle_version',
        'helper_bundle_version',
        'build_channel',
        'capability_wave',
        'bundle_name',
        'helper_relative_path',
    ]))
        throw new Error('Mac 插件制品身份字段无效');
    if (identity.control_bundle_identifier !== RPA_MACOS_CONTROL_BUNDLE_ID
        || identity.helper_bundle_identifier !== RPA_MACOS_HELPER_BUNDLE_ID
        || identity.team_identifier !== RPA_MACOS_TEAM_ID
        || identity.build_channel !== 'production'
        || identity.capability_wave !== 'none'
        || identity.bundle_name !== RPA_MACOS_BUNDLE_NAME
        || identity.helper_relative_path !== RPA_MACOS_HELPER_RELATIVE_PATH
        || !stringValue(identity.control_bundle_version, 64, /^[A-Za-z0-9][A-Za-z0-9.-]*$/)
        || !stringValue(identity.helper_bundle_version, 64, /^[A-Za-z0-9][A-Za-z0-9.-]*$/)) {
        throw new Error('Mac 插件制品身份与 YokoWebot 产品策略不匹配');
    }
    return identity;
}
export function verifySignedPluginManifestV2(input, trustedKeys, expected) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('插件发布清单格式无效');
    const envelope = input;
    if (!exactKeys(envelope, ['format_version', 'algorithm', 'key_id', 'payload', 'signature'])
        || envelope.format_version !== PLUGIN_MANIFEST_FORMAT_VERSION
        || envelope.algorithm !== PLUGIN_MANIFEST_ALGORITHM
        || !stringValue(envelope.key_id, 64, /^[a-z0-9._-]+$/i)) {
        throw new Error('插件发布清单 envelope 无效');
    }
    const trustedKey = trustedKeys.get(envelope.key_id);
    if (!trustedKey)
        throw new Error(`插件发布清单使用了不受信任的密钥：${envelope.key_id}`);
    const payloadBytes = decodeBase64(envelope.payload);
    const signature = decodeBase64(envelope.signature, 64);
    if (!payloadBytes || payloadBytes.length === 0 || payloadBytes.length > MAX_PLUGIN_MANIFEST_BYTES) {
        throw new Error('插件发布清单 payload 无效或过大');
    }
    if (!signature || !crypto.verify(null, payloadBytes, trustedKey, signature)) {
        throw new Error('插件发布清单 Ed25519 签名无效');
    }
    let rawPayload;
    try {
        rawPayload = JSON.parse(payloadBytes.toString('utf8'));
    }
    catch {
        throw new Error('插件发布清单 payload 不是有效 JSON');
    }
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
        throw new Error('插件发布清单 payload 格式无效');
    }
    const payload = rawPayload;
    const commonKeys = [
        'schema_version', 'plugin_name', 'channel_id', 'platform', 'architecture',
        'version', 'version_code', 'artifact_url', 'artifact_sha256', 'artifact_size_bytes',
        'archive_format', 'artifact_type', 'entrypoint', 'minimum_agent_version', 'minimum_agent_version_code',
        'minimum_os_version', 'runtime_contract_version', 'release_status', 'issued_at', 'expires_at',
    ];
    const expectedKeys = payload.platform === 'darwin' ? [...commonKeys, 'macos_identity'] : commonKeys;
    if (!exactKeys(payload, expectedKeys) || payload.schema_version !== 2) {
        throw new Error('插件发布清单 payload 字段无效');
    }
    if (!stringValue(payload.plugin_name, 64, /^[a-z0-9][a-z0-9._-]*$/i)
        || !stringValue(payload.channel_id, 64, /^[a-z0-9][a-z0-9._-]*$/i)
        || (payload.platform !== 'win32' && payload.platform !== 'darwin')
        || (payload.architecture !== 'x64' && payload.architecture !== 'arm64')
        || (payload.platform === 'darwin' && payload.architecture !== 'arm64')
        || (payload.platform === 'win32' && payload.architecture !== 'x64')
        || !stringValue(payload.version, 64, /^[A-Za-z0-9][A-Za-z0-9.+-]*$/)
        || !Number.isSafeInteger(payload.version_code)
        || Number(payload.version_code) <= 0) {
        throw new Error('插件发布清单目标或版本信息无效');
    }
    if (!stringValue(payload.artifact_sha256, 64, /^[a-f0-9]{64}$/)
        || !Number.isSafeInteger(payload.artifact_size_bytes)
        || Number(payload.artifact_size_bytes) <= 0
        || Number(payload.artifact_size_bytes) > MAX_PLUGIN_ARTIFACT_BYTES
        || payload.archive_format !== 'zip'
        || (payload.artifact_type !== 'macos-app-bundle' && payload.artifact_type !== 'windows-service-bundle')) {
        throw new Error('插件发布清单制品摘要无效');
    }
    if (!stringValue(payload.artifact_url, 2048))
        throw new Error('插件发布清单制品 URL 无效');
    let artifactUrl;
    try {
        artifactUrl = new URL(payload.artifact_url);
    }
    catch {
        throw new Error('插件发布清单制品 URL 无效');
    }
    if (artifactUrl.protocol !== 'https:' || artifactUrl.username || artifactUrl.password
        || artifactUrl.search || artifactUrl.hash || !artifactUrl.pathname.toLowerCase().endsWith('.zip')) {
        throw new Error('插件发布制品必须使用无凭据、query、fragment 的 HTTPS ZIP URL');
    }
    if (!stringValue(payload.minimum_agent_version, 64, /^\d+\.\d+\.\d+(?:[.+-][A-Za-z0-9.-]+)?$/)
        || !Number.isSafeInteger(payload.minimum_agent_version_code)
        || payload.minimum_agent_version_code !== versionToCode(payload.minimum_agent_version)
        || !stringValue(payload.minimum_os_version, 32, /^\d+(?:\.\d+){1,3}$/)
        || !stringValue(payload.runtime_contract_version, 32, /^\d+\.\d+$/)) {
        throw new Error('插件发布清单 Agent/Runtime 兼容信息无效');
    }
    if (!Number.isSafeInteger(expected.agentVersionCode) || expected.agentVersionCode <= 0
        || expected.agentVersionCode < payload.minimum_agent_version_code) {
        throw new Error('当前 Agent 版本低于插件发布清单要求');
    }
    if (!stringValue(payload.issued_at, 64) || !stringValue(payload.expires_at, 64)) {
        throw new Error('插件发布清单缺少有效期');
    }
    const issuedAt = Date.parse(payload.issued_at);
    const expiresAt = Date.parse(payload.expires_at);
    const now = expected.now ?? Date.now();
    if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
        throw new Error('插件发布清单有效期格式无效');
    }
    if (issuedAt > now + MAX_CLOCK_SKEW_MS)
        throw new Error('插件发布清单签发时间晚于本机时间');
    if (expiresAt <= now)
        throw new Error('插件发布清单已过期');
    if (payload.plugin_name !== expected.pluginName
        || payload.channel_id !== expected.channelId
        || payload.platform !== expected.platform
        || payload.architecture !== expected.architecture
        || payload.version !== expected.version
        || payload.version_code !== expected.versionCode
        || payload.runtime_contract_version !== expected.runtimeContractVersion
        || payload.minimum_os_version !== expected.minimumOsVersion
        || payload.release_status !== 'active') {
        throw new Error('插件发布清单与请求的插件、渠道、平台、架构或版本不匹配');
    }
    if (payload.platform === 'darwin') {
        if (payload.artifact_type !== 'macos-app-bundle' || payload.entrypoint !== RPA_MACOS_BUNDLE_NAME) {
            throw new Error('Mac 插件类型或入口不符合产品策略');
        }
        validateMacOSIdentity(payload.macos_identity);
    }
    else {
        if (payload.artifact_type !== 'windows-service-bundle'
            || payload.entrypoint !== 'service.exe'
            || payload.macos_identity !== undefined) {
            throw new Error('Windows 插件入口或制品身份无效');
        }
    }
    return {
        envelope: envelope,
        payload: payload,
    };
}
