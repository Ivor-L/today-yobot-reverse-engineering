// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/modules/template/index.ts.
// The original TypeScript and import graph are not restored.












class ShellTrayMenuTemplate {
    createBasic() {
        const copy = resolveTrayMenuCopy(this.configuration.application.getLocale(), this.configuration.platform);
        const diagnostics = [];
        if (this.configuration.current.buildEnvironment !== base_RuntimeEnvironment.Production) {
            diagnostics.push({
                click: this.actions.openDebugPanel,
                label: copy.debugPanel
            }, {
                click: this.actions.uploadLocalLogs,
                label: copy.uploadLocalLogs
            });
        }
        if (this.configuration.current.buildEnvironment === base_RuntimeEnvironment.Development) {
            diagnostics.push({
                click: this.actions.resetAllData,
                label: `${copy.resetAllData} (${copy.resetShortcutDescription})`
            });
        }
        if (diagnostics.length > 0) {
            diagnostics.push({
                type: 'separator'
            });
        }
        return [
            {
                click: this.actions.openMain,
                label: 'Open Today'
            },
            {
                type: 'separator'
            },
            ...diagnostics,
            {
                click: this.actions.quit,
                label: 'Quit Today'
            }
        ];
    }
    createStatus(options) {
        const { online, quickChatShortcut } = options;
        const platform = this.configuration.platform;
        const copy = resolveTrayMenuCopy(this.configuration.application.getLocale(), platform);
        // A modifier-only gesture has no key equivalent the system menu can draw, so it is
        // described in the subtitle instead of silently disappearing from the menu.
        const quickChatItem = {
            actionId: TOGGLE_QUICK_CHAT_ACTION_ID,
            title: copy.quickChat,
            ...describeQuickChatShortcut(quickChatShortcut, copy, platform)
        };
        const primaryItems = [
            quickChatItem,
            {
                actionId: OPEN_MAIN_ACTION_ID,
                title: copy.openTodayWindow
            },
            {
                actionId: OPEN_SETTINGS_ACTION_ID,
                shortcut: platform === 'win32' ? WINDOWS_SETTINGS_SHORTCUT : MAC_SETTINGS_SHORTCUT,
                title: copy.settings
            }
        ];
        const secondaryItems = [];
        const preference = this.nodeAdapter.sei.preferences.environment;
        if (platform === 'win32') {
            secondaryItems.push({
                actionId: CHECK_FOR_UPDATES_ACTION_ID,
                title: copy.checkForUpdates
            });
        }
        if (preference.writable) {
            secondaryItems.push({
                items: [
                    {
                        actionId: SELECT_DEVELOPMENT_ENVIRONMENT_ACTION_ID,
                        checked: preference.value === base_RuntimeEnvironment.Development,
                        title: copy.developmentEnvironment
                    },
                    {
                        actionId: SELECT_PRODUCTION_ENVIRONMENT_ACTION_ID,
                        checked: preference.value === base_RuntimeEnvironment.Production,
                        title: copy.productionEnvironment
                    }
                ],
                title: copy.environment
            });
        }
        secondaryItems.push(...this.createDiagnosticsItems());
        secondaryItems.push({
            actionId: (/* inlined export .QUIT_ACTION_ID */"quit"),
            title: copy.quit
        });
        return {
            header: {
                detail: online ? copy.onlineStatusDetail : copy.offlineStatusDetail,
                online,
                title: online ? copy.onlineStatus : copy.offlineStatus
            },
            sections: [
                {
                    items: primaryItems
                },
                {
                    items: secondaryItems
                }
            ]
        };
    }
    createSignedOutStatus() {
        const copy = resolveTrayMenuCopy(this.configuration.application.getLocale(), this.configuration.platform);
        const diagnostics = this.createDiagnosticsItems();
        const sections = [
            {
                items: [
                    {
                        actionId: OPEN_MAIN_ACTION_ID,
                        title: copy.openTodayWindow
                    }
                ]
            }
        ];
        if (this.configuration.platform === 'win32') {
            sections.push({
                items: [
                    {
                        actionId: CHECK_FOR_UPDATES_ACTION_ID,
                        title: copy.checkForUpdates
                    }
                ]
            });
        }
        if (diagnostics.length > 0) {
            sections.push({
                items: diagnostics
            });
        }
        sections.push({
            items: [
                {
                    actionId: (/* inlined export .QUIT_ACTION_ID */"quit"),
                    title: copy.quit
                }
            ]
        });
        return {
            sections
        };
    }
    createDiagnosticsItems() {
        if (this.configuration.current.buildEnvironment === base_RuntimeEnvironment.Production) {
            return [];
        }
        const copy = resolveTrayMenuCopy(this.configuration.application.getLocale(), this.configuration.platform);
        const items = [
            {
                actionId: OPEN_DEBUG_PANEL_ACTION_ID,
                subtitle: copy.debugShortcutDescription,
                title: copy.debugPanel
            },
            {
                actionId: UPLOAD_LOCAL_LOGS_ACTION_ID,
                subtitle: copy.uploadShortcutDescription,
                title: copy.uploadLocalLogs
            }
        ];
        if (this.configuration.current.buildEnvironment === base_RuntimeEnvironment.Development) {
            items.push({
                actionId: RESET_ALL_DATA_ACTION_ID,
                subtitle: copy.resetShortcutDescription,
                title: copy.resetAllData
            });
        }
        return items;
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellTrayMenuTemplate.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellTrayMenuTemplate.prototype, "configuration", void 0);
__decorate([
    inject(ShellTrayActions),
    __metadata("design:type", typeof ShellTrayActions === "undefined" ? Object : ShellTrayActions)
], ShellTrayMenuTemplate.prototype, "actions", void 0);
ShellTrayMenuTemplate = __decorate([
    injectable()
], ShellTrayMenuTemplate);
