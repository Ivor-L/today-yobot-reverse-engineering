// Compiled fragment from ./src/app/modules/shell/modules/shortcuts/modules/gnome-global/modules/lock/index.ts.
// The original TypeScript and import graph are not restored.







class GnomeShortcutLock {
    async run(operation) {
        const runtimeDirectory = this.configuration.environment['XDG_RUNTIME_DIR'];
        if (!runtimeDirectory || !(0,external_node_path_namespaceObject.isAbsolute)(runtimeDirectory)) {
            throw new Error('GNOME shortcut lock requires a session runtime directory');
        }
        // All profiles share this lock. The shell holds it until its stdin closes,
        // including when Electron crashes; no stale lockfile recovery is necessary.
        const holder = (0,external_node_child_process_namespaceObject.spawn)('flock', [
            '--exclusive',
            '--timeout',
            '2',
            (0,external_node_path_namespaceObject.join)(runtimeDirectory, 'today-desktop-gnome-shortcuts.lock'),
            '/bin/sh',
            '-c',
            'printf "locked\\n"; read -r release'
        ], {
            stdio: 'pipe'
        });
        holder.stdin.on('error', ()=>{});
        try {
            await this.waitUntilLocked(holder);
            return await operation();
        } finally{
            holder.stdin.end();
            await this.waitUntilReleased(holder);
        }
    }
    async waitUntilLocked(holder) {
        await new Promise((resolve, reject)=>{
            const timeout = setTimeout(()=>{
                holder.kill('SIGKILL');
                reject(new Error('GNOME shortcut lock timed out'));
            }, 2500);
            const rejectLock = ()=>{
                clearTimeout(timeout);
                reject(new Error('GNOME shortcut lock is unavailable'));
            };
            holder.once('error', rejectLock);
            holder.once('exit', rejectLock);
            holder.stdout.once('data', (data)=>{
                clearTimeout(timeout);
                if (data.toString('utf8') !== 'locked\n') {
                    rejectLock();
                    return;
                }
                resolve();
            });
        });
    }
    async waitUntilReleased(holder) {
        if (holder.exitCode !== null || holder.signalCode !== null || !holder.pid) {
            return;
        }
        await new Promise((resolve)=>{
            const timeout = setTimeout(()=>{
                holder.kill('SIGKILL');
                resolve();
            }, 500);
            holder.once('exit', ()=>{
                clearTimeout(timeout);
                resolve();
            });
        });
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], GnomeShortcutLock.prototype, "configuration", void 0);
GnomeShortcutLock = __decorate([
    injectable()
], GnomeShortcutLock);
