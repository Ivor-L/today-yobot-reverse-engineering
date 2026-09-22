// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/utils/viewport-anchor.ts.
// The original TypeScript and import graph are not restored.


/**
 * 把 WEI 调用方给出的视口矩形（CSS px，`getBoundingClientRect()` 的产物）换算成
 * 全局屏幕坐标（DIP，主显示器左上原点）。
 *
 * 这是 anchor 语义在 Node 层的唯一换算点：任何 WEI 方法要携带 `AnchorRect`，
 * 都应经过这里再跨 CPI——native host 拿到的永远是屏幕坐标（见契约 `AnchorRect` 注释）。
 *
 * 选窗不能用「当前聚焦窗口」：点击与本次 RPC 之间隔着别的异步往返（如先查
 * `getPermissionInfo`），焦点可能已经落到 debug 面板或分离的 DevTools 上——
 * 拿它们的内容区原点换算会把锚点搬到另一块屏幕。WEI 调用只可能来自承载 Web
 * 应用的窗口，而它是唯一加载 http(s) 的 `BrowserWindow`（debug 页是 `file://`、
 * DevTools 是 `devtools://`），按 URL 协议筛选即可确定性命中。
 * 找不到时返回 undefined——「没有锚点」是链路各层约定的合法降级。
 */ const viewportAnchorToScreenRect = (rect)=>{
    if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) || !(rect.width > 0) || !(rect.height > 0)) {
        return undefined;
    }
    const window = external_electron_.BrowserWindow.getAllWindows().find((candidate)=>{
        if (candidate.isDestroyed()) {
            return false;
        }
        const url = candidate.webContents.getURL();
        return url.startsWith('http://') || url.startsWith('https://');
    });
    if (!window) {
        return undefined;
    }
    // CSS px 与 DIP 在 zoomFactor 1 时同刻度；缩放过的页面要按倍率换算。
    const zoom = window.webContents.getZoomFactor();
    const content = window.getContentBounds();
    return {
        x: content.x + rect.x * zoom,
        y: content.y + rect.y * zoom,
        width: rect.width * zoom,
        height: rect.height * zoom
    };
};
