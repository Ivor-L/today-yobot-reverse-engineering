// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/index.ts.
// The original TypeScript and import graph are not restored.











class ShortcutsShellService extends readonly_events_ReadonlyEvents {
    registerItems() {
        for (const item of this.items){
            const { id } = item;
            if (id.trim().length === 0 || id.trim() !== id) {
                throw new Error('The shortcut ID must not be empty.');
            }
            if (this.itemsById.has(id)) {
                throw new Error(`The shortcut ID "${id}" is registered more than once.`);
            }
            this.itemsById.set(id, item);
        }
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        if (this.initialization) {
            await this.initialization;
            return;
        }
        const initialization = this.load();
        this.initialization = initialization;
        try {
            await initialization;
        } finally{
            if (this.initialization === initialization) {
                this.initialization = undefined;
            }
        }
    }
    async listShortcuts() {
        await this.initialize();
        return Object.freeze(this.items.map((item)=>{
            const registered = this.registrationsById.get(item.id);
            if (!registered) {
                throw new Error(`The shortcut "${item.id}" is not initialized.`);
            }
            return registered.info;
        }));
    }
    async setShortcutBinding(params) {
        if (typeof params !== 'object' || params === null || Array.isArray(params)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The shortcut update is invalid.');
        }
        if (!utils_hasOnlyKeys(params, [
            'shortcutId',
            'binding'
        ])) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The shortcut update is invalid.');
        }
        const { shortcutId, binding } = params;
        if (typeof shortcutId !== 'string' || shortcutId.trim().length === 0 || shortcutId.trim() !== shortcutId) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The shortcut ID is invalid.');
        }
        if (binding !== null && (typeof binding !== 'object' || Array.isArray(binding))) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The shortcut binding is invalid.');
        }
        await this.initialize();
        const normalizedBinding = binding === null ? null : normalizeShortcutBinding(binding);
        const previous = this.mutation;
        const next = this.runBindingMutation(previous, shortcutId, normalizedBinding);
        this.mutation = next;
        await next;
    }
    async runBindingMutation(previous, shortcutId, binding) {
        try {
            await previous;
        } catch  {
        // A failed mutation must not poison the serial queue.
        }
        await this.updateBinding(shortcutId, binding);
    }
    async load() {
        await this.state.initialize();
        const platform = await this.runtime.getPlatform();
        await this.applyLegacyMigration(platform);
        const loaded = new Map();
        try {
            for (const item of this.items){
                const enabled = item.isEnabled(platform);
                const binding = this.resolveBinding(item, platform, enabled);
                const hasInternalConflict = this.hasBindingConflict(item.id, binding, loaded);
                const registrationToken = binding === null ? null : {};
                const registration = binding === null || registrationToken === null || hasInternalConflict ? null : await this.runtime.register(binding, item.scope, ()=>{
                    this.handleTriggered(item.id, registrationToken);
                });
                const info = this.createInfo(item, binding, enabled, registration !== null);
                loaded.set(item.id, {
                    item,
                    info,
                    registration,
                    registrationToken: registration === null ? null : registrationToken
                });
            }
        } catch (error) {
            for (const registered of loaded.values()){
                registered.registration?.unregister();
            }
            throw error;
        }
        for (const [id, registered] of loaded){
            this.registrationsById.set(id, registered);
        }
        this.initialized = true;
    }
    /**
   * The one-time legacy import runs before any binding is resolved, so the very first
   * registration already uses the migrated choice. A failure here must not block startup:
   * the platform default stays in effect and the migration is retried next launch.
   */ async applyLegacyMigration(platform) {
        try {
            await this.legacyMigration.apply(platform);
        } catch (error) {
            console.error('[client-node-adapter] failed to migrate the legacy Quick Chat shortcut', error);
        }
    }
    resolveBinding(item, platform, enabled) {
        if (!enabled) {
            return null;
        }
        const override = this.state.getBindingOverride(item.id);
        const binding = override.configured ? override.value : item.getDefaultBinding(platform);
        return binding === null ? null : normalizeShortcutBinding(binding);
    }
    assertBindingAvailable(shortcutId, binding, registrations = this.registrationsById) {
        if (this.hasBindingConflict(shortcutId, binding, registrations)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The shortcut binding conflicts with another shortcut.');
        }
    }
    hasBindingConflict(shortcutId, binding, registrations) {
        if (binding === null) {
            return false;
        }
        for (const registered of registrations.values()){
            if (registered.item.id !== shortcutId && areShortcutBindingsEqual(registered.info.binding, binding)) {
                return true;
            }
        }
        return false;
    }
    async updateBinding(shortcutId, binding) {
        const current = this.registrationsById.get(shortcutId);
        if (!current) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.NotFound, 'The shortcut is not registered.');
        }
        if (!current.info.enabled) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'The shortcut is not supported by the current provider and platform.');
        }
        this.assertBindingAvailable(shortcutId, binding);
        const effectiveBindingChanged = !areShortcutBindingsEqual(current.info.binding, binding);
        if (!effectiveBindingChanged && (binding === null || current.info.active)) {
            await this.state.setBinding(shortcutId, binding);
            return;
        }
        const registrationToken = binding === null ? null : {};
        const registration = binding === null || registrationToken === null ? null : await this.runtime.register(binding, current.item.scope, ()=>{
            this.handleTriggered(shortcutId, registrationToken);
        });
        if (binding !== null && registration === null) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The shortcut binding could not be registered.');
        }
        try {
            await this.state.setBinding(shortcutId, binding);
        } catch (error) {
            registration?.unregister();
            throw error;
        }
        const info = this.createInfo(current.item, binding, true, registration !== null);
        this.registrationsById.set(shortcutId, {
            item: current.item,
            info,
            registration,
            registrationToken: registration === null ? null : registrationToken
        });
        current.registration?.unregister();
        this.emit('changed', info);
    }
    createInfo(item, binding, enabled, active) {
        return Object.freeze({
            id: item.id,
            binding,
            enabled,
            active,
            scope: item.scope
        });
    }
    handleTriggered(shortcutId, registrationToken) {
        const registered = this.registrationsById.get(shortcutId);
        if (!registered?.info.active || registered.registrationToken !== registrationToken) {
            return;
        }
        this.emit('triggered', Object.freeze({
            shortcutId
        }));
    }
    constructor(...args){
        super(...args), this.itemsById = new Map(), this.registrationsById = new Map(), this.initialized = false, this.mutation = Promise.resolve();
    }
}
__decorate([
    multiInject(SHORTCUT_SHELL_ITEM),
    __metadata("design:type", Object)
], ShortcutsShellService.prototype, "items", void 0);
__decorate([
    inject(LegacyQuickChatShortcutMigration),
    __metadata("design:type", typeof LegacyQuickChatShortcutMigration === "undefined" ? Object : LegacyQuickChatShortcutMigration)
], ShortcutsShellService.prototype, "legacyMigration", void 0);
__decorate([
    inject(ShortcutsRuntime),
    __metadata("design:type", typeof ShortcutsRuntime === "undefined" ? Object : ShortcutsRuntime)
], ShortcutsShellService.prototype, "runtime", void 0);
__decorate([
    inject(ShortcutsState),
    __metadata("design:type", typeof ShortcutsState === "undefined" ? Object : ShortcutsState)
], ShortcutsShellService.prototype, "state", void 0);
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShortcutsShellService.prototype, "registerItems", null);
ShortcutsShellService = __decorate([
    injectable()
], ShortcutsShellService);
