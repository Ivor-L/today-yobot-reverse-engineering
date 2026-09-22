/* Preserve native status codes; adapt structured sync errors for the legacy UI. */
(() => {
  if (window.__recoverySyncErrorsInstalled) return;
  window.__recoverySyncErrorsInstalled = true;
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const response = await originalFetch.call(this, input, init);
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
    if (url.origin !== location.origin || url.pathname !== '/api/contact/sync' || response.ok) return response;
    let payload;
    try { payload = await response.clone().json(); } catch { return response; }
    const detail = payload?.detail;
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return response;
    const code = typeof detail.code === 'string' ? detail.code : '';
    let message = typeof detail.message === 'string' ? detail.message : '同步接口返回了错误';
    if (code === 'MACOS_MVP_CONTACT_SYNC_FAILED_ELEMENT_NOT_FOUND') {
      message = '未找到微信通讯录所需控件。请保持微信主窗口可见；若仍失败，需要适配当前微信版本的通讯录界面。';
    }
    if (code === 'MACOS_MVP_CONTACT_SYNC_FAILED_OPERATION_FAILED') {
      message = '微信通讯录读取操作失败，好友数据未完成同步。请关闭微信菜单或弹窗后重试；若仍失败，需要排查原生读取模块。';
    }
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(JSON.stringify({ ...payload, detail: `${message}${code ? `（${code}）` : ''}`, diagnostic: detail }), {
      status: response.status, statusText: response.statusText, headers
    });
  };
})();
