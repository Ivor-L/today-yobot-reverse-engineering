// Compiled fragment from ./src/app/modules/shell/modules/shortcuts/modules/gnome-global/index.ts.
// The original TypeScript and import graph are not restored.











class ShellGnomeGlobalShortcuts {
    get supported() {
        const { environment, platform } = this.configuration;
        return platform === 'linux' && environment['XDG_SESSION_TYPE'] === 'wayland' && (environment['XDG_CURRENT_DESKTOP'] ?? '').split(':').some((name)=>name.toLowerCase() === 'gnome');
    }
    consumeActivation(commandLine) {
        const argument = commandLine.find((value)=>value === SHORTCUT_ACTIVATION_ARGUMENT || value.startsWith(`${SHORTCUT_ACTIVATION_ARGUMENT}=`));
        if (!argument) {
            return false;
        }
        const token = argument.slice(SHORTCUT_ACTIVATION_ARGUMENT.length + 1);
        const lease = this.leases.get(token);
        if (lease?.active && !this.closing) {
            lease.listener();
        }
        return true;
    }
    async register(binding, listener) {
        return await this.serialize(async ()=>{
            try {
                return await this.lock.run(async ()=>await this.registerLocked(binding, listener));
            } catch  {
                console.error('[desktop] GNOME global shortcut transaction failed');
                return null;
            }
        });
    }
    async registerLocked(binding, listener) {
        const accelerator = toGnomeAccelerator(binding);
        if (!this.supported || !accelerator || this.closing) {
            return null;
        }
        let lease;
        try {
            await this.prepare();
            const normalized = normalizeGnomeAccelerator(accelerator);
            const systemAccelerators = await this.settings.readSystemAccelerators();
            if (systemAccelerators.some((value)=>normalizeGnomeAccelerator(value) === normalized)) {
                return null;
            }
            for (const path of (await this.settings.readPaths())){
                const existing = await this.settings.readString(path, 'binding');
                if (normalizeGnomeAccelerator(existing) === normalized) {
                    return null;
                }
            }
            const token = (0,external_node_crypto_namespaceObject.randomUUID)();
            const { application, current, environment } = this.configuration;
            const appImagePath = environment['APPIMAGE'];
            const executablePath = appImagePath ?? process.execPath;
            const passwordStore = application.commandLine.getSwitchValue('password-store');
            if (!(0,external_node_path_namespaceObject.isAbsolute)(executablePath)) {
                return null;
            }
            const command = createGnomeShortcutCommand({
                executablePath,
                ...!application.isPackaged ? {
                    appPath: application.getAppPath()
                } : {},
                extractAndRun: environment['APPIMAGE_EXTRACT_AND_RUN'] === '1',
                noSandbox: current.noSandboxOnStartup,
                ...passwordStore ? {
                    passwordStore
                } : {},
                isDevelopment: current.launchOptions.isDevelopment,
                environment: current.launchOptions.environmentOverride ?? current.buildEnvironment,
                ...current.launchOptions.localProfileId ? {
                    localProfileId: current.launchOptions.localProfileId
                } : {},
                ...current.launchOptions.localWebOrigin ? {
                    localWebOrigin: current.launchOptions.localWebOrigin
                } : {}
            }, token);
            lease = {
                token,
                path: `${this.ownedPrefix}${token}/`,
                command,
                binding: accelerator,
                listener,
                active: false
            };
            this.leases.set(token, lease);
            await this.settings.writeString(lease.path, 'name', `${current.appName} shortcut`);
            await this.settings.writeString(lease.path, 'command', command);
            await this.settings.writeString(lease.path, 'binding', accelerator);
            const paths = await this.settings.readPaths();
            // GNOME can launch the command as soon as the path is published, before
            // the registration readback finishes. Its listener must already be live.
            lease.active = true;
            await this.settings.writePaths([
                ...paths,
                lease.path
            ]);
            const installedPaths = await this.settings.readPaths();
            const installedBinding = await this.settings.readString(lease.path, 'binding');
            const installedCommand = await this.settings.readString(lease.path, 'command');
            if (this.closing || !installedPaths.includes(lease.path) || installedBinding !== accelerator || installedCommand !== command) {
                await this.remove(lease);
                return null;
            }
            const registeredLease = lease;
            return {
                unregister: ()=>{
                    if (!registeredLease.active) {
                        return;
                    }
                    registeredLease.active = false;
                    this.release(registeredLease);
                }
            };
        } catch (error) {
            console.error('[desktop] failed to register a GNOME global shortcut', error);
            if (lease && !this.closing) {
                await this.removeSafely(lease);
            }
            return null;
        }
    }
    get ownedPrefix() {
        const profile = this.configuration.application.getPath('userData');
        const id = (0,external_node_crypto_namespaceObject.createHash)('sha256').update(profile).digest('hex').slice(0, 16);
        return `${CUSTOM_SHORTCUT_ROOT}today-${id}-`;
    }
    async prepare() {
        if (this.prepared) {
            return;
        }
        const paths = await this.settings.readPaths();
        const stale = paths.filter((path)=>{
            if (!path.startsWith(this.ownedPrefix)) {
                return false;
            }
            return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/$/u.test(path.slice(this.ownedPrefix.length));
        });
        if (stale.length > 0) {
            await this.settings.writePaths(paths.filter((path)=>!stale.includes(path)));
            for (const path of stale){
                await this.settings.reset(path);
            }
        }
        this.configuration.application.on('will-quit', this.handleWillQuit);
        this.prepared = true;
    }
    async finishQuit() {
        const deadline = setTimeout(()=>{
            this.settings.stop();
        }, 3000);
        try {
            await this.serialize(async ()=>{
                await this.lock.run(async ()=>{
                    for (const lease of this.leases.values()){
                        await this.remove(lease);
                    }
                });
            });
        } catch  {
            console.error('[desktop] failed to clean up GNOME global shortcuts during quit');
        } finally{
            clearTimeout(deadline);
            this.settings.stop();
            this.configuration.application.removeListener('will-quit', this.handleWillQuit);
            setImmediate(()=>{
                this.configuration.application.quit();
            });
        }
    }
    async release(lease) {
        await this.serialize(async ()=>{
            try {
                await this.lock.run(async ()=>{
                    await this.removeSafely(lease);
                });
            } catch  {
                console.error('[desktop] failed to acquire the GNOME shortcut cleanup lock');
            }
        });
    }
    async removeSafely(lease) {
        try {
            await this.remove(lease);
        } catch (error) {
            console.error('[desktop] failed to release a GNOME global shortcut', error);
        }
    }
    async remove(lease) {
        lease.active = false;
        const paths = await this.settings.readPaths();
        await this.settings.writePaths(paths.filter((path)=>path !== lease.path));
        await this.settings.reset(lease.path);
        this.leases.delete(lease.token);
    }
    async serialize(operation) {
        const previous = this.mutation;
        let release;
        this.mutation = new Promise((resolve)=>{
            release = resolve;
        });
        await previous;
        try {
            return await operation();
        } finally{
            release();
        }
    }
    constructor(){
        this.leases = new Map();
        this.mutation = Promise.resolve();
        this.prepared = false;
        this.closing = false;
        this.handleWillQuit = (event)=>{
            event.preventDefault();
            if (this.closing) {
                return;
            }
            this.closing = true;
            for (const lease of this.leases.values()){
                lease.active = false;
            }
            this.settings.cancelPending();
            this.finishQuit();
        };
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellGnomeGlobalShortcuts.prototype, "configuration", void 0);
__decorate([
    inject(GnomeShortcutSettings),
    __metadata("design:type", typeof GnomeShortcutSettings === "undefined" ? Object : GnomeShortcutSettings)
], ShellGnomeGlobalShortcuts.prototype, "settings", void 0);
__decorate([
    inject(GnomeShortcutLock),
    __metadata("design:type", typeof GnomeShortcutLock === "undefined" ? Object : GnomeShortcutLock)
], ShellGnomeGlobalShortcuts.prototype, "lock", void 0);
ShellGnomeGlobalShortcuts = __decorate([
    injectable()
], ShellGnomeGlobalShortcuts);
