// Compiled fragment from ./src/app/modules/shell/modules/shortcuts/index.ts.
// The original TypeScript and import graph are not restored.











class ShellShortcuts {
    consumeActivation(commandLine) {
        return this.gnomeGlobalShortcuts.consumeActivation(commandLine);
    }
    register(params, listener) {
        const bindingKey = createShortcutBindingKey(params.binding);
        if (this.activeBindingKeys.has(bindingKey)) {
            return null;
        }
        if (isModifierGestureBinding(params.binding)) {
            return this.registerModifierGesture(bindingKey, params.binding, params.scope, listener);
        }
        if (params.scope === (/* inlined export .ShortcutScope.Foreground */"foreground")) {
            return this.registerForeground(bindingKey, params.binding, listener);
        }
        if (this.configuration.platform === 'linux') {
            if (this.gnomeGlobalShortcuts.supported) {
                return this.registerGnomeGlobal(bindingKey, params.binding, listener);
            }
            if (this.configuration.environment['XDG_SESSION_TYPE'] === 'wayland' && this.configuration.application.commandLine.getSwitchValue('ozone-platform') !== 'wayland') {
                // XWayland grabs do not cover native Wayland surfaces. Only the native
                // backend can use Electron's portal outside the GNOME provider above.
                return null;
            }
        }
        return this.registerGlobal(bindingKey, params.binding, listener);
    }
    /**
   * Only a packaged macOS build has a trustworthy legacy source: an unpackaged
   * build shares the developer's own defaults domain, and no other platform ever
   * ran the previous native client.
   */ async readLegacyQuickChatShortcut() {
        if (!this.supportsModifierGestures || !this.configuration.application.isPackaged) {
            return null;
        }
        const cpi = this.crossPlatformInterface;
        if (!cpi) {
            return null;
        }
        return await cpi.macos.readLegacyQuickChatShortcut();
    }
    attachCrossPlatformInterface(cpi) {
        this.crossPlatformInterface = cpi;
        this.modifierGestures.attach(cpi);
    }
    attachWebContents(webContents) {
        if (this.webContents === webContents) {
            return;
        }
        this.detachCurrentWebContents();
        this.webContents = webContents;
        webContents.on('before-input-event', this.handleBeforeInput);
    }
    detachWebContents(webContents) {
        if (this.webContents !== webContents) {
            return;
        }
        this.detachCurrentWebContents();
    }
    /** Modifier-only gestures are observed by the macOS Native Host only. */ get supportsModifierGestures() {
        return this.configuration.platform === 'darwin';
    }
    async registerModifierGesture(bindingKey, binding, scope, listener) {
        // A modifier gesture has no key to filter on `before-input-event`, so a
        // foreground-scoped item cannot be honoured and stays inactive.
        if (!this.supportsModifierGestures || scope !== (/* inlined export .ShortcutScope.Global */"global")) {
            return null;
        }
        this.activeBindingKeys.add(bindingKey);
        // Every physical registration gets its own lease identifier. `bindingKey`
        // only tracks conflicts, so an A -> B -> A sequence cannot let the first A
        // lease's asynchronous native cleanup delete the second A lease.
        this.gestureLeaseSequence += 1;
        const gestureId = `${bindingKey}#${this.gestureLeaseSequence}`;
        const registered = await this.modifierGestures.register(gestureId, binding, listener);
        if (!registered) {
            this.activeBindingKeys.delete(bindingKey);
            return null;
        }
        let active = true;
        return {
            unregister: ()=>{
                if (!active) {
                    return;
                }
                active = false;
                this.activeBindingKeys.delete(bindingKey);
                this.releaseModifierGesture(gestureId);
            }
        };
    }
    async releaseModifierGesture(gestureId) {
        try {
            await this.modifierGestures.unregister(gestureId);
        } catch (error) {
            console.error('[desktop] failed to release a modifier gesture lease', error);
        }
    }
    registerForeground(bindingKey, binding, listener) {
        this.activeBindingKeys.add(bindingKey);
        this.foregroundRegistrations.set(bindingKey, {
            binding,
            listener
        });
        let active = true;
        return {
            unregister: ()=>{
                if (!active) {
                    return;
                }
                active = false;
                this.foregroundRegistrations.delete(bindingKey);
                this.activeBindingKeys.delete(bindingKey);
            }
        };
    }
    registerGlobal(bindingKey, binding, listener) {
        const accelerator = toElectronAccelerator(binding);
        if (!accelerator || !external_electron_.globalShortcut.register(accelerator, listener)) {
            return null;
        }
        this.activeBindingKeys.add(bindingKey);
        let active = true;
        return {
            unregister: ()=>{
                if (!active) {
                    return;
                }
                active = false;
                external_electron_.globalShortcut.unregister(accelerator);
                this.activeBindingKeys.delete(bindingKey);
            }
        };
    }
    async registerGnomeGlobal(bindingKey, binding, listener) {
        this.activeBindingKeys.add(bindingKey);
        const registration = await this.gnomeGlobalShortcuts.register(binding, listener);
        if (!registration) {
            this.activeBindingKeys.delete(bindingKey);
            return null;
        }
        let active = true;
        return {
            unregister: ()=>{
                if (!active) {
                    return;
                }
                active = false;
                this.activeBindingKeys.delete(bindingKey);
                registration.unregister();
            }
        };
    }
    detachCurrentWebContents() {
        const webContents = this.webContents;
        if (!webContents) {
            return;
        }
        webContents.off('before-input-event', this.handleBeforeInput);
        this.webContents = undefined;
    }
    constructor(){
        this.activeBindingKeys = new Set();
        this.foregroundRegistrations = new Map();
        this.gestureLeaseSequence = 0;
        this.handleBeforeInput = (event, input)=>{
            for (const registration of this.foregroundRegistrations.values()){
                if (!isShortcutInputMatch(input, registration.binding)) {
                    continue;
                }
                event.preventDefault();
                registration.listener();
                return;
            }
        };
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellShortcuts.prototype, "configuration", void 0);
__decorate([
    inject(ShellModifierGestures),
    __metadata("design:type", typeof ShellModifierGestures === "undefined" ? Object : ShellModifierGestures)
], ShellShortcuts.prototype, "modifierGestures", void 0);
__decorate([
    inject(ShellGnomeGlobalShortcuts),
    __metadata("design:type", typeof ShellGnomeGlobalShortcuts === "undefined" ? Object : ShellGnomeGlobalShortcuts)
], ShellShortcuts.prototype, "gnomeGlobalShortcuts", void 0);
ShellShortcuts = __decorate([
    injectable()
], ShellShortcuts);
