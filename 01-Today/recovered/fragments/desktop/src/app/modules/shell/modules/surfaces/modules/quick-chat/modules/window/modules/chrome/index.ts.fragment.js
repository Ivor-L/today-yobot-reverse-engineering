// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/quick-chat/modules/window/modules/chrome/index.ts.
// The original TypeScript and import graph are not restored.






class ShellQuickChatWindowChrome {
    apply(window) {
        this.windowChrome.applyRoundedWindow(window, (/* inlined export .QUICK_CHAT_WINDOW_CORNER_RADIUS_DIP */28));
    }
}
__decorate([
    inject(ShellWindowChrome),
    __metadata("design:type", typeof ShellWindowChrome === "undefined" ? Object : ShellWindowChrome)
], ShellQuickChatWindowChrome.prototype, "windowChrome", void 0);
ShellQuickChatWindowChrome = __decorate([
    injectable()
], ShellQuickChatWindowChrome);
