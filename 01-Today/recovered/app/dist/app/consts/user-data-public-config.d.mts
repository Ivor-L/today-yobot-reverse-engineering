/**
 * macOS Chromium profile 目录的基名，按发布地区 × 渠道划分。
 * 由运行时（configuration/consts.ts）与开发脚本（reset-dev-mac-cache.mjs）共用，
 * 两边必须同源：脚本清错目录会让"重置后重测"带着上一轮数据。
 * 目录名刻意与用户可见的 productName 解耦，两地同名 Today 时仍能分开。
 *
 * @type {Readonly<Record<'cn' | 'global', Readonly<Record<'dev' | 'staging' | 'prod', string>>>>}
 */
export declare const MACOS_REGION_USER_DATA_BASE_NAMES: Readonly<Record<'cn' | 'global', Readonly<Record<'dev' | 'staging' | 'prod', string>>>>;
