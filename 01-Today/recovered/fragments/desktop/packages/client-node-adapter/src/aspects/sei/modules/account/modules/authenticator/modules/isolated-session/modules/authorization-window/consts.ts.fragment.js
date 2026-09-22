// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/isolated-session/modules/authorization-window/consts.ts.
// The original TypeScript and import graph are not restored.

const AUTHORIZATION_PAGE_LOAD_TIMEOUT_MS = 30000;
// This document has no remote resources or credentials and stays visible during OAuth navigation.
const AUTHORIZATION_LOADING_URL = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
    <title>Sign in</title>
    <style>
      html, body { height: 100%; margin: 0; background: #fff; }
      body { display: grid; place-items: center; }
      [role="status"] { width: 28px; height: 28px; border: 3px solid #e5e7eb; border-top-color: #6b7280; border-radius: 50%; animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { [role="status"] { animation: none; } }
    </style>
  </head>
  <body><div role="status" aria-label="Loading sign-in page"></div></body>
</html>`)}`;
