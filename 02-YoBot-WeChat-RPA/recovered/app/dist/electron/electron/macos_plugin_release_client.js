import { verifySignedPluginManifestV2, } from './plugin_manifest.js';
const MAX_DESCRIPTOR_BYTES = 128 * 1024;
export class MacOSPluginReleaseClientError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'MacOSPluginReleaseClientError';
        this.code = code;
    }
    toJSON() {
        return { name: this.name, code: this.code, message: this.message };
    }
}
function releaseError(code, message) {
    return new MacOSPluginReleaseClientError(code, message);
}
function exactKeys(value, expected) {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
function loopbackHost(hostname) {
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
}
function requireApiBase(value, allowLoopbackHttp) {
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        throw releaseError('MACOS_PLUGIN_RELEASE_CONFIG_INVALID', '插件发布服务地址无效');
    }
    const loopbackHttp = allowLoopbackHttp && parsed.protocol === 'http:' && loopbackHost(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !loopbackHttp) || parsed.username || parsed.password
        || parsed.search || parsed.hash) {
        throw releaseError('MACOS_PLUGIN_RELEASE_CONFIG_INVALID', '插件发布服务必须是无凭据、query 和 fragment 的 HTTPS 地址；本地测试只允许显式 loopback HTTP');
    }
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/`;
    return parsed;
}
function requireDescriptor(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw releaseError('MACOS_PLUGIN_RELEASE_DESCRIPTOR_INVALID', '插件发布 descriptor 格式无效');
    }
    const descriptor = value;
    if (!exactKeys(descriptor, [
        'schema_version',
        'plugin_name',
        'channel_id',
        'platform',
        'architecture',
        'version',
        'version_code',
        'manifest',
    ]) || descriptor.schema_version !== 2 || descriptor.plugin_name !== 'wechat-rpa'
        || descriptor.channel_id !== 'agent_generic' || descriptor.platform !== 'darwin'
        || descriptor.architecture !== 'arm64' || typeof descriptor.version !== 'string'
        || !/^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/.test(descriptor.version)
        || !Number.isSafeInteger(descriptor.version_code) || Number(descriptor.version_code) <= 0) {
        throw releaseError('MACOS_PLUGIN_RELEASE_DESCRIPTOR_INVALID', '插件发布 descriptor 与官方 macOS 目标不匹配');
    }
    return {
        schema_version: 2,
        plugin_name: 'wechat-rpa',
        channel_id: 'agent_generic',
        platform: 'darwin',
        architecture: 'arm64',
        version: descriptor.version,
        version_code: Number(descriptor.version_code),
        manifest: descriptor.manifest,
    };
}
async function readJsonResponse(response, maxBytes, code) {
    const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json')
        throw releaseError(code, '插件发布响应不是 JSON');
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw releaseError(code, '插件发布响应超过大小限制');
    }
    if (!response.body)
        throw releaseError(code, '插件发布响应缺少正文');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done)
                break;
            bytes += chunk.value.byteLength;
            if (bytes > maxBytes)
                throw releaseError(code, '插件发布响应超过大小限制');
            chunks.push(Buffer.from(chunk.value));
        }
    }
    finally {
        reader.releaseLock();
    }
    try {
        return JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'));
    }
    catch {
        throw releaseError(code, '插件发布响应不是有效 JSON');
    }
}
function requestSignal(source, timeoutMs) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (source?.aborted)
        controller.abort();
    else
        source?.addEventListener('abort', onAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    timeout.unref?.();
    return {
        signal: controller.signal,
        cleanup: () => {
            clearTimeout(timeout);
            source?.removeEventListener('abort', onAbort);
        },
    };
}
export class MacOSPluginReleaseClient {
    apiBase;
    trustedKeys;
    agentVersionCode;
    fetchFn;
    minimumOsVersion;
    runtimeContractVersion;
    requestTimeoutMs;
    now;
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw releaseError('MACOS_PLUGIN_RELEASE_CONFIG_INVALID', 'macOS 插件发布客户端只能在 Darwin 使用');
        }
        if (!Number.isSafeInteger(options.agentVersionCode) || options.agentVersionCode <= 0
            || !/^\d+(?:\.\d+){1,3}$/.test(options.minimumOsVersion ?? '13.0')
            || !/^\d+\.\d+$/.test(options.runtimeContractVersion ?? '1.0')) {
            throw releaseError('MACOS_PLUGIN_RELEASE_CONFIG_INVALID', '插件发布兼容策略无效');
        }
        const timeoutMs = options.requestTimeoutMs ?? 30_000;
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
            throw releaseError('MACOS_PLUGIN_RELEASE_CONFIG_INVALID', '插件发布请求 timeout 无效');
        }
        this.apiBase = requireApiBase(options.apiBaseUrl, options.allowLoopbackHttp === true);
        this.trustedKeys = options.trustedKeys;
        this.agentVersionCode = options.agentVersionCode;
        this.fetchFn = options.fetchFn ?? fetch;
        this.minimumOsVersion = options.minimumOsVersion ?? '13.0';
        this.runtimeContractVersion = options.runtimeContractVersion ?? '1.0';
        this.requestTimeoutMs = timeoutMs;
        this.now = options.now ?? Date.now;
    }
    async fetchJson(url, maxBytes, code, signal) {
        const ownedSignal = requestSignal(signal, this.requestTimeoutMs);
        try {
            const response = await this.fetchFn(url, {
                method: 'GET',
                headers: { Accept: 'application/json' },
                redirect: 'error',
                cache: 'no-store',
                referrerPolicy: 'no-referrer',
                signal: ownedSignal.signal,
            });
            if (response.status === 404)
                return { status: 404, body: null };
            if (!response.ok)
                throw releaseError('MACOS_PLUGIN_RELEASE_UNAVAILABLE', '插件发布服务暂不可用');
            return { status: response.status, body: await readJsonResponse(response, maxBytes, code) };
        }
        catch (error) {
            if (error instanceof MacOSPluginReleaseClientError)
                throw error;
            throw releaseError('MACOS_PLUGIN_RELEASE_UNAVAILABLE', '无法连接插件发布服务');
        }
        finally {
            ownedSignal.cleanup();
        }
    }
    async resolveLatest(signal) {
        const descriptorUrl = new URL('v1/app/plugin/version', this.apiBase);
        descriptorUrl.search = new URLSearchParams({
            name: 'wechat-rpa',
            manifest_version: '2',
            platform: 'darwin',
            architecture: 'arm64',
            channel_id: 'agent_generic',
        }).toString();
        const descriptorResponse = await this.fetchJson(descriptorUrl.toString(), MAX_DESCRIPTOR_BYTES, 'MACOS_PLUGIN_RELEASE_DESCRIPTOR_INVALID', signal);
        if (descriptorResponse.status === 404)
            return null;
        const descriptor = requireDescriptor(descriptorResponse.body);
        let verifiedManifest;
        try {
            verifiedManifest = verifySignedPluginManifestV2(descriptor.manifest, this.trustedKeys, {
                pluginName: descriptor.plugin_name,
                channelId: descriptor.channel_id,
                platform: descriptor.platform,
                architecture: descriptor.architecture,
                version: descriptor.version,
                versionCode: descriptor.version_code,
                runtimeContractVersion: this.runtimeContractVersion,
                minimumOsVersion: this.minimumOsVersion,
                agentVersionCode: this.agentVersionCode,
                now: this.now(),
            });
        }
        catch {
            throw releaseError('MACOS_PLUGIN_RELEASE_MANIFEST_INVALID', '签名插件清单未通过目标、兼容性或 Ed25519 验证');
        }
        return { descriptor, verifiedManifest };
    }
}
