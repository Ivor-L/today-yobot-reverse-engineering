import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MACOS_AGENT_BUNDLE_ID, MacOSAppUpdatePreflightError, preflightMacOSAppUpdate, } from './macos_app_update_driver.js';
export function hasPrivateStagingMode(mode) {
    return (mode & 0o777) === 0o700;
}
function preflightError(error) {
    if (error instanceof MacOSAppUpdatePreflightError) {
        const discardArtifact = error.code === 'artifact-invalid'
            || error.code === 'archive-invalid'
            || error.code === 'candidate-app-invalid';
        return { ok: false, discardArtifact, error: error.message };
    }
    return {
        ok: false,
        discardArtifact: false,
        error: 'Mac 应用更新安装前验证失败。',
    };
}
export class MacOSZipUpdateDriver {
    target = { platform: 'darwin', architecture: 'arm64', artifactType: 'zip' };
    platform;
    architecture;
    currentExecutable;
    stagingRoot;
    installWithSquirrel;
    randomUUID;
    validateStagingPermissions;
    preflight;
    constructor(dependencies) {
        this.platform = dependencies.platform ?? process.platform;
        this.architecture = dependencies.architecture ?? process.arch;
        this.currentExecutable = dependencies.currentExecutable ?? process.execPath;
        this.stagingRoot = dependencies.stagingRoot;
        this.installWithSquirrel = dependencies.installWithSquirrel;
        this.randomUUID = dependencies.randomUUID ?? crypto.randomUUID;
        this.validateStagingPermissions = dependencies.validateStagingPermissions
            ?? ((_stagingRoot, mode) => hasPrivateStagingMode(mode));
        this.preflight = dependencies.preflight
            ?? ((request) => preflightMacOSAppUpdate(request, dependencies.preflightDependencies));
    }
    async inspectEnvironment(request) {
        if (this.platform !== 'darwin' || this.architecture !== 'arm64') {
            return {
                ok: false,
                requiresElevation: false,
                error: 'Mac ZIP 自动安装仅支持 Darwin arm64。',
            };
        }
        if (request.appId !== MACOS_AGENT_BUNDLE_ID
            || !path.isAbsolute(request.downloadedFile)
            || !path.isAbsolute(this.currentExecutable)
            || !path.isAbsolute(this.stagingRoot)) {
            return {
                ok: false,
                requiresElevation: false,
                error: 'Mac ZIP 自动安装的 App 身份或本地路径无效。',
            };
        }
        return { ok: true, requiresElevation: false };
    }
    async verifyArtifact(request) {
        if (this.platform !== 'darwin' || this.architecture !== 'arm64') {
            return {
                ok: false,
                discardArtifact: false,
                error: 'Mac ZIP 自动安装仅支持 Darwin arm64。',
            };
        }
        if (request.manifest.schema_version !== 2
            || request.manifest.platform !== 'darwin'
            || request.manifest.architecture !== 'arm64'
            || request.manifest.artifact_type !== 'zip'
            || request.expectedSha512 !== request.manifest.sha512) {
            return {
                ok: false,
                discardArtifact: false,
                error: 'Mac ZIP 自动安装要求匹配的 Manifest v2。',
            };
        }
        try {
            await fs.promises.mkdir(this.stagingRoot, { recursive: true, mode: 0o700 });
            const rootStat = await fs.promises.lstat(this.stagingRoot);
            if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
                return {
                    ok: false,
                    discardArtifact: false,
                    error: 'Mac 应用更新 staging 根目录无效。',
                };
            }
            await fs.promises.chmod(this.stagingRoot, 0o700);
            const securedRootStat = await fs.promises.lstat(this.stagingRoot);
            if (!securedRootStat.isDirectory()
                || securedRootStat.isSymbolicLink()
                || !await this.validateStagingPermissions(this.stagingRoot, securedRootStat.mode)) {
                return {
                    ok: false,
                    discardArtifact: false,
                    error: 'Mac 应用更新 staging 根目录权限不是私有 0700。',
                };
            }
        }
        catch {
            return {
                ok: false,
                discardArtifact: false,
                error: 'Mac 应用更新 staging 根目录不可用。',
            };
        }
        const transactionId = this.randomUUID();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(transactionId)) {
            return {
                ok: false,
                discardArtifact: false,
                error: 'Mac 应用更新无法建立安全 transaction。',
            };
        }
        try {
            await this.preflight({
                downloadedFile: request.downloadedFile,
                stagingDirectory: path.join(this.stagingRoot, `verify-${transactionId}`),
                currentExecutable: this.currentExecutable,
                currentVersion: request.currentVersion,
                manifest: request.manifest,
            });
            return { ok: true, discardArtifact: false };
        }
        catch (error) {
            return preflightError(error);
        }
    }
    async launchInstaller(request) {
        if (this.platform !== 'darwin' || this.architecture !== 'arm64') {
            throw new Error('Mac ZIP 自动安装仅支持 Darwin arm64。');
        }
        if (request.requiresElevation)
            throw new Error('Mac ZIP 自动安装不接受 Windows elevation 流程。');
        if (!this.installWithSquirrel)
            throw new Error('Mac ZIP 自动安装尚未配置 Squirrel.Mac。');
        try {
            await this.installWithSquirrel(request.downloadedFile);
        }
        catch {
            throw new Error('Mac ZIP 自动安装无法完成原生更新交接。');
        }
        return { quitHandledByDriver: true };
    }
}
