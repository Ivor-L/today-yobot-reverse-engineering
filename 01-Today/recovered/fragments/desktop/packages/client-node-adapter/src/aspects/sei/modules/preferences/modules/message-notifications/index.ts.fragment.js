// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/message-notifications/index.ts.
// The original TypeScript and import graph are not restored.








class MessageNotificationsPreference extends PreferenceShellItem {
    get writable() {
        return true;
    }
    async loadValue() {
        await this.state.initialize();
        // 默认开启：用户没表达过意愿时，通知能力应当可用，
        // 真正的门槛交给系统授权。
        return this.state.persisted.messageNotificationsEnabled ?? true;
    }
    async setPreferenceValue(value) {
        await this.prepareValueUpdate();
        if (typeof value !== 'boolean') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The message-notifications preference must be a boolean.');
        }
        const persisted = await this.state.mutate((current)=>{
            if ((current.messageNotificationsEnabled ?? true) === value) {
                return current;
            }
            const { messageNotificationsEnabled: _previous, ...rest } = current;
            // 只持久化 false：true 是默认值，写盘只会积灰。
            if (value) {
                return rest;
            }
            return {
                ...rest,
                messageNotificationsEnabled: false
            };
        });
        if (!persisted) {
            return;
        }
        this.updateCurrentValue(persisted.messageNotificationsEnabled ?? true);
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .WellKnownPreferenceId.MessageNotificationsEnabled */"message-notifications.enabled"), this.debugOnly = false;
    }
}
__decorate([
    inject(PreferencesState),
    __metadata("design:type", typeof PreferencesState === "undefined" ? Object : PreferencesState)
], MessageNotificationsPreference.prototype, "state", void 0);
MessageNotificationsPreference = __decorate([
    injectable()
], MessageNotificationsPreference);
