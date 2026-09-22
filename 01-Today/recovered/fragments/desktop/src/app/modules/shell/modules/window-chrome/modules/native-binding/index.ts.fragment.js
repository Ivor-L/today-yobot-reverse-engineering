// Compiled fragment from ./src/app/modules/shell/modules/window-chrome/modules/native-binding/index.ts.
// The original TypeScript and import graph are not restored.







class ShellWindowChromeNativeBinding {
    prepare() {
        this.resolveBinding();
    }
    applyAuthenticationMainWindow(window) {
        const binding = this.resolveBinding();
        const nativeWindowHandle = window.getNativeWindowHandle();
        binding.applyAuthenticationMainWindowChrome(nativeWindowHandle);
    }
    restoreApplicationMainWindow(window) {
        const binding = this.resolveBinding();
        const nativeWindowHandle = window.getNativeWindowHandle();
        binding.restoreApplicationMainWindowChrome(nativeWindowHandle);
    }
    applyRoundedWindow(window, cornerRadius) {
        const binding = this.resolveBinding();
        const nativeWindowHandle = window.getNativeWindowHandle();
        binding.applyRoundedWindowChrome(nativeWindowHandle, cornerRadius);
    }
    setCursor(window, pointer) {
        const binding = this.resolveBinding();
        const nativeWindowHandle = window.getNativeWindowHandle();
        binding.setWindowCursor(nativeWindowHandle, pointer);
    }
    applyRoundedBackdrops(window, backdrops) {
        const binding = this.resolveBinding();
        const nativeWindowHandle = window.getNativeWindowHandle();
        binding.applyRoundedBackdrops(nativeWindowHandle, backdrops);
    }
    resolveBinding() {
        if (this.binding) {
            return this.binding;
        }
        const path = this.assets.windowChromePath;
        const requireNativeBinding = (0,external_node_module_namespaceObject.createRequire)(path);
        const binding = requireNativeBinding(path);
        if (!isWindowChromeNativeBinding(binding)) {
            throw new Error(`Invalid macOS window chrome binding: ${path}`);
        }
        this.binding = binding;
        return binding;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellWindowChromeNativeBinding.prototype, "assets", void 0);
ShellWindowChromeNativeBinding = __decorate([
    injectable()
], ShellWindowChromeNativeBinding);
