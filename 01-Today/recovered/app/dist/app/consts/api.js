import { RuntimeEnvironment } from '@todayai-labs/platform-interface';
import { ACCOUNT_CONFIG } from './account.js';
export const API_BASE_URLS = {
    [RuntimeEnvironment.Development]: ACCOUNT_CONFIG[RuntimeEnvironment.Development].apiBaseUrl,
    [RuntimeEnvironment.Staging]: ACCOUNT_CONFIG[RuntimeEnvironment.Staging].apiBaseUrl,
    [RuntimeEnvironment.Production]: ACCOUNT_CONFIG[RuntimeEnvironment.Production].apiBaseUrl,
};
