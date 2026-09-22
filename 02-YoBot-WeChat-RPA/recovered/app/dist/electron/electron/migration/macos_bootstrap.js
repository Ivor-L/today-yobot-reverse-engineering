export function decideMacOSBootstrap(input) {
    if (input.platform !== 'darwin') {
        return { dataLayout: 'legacy', migrationRequired: false, secureConfigRequired: false, reason: 'not-macos' };
    }
    if (input.hasExplicitUserData) {
        return { dataLayout: 'legacy', migrationRequired: false, secureConfigRequired: false, reason: 'explicit-user-data' };
    }
    if (input.migrationActive) {
        return { dataLayout: 'platform', migrationRequired: false, secureConfigRequired: true, reason: 'migration-active' };
    }
    if (input.legacyDataExists) {
        return { dataLayout: 'legacy', migrationRequired: true, secureConfigRequired: false, reason: 'legacy-migration-required' };
    }
    return { dataLayout: 'platform', migrationRequired: false, secureConfigRequired: true, reason: 'fresh-install' };
}
