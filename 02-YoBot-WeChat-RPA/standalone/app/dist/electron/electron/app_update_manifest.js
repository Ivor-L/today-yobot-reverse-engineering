import * as crypto from 'node:crypto';
import { versionToCode, } from './app_update_contract.js';
export const APP_UPDATE_MANIFEST_FORMAT_VERSION = 1;
export const APP_UPDATE_MANIFEST_ALGORITHM = 'Ed25519';
export const MAX_APP_UPDATE_MANIFEST_BYTES = 64 * 1024;
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
/**
 * electron-updater exposes the `files[].url` value from latest.yml in its
 * update-downloaded event. Generic feeds normally use a path relative to the
 * version feed, while signed release manifests use an absolute artifact URL.
 */
export function resolveUpdateArtifactUrl(feedUrl, artifactUrl) {
    const base = new URL(feedUrl);
    if (!base.pathname.endsWith('/'))
        base.pathname += '/';
    base.search = '';
    base.hash = '';
    return new URL(artifactUrl, base).toString();
}
function decodeBase64(value, expectedBytes) {
    if (typeof value !== 'string' || !value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
        return null;
    try {
        const decoded = Buffer.from(value, 'base64');
        if (expectedBytes !== undefined && decoded.length !== expectedBytes)
            return null;
        const normalizedInput = value.replace(/=+$/, '');
        const normalizedRoundTrip = decoded.toString('base64').replace(/=+$/, '');
        return normalizedInput === normalizedRoundTrip ? decoded : null;
    }
    catch {
        return null;
    }
}
function nonEmptyString(value, maxLength) {
    return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}
function numericVersion(value) {
    if (typeof value !== 'string' || !/^\d+(?:\.\d+){1,3}$/.test(value))
        return null;
    const parts = value.split('.').map(Number);
    return parts.every((part) => Number.isSafeInteger(part)) ? parts : null;
}
function artifactExtensionMatches(payload) {
    let pathname;
    try {
        pathname = new URL(payload.artifact_url).pathname.toLowerCase();
    }
    catch {
        return false;
    }
    return payload.artifact_type === 'zip' ? pathname.endsWith('.zip') : pathname.endsWith('.exe');
}
export function parseTrustedAppUpdateKeys(raw) {
    const keys = new Map();
    for (const entry of String(raw || '').split(';').map((item) => item.trim()).filter(Boolean)) {
        const separator = entry.indexOf(':');
        if (separator <= 0)
            throw new Error('更新公钥配置格式无效，应为 key_id:SPKI_BASE64');
        const keyId = entry.slice(0, separator).trim();
        const encoded = entry.slice(separator + 1).trim();
        if (!/^[a-z0-9._-]{1,64}$/i.test(keyId))
            throw new Error(`更新公钥 key_id 无效：${keyId}`);
        if (keys.has(keyId))
            throw new Error(`更新公钥 key_id 重复：${keyId}`);
        const der = decodeBase64(encoded);
        if (!der)
            throw new Error(`更新公钥不是有效 Base64：${keyId}`);
        let key;
        try {
            key = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
        }
        catch {
            throw new Error(`更新公钥不是有效 SPKI：${keyId}`);
        }
        if (key.asymmetricKeyType !== 'ed25519')
            throw new Error(`更新公钥不是 Ed25519：${keyId}`);
        keys.set(keyId, key);
    }
    return keys;
}
export function verifySignedAppUpdateManifest(input, trustedKeys, expected) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('更新发布清单格式无效');
    const envelope = input;
    if (envelope.format_version !== APP_UPDATE_MANIFEST_FORMAT_VERSION
        || envelope.algorithm !== APP_UPDATE_MANIFEST_ALGORITHM) {
        throw new Error('更新发布清单版本或签名算法不受支持');
    }
    if (!nonEmptyString(envelope.key_id, 64))
        throw new Error('更新发布清单缺少 key_id');
    const trustedKey = trustedKeys.get(envelope.key_id);
    if (!trustedKey)
        throw new Error(`更新发布清单使用了不受信任的密钥：${envelope.key_id}`);
    const payloadBytes = decodeBase64(envelope.payload);
    const signature = decodeBase64(envelope.signature, 64);
    if (!payloadBytes || payloadBytes.length === 0 || payloadBytes.length > MAX_APP_UPDATE_MANIFEST_BYTES) {
        throw new Error('更新发布清单 payload 无效或过大');
    }
    if (!signature || !crypto.verify(null, payloadBytes, trustedKey, signature)) {
        throw new Error('更新发布清单 Ed25519 签名无效');
    }
    let payload;
    try {
        payload = JSON.parse(payloadBytes.toString('utf8'));
    }
    catch {
        throw new Error('更新发布清单 payload 不是有效 JSON');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)
        || (payload.schema_version !== 1 && payload.schema_version !== 2)) {
        throw new Error('更新发布清单 payload 版本无效');
    }
    if (!nonEmptyString(payload.channel_id, 64) || !/^[a-z0-9_-]+$/i.test(payload.channel_id)) {
        throw new Error('更新发布清单 channel_id 无效');
    }
    if (!nonEmptyString(payload.app_id, 200)
        || !nonEmptyString(payload.version, 64)
        || !Number.isSafeInteger(payload.version_code)
        || Number(payload.version_code) <= 0
        || versionToCode(payload.version) !== payload.version_code) {
        throw new Error('更新发布清单版本信息无效');
    }
    if (!nonEmptyString(payload.feed_url, 2048)
        || !nonEmptyString(payload.artifact_url, 2048)
        || !nonEmptyString(payload.sha512, 256)
        || !decodeBase64(payload.sha512, 64)
        || !Number.isSafeInteger(payload.file_size)
        || Number(payload.file_size) <= 0
        || (payload.blockmap_url !== undefined && !nonEmptyString(payload.blockmap_url, 2048))) {
        throw new Error('更新发布清单产物信息无效');
    }
    if (!nonEmptyString(payload.issued_at, 64) || !nonEmptyString(payload.expires_at, 64)) {
        throw new Error('更新发布清单缺少有效期');
    }
    const issuedAt = Date.parse(payload.issued_at);
    const expiresAt = Date.parse(payload.expires_at);
    const now = expected.now ?? Date.now();
    if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
        throw new Error('更新发布清单有效期格式无效');
    }
    if (issuedAt > now + MAX_CLOCK_SKEW_MS)
        throw new Error('更新发布清单签发时间晚于本机时间');
    if (expiresAt <= now)
        throw new Error('更新发布清单已过期');
    if (payload.channel_id !== expected.channelId
        || payload.app_id !== expected.appId
        || payload.version !== expected.version
        || payload.version_code !== expected.versionCode) {
        throw new Error('更新发布清单与当前渠道、应用或目标版本不匹配');
    }
    if (payload.schema_version === 1) {
        if (expected.target && expected.target.platform !== 'win32') {
            throw new Error('macOS 更新必须使用绑定平台和签名身份的 Manifest v2');
        }
    }
    else {
        const targetPayload = payload;
        const supportedTarget = (targetPayload.platform === 'win32'
            && targetPayload.architecture === 'x64'
            && targetPayload.artifact_type === 'nsis')
            || (targetPayload.platform === 'darwin'
                && targetPayload.architecture === 'arm64'
                && targetPayload.artifact_type === 'zip');
        if (!supportedTarget
            || !nonEmptyString(targetPayload.artifact_url, 2048)
            || !artifactExtensionMatches(targetPayload)
            || !nonEmptyString(targetPayload.bundle_id, 200)
            || !nonEmptyString(targetPayload.signing_identity, 200)
            || (targetPayload.minimum_os_version !== null
                && !numericVersion(targetPayload.minimum_os_version))) {
            throw new Error('更新发布清单平台制品或签名身份无效');
        }
        const target = targetPayload;
        if (target.bundle_id !== target.app_id) {
            throw new Error('更新发布清单 Bundle ID 与应用不匹配');
        }
        if (target.platform === 'darwin' && target.minimum_os_version === null) {
            throw new Error('macOS 更新发布清单缺少最低系统版本');
        }
        if (expected.target && (target.platform !== expected.target.platform
            || target.architecture !== expected.target.architecture
            || target.artifact_type !== expected.target.artifactType)) {
            throw new Error('更新发布清单与当前平台、架构或制品类型不匹配');
        }
        if ((expected.minimumOsVersion !== undefined
            && target.minimum_os_version !== expected.minimumOsVersion)
            || (expected.bundleId !== undefined && target.bundle_id !== expected.bundleId)
            || (expected.signingIdentity !== undefined
                && target.signing_identity !== expected.signingIdentity)) {
            throw new Error('更新发布清单与当前系统或签名身份不匹配');
        }
    }
    return {
        envelope: envelope,
        payload: payload,
    };
}
