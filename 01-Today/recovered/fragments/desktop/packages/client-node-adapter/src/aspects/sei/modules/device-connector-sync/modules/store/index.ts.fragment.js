// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/modules/store/index.ts.
// The original TypeScript and import graph are not restored.












class DeviceConnectorSyncStore {
    async readPolicy(environment, accountId) {
        const raw = await this.readJson(this.policyPath(environment, accountId));
        if (raw === undefined) {
            return undefined;
        }
        return parseDeviceConnectorSyncPolicy(raw).policy ?? undefined;
    }
    /** `undefined` 表示服务端不再下发策略：删除缓存，后续按 disabled 处理。 */ async savePolicy(environment, accountId, policy) {
        const path = this.policyPath(environment, accountId);
        if (!policy) {
            await (0,promises_namespaceObject.rm)(path, {
                force: true
            });
            return;
        }
        await this.writeAtomically(path, Buffer.from(JSON.stringify(policy), 'utf8'));
    }
    async readState(scope) {
        const raw = await this.readJson(this.scopePath(scope, 'state.json'));
        if (isCapabilityState(raw)) {
            return raw;
        }
        return {};
    }
    async saveState(scope, state) {
        await this.writeAtomically(this.scopePath(scope, 'state.json'), Buffer.from(JSON.stringify(state), 'utf8'));
    }
    /** metadata 与 body 任一缺失或损坏都是 `corrupted`：不能只凭一半重发。 */ async readPending(scope) {
        const metadataPath = this.scopePath(scope, 'pending.json');
        const bodyPath = this.scopePath(scope, 'pending.body');
        const raw = await this.readJson(metadataPath);
        let body;
        try {
            body = await (0,promises_namespaceObject.readFile)(bodyPath);
        } catch  {
            body = undefined;
        }
        if (raw === undefined && body === undefined) {
            return {
                kind: 'none'
            };
        }
        if (!isPendingUpload(raw) || body === undefined || body.length === 0) {
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, 'pending upload files are incomplete, discarded');
            await this.clearPending(scope);
            return {
                kind: 'corrupted'
            };
        }
        return {
            kind: 'pending',
            upload: raw,
            body
        };
    }
    /** body 与 metadata 都持久化成功才返回 true；任一失败就不能发（发了也无法续传）。 */ async savePending(scope, upload, body) {
        try {
            if (body) {
                await this.writeAtomically(this.scopePath(scope, 'pending.body'), body);
            }
            await this.writeAtomically(this.scopePath(scope, 'pending.json'), Buffer.from(JSON.stringify(upload), 'utf8'));
            return true;
        } catch  {
            this.logger.error(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, 'pending upload could not be persisted');
            await this.clearPending(scope);
            return false;
        }
    }
    async clearPending(scope) {
        await Promise.all([
            (0,promises_namespaceObject.rm)(this.scopePath(scope, 'pending.json'), {
                force: true
            }),
            (0,promises_namespaceObject.rm)(this.scopePath(scope, 'pending.body'), {
                force: true
            })
        ]);
    }
    /** 登出 / 换账号：清掉该账号在该环境下的全部状态。 */ async clearAccount(environment, accountId) {
        await (0,promises_namespaceObject.rm)(this.accountDirectory(environment, accountId), {
            recursive: true,
            force: true
        });
    }
    get rootPath() {
        return (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(this.preferences.settingsPath), DEVICE_CONNECTOR_SYNC_STATE_DIRECTORY_NAME);
    }
    accountDirectory(environment, accountId) {
        return (0,external_node_path_namespaceObject.join)(this.rootPath, environment, identityToken(accountId));
    }
    policyPath(environment, accountId) {
        return (0,external_node_path_namespaceObject.join)(this.accountDirectory(environment, accountId), 'policy.json');
    }
    scopePath(scope, suffix) {
        const slug = DEVICE_CONNECTOR_SYNC_CAPABILITY_SLUGS[scope.capability];
        return (0,external_node_path_namespaceObject.join)(this.accountDirectory(scope.environment, scope.accountId), `${slug}.${identityToken(scope.deviceId)}.${suffix}`);
    }
    async readJson(path) {
        let text;
        try {
            text = await (0,promises_namespaceObject.readFile)(path, 'utf8');
        } catch  {
            return undefined;
        }
        try {
            return JSON.parse(text);
        } catch  {
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, 'state file is not valid JSON, ignored');
            return undefined;
        }
    }
    async writeAtomically(path, data) {
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(path), {
            recursive: true,
            mode: 448
        });
        const temporaryPath = `${path}.${process.pid}.${(0,external_node_crypto_namespaceObject.randomUUID)()}.tmp`;
        try {
            await (0,promises_namespaceObject.writeFile)(temporaryPath, data, {
                mode: 384
            });
            await (0,promises_namespaceObject.rename)(temporaryPath, path);
        } catch (error) {
            await (0,promises_namespaceObject.rm)(temporaryPath, {
                force: true
            });
            throw error;
        }
    }
}
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], DeviceConnectorSyncStore.prototype, "preferences", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], DeviceConnectorSyncStore.prototype, "logger", void 0);
DeviceConnectorSyncStore = __decorate([
    injectable()
], DeviceConnectorSyncStore);
