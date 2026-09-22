import { RuntimeEnvironment } from '@todayai-labs/platform-interface';
export const DESKTOP_WEB_RUNTIME_ORIGINS = {
    [RuntimeEnvironment.Development]: 'http://today-desktop-dev.localhost',
    [RuntimeEnvironment.Staging]: 'http://today-desktop-staging.localhost',
    [RuntimeEnvironment.Production]: 'http://today-desktop.localhost',
};
