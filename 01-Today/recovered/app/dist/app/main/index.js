import { app, dialog, ipcMain } from 'electron';
import { DesktopMainApp } from '../app/index.js';
import { PACKAGED_BACKEND_LANE, PACKAGED_POSTHOG_HOST, PACKAGED_SENTRY_DSN, PACKAGED_VERCEL_BYPASS_SECRET, POSTHOG_TOKEN_DEV, POSTHOG_TOKEN_PROD, } from '../consts/build.js';
const main = async () => {
    const desktopApp = await DesktopMainApp.create({
        application: app,
        bypassSecret: PACKAGED_VERCEL_BYPASS_SECRET,
        ipc: ipcMain,
        lane: PACKAGED_BACKEND_LANE,
        logs: {
            postHogHost: PACKAGED_POSTHOG_HOST,
            postHogTokenDev: POSTHOG_TOKEN_DEV,
            postHogTokenProd: POSTHOG_TOKEN_PROD,
            sentryDsn: PACKAGED_SENTRY_DSN,
        },
    });
    if (!desktopApp) {
        return;
    }
    await desktopApp.launch();
};
main().catch((error) => {
    console.error('[desktop] startup failed', error);
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Today could not start', message);
    app.exit(1);
});
