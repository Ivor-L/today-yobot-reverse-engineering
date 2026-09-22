/**
 * Public OAuth client identifiers shared by the Desktop account composition
 * and the packaged Next.js build. Never add credentials or client secrets here.
 *
 * @type {Readonly<Record<'dev' | 'staging' | 'prod', string>>}
 */
export const DESKTOP_OAUTH_CLIENT_IDS = Object.freeze({
    dev: 'vfKNEjlofHTRUVvgfPYUPtYdMeakEvbI',
    staging: 'Bh2VwEojzfuJw4kBGuLQf3wxGEoupUnx',
    prod: 'Bh2VwEojzfuJw4kBGuLQf3wxGEoupUnx',
});
