// Compiled fragment from ./src/app/binds.ts.
// The original TypeScript and import graph are not restored.






























const bindDepsToContainer = (container)=>{
    container.bind(SHELL_MENU_GROUP).to(ShellApplicationMenuGroup);
    container.bind(SHELL_MENU_GROUP).to(ShellFileMenuGroup);
    container.bind(SHELL_MENU_GROUP).to(ShellEditMenuGroup);
    container.bind(SHELL_MENU_GROUP).to(ShellViewMenuGroup);
    container.bind(SHELL_MENU_GROUP).to(ShellWindowMenuGroup);
    container.bind(SHELL_MENU_ITEM).to(ShellAboutMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellCheckForUpdatesMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellSettingsMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellServicesMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellHideMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellHideOthersMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellUnhideMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellQuitMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellNewWindowMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellCloseMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellUndoMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellRedoMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellCutMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellCopyMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellPasteMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellSelectAllMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellReloadMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellForceReloadMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellResetZoomMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellZoomInMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellZoomOutMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellToggleFullscreenMenuItem);
    container.bind(SHELL_MENU_ITEM).to(ShellExitFullscreenMenuItem);
};
