// Compiled fragment from ../../packages/language/src/index.ts.
// The original TypeScript and import graph are not restored.

const SUPPORTED_LANGUAGES = (/* unused pure expression or super */ null && ([
    'en',
    'zh',
    'zh-Hant',
    'ja'
]));
const I18NEXT_LANGUAGE_COOKIE = 'i18next';
const ACCEPT_LANGUAGE_BY_LOCALE = {
    en: 'en-US,en;q=0.9',
    ja: 'ja-JP,ja;q=0.9',
    zh: 'zh-CN,zh;q=0.9',
    'zh-Hant': 'zh-TW,zh-Hant;q=0.9,zh;q=0.8'
};
const isSupportedLanguage = (language)=>SUPPORTED_LANGUAGES.some((supportedLanguage)=>supportedLanguage === language);
const resolveSupportedLanguage = (language)=>{
    const normalizedLanguage = language?.trim().toLowerCase() ?? '';
    if (normalizedLanguage === 'ja' || normalizedLanguage.startsWith('ja-')) {
        return 'ja';
    }
    if (normalizedLanguage === 'zh-hant' || normalizedLanguage.startsWith('zh-hant-') || normalizedLanguage === 'zh-tw' || normalizedLanguage.startsWith('zh-tw-') || normalizedLanguage === 'zh-hk' || normalizedLanguage.startsWith('zh-hk-') || normalizedLanguage === 'zh-mo' || normalizedLanguage.startsWith('zh-mo-')) {
        return 'zh-Hant';
    }
    if (normalizedLanguage === 'zh' || normalizedLanguage.startsWith('zh-')) {
        return 'zh';
    }
    return 'en';
};
const readLanguageCookie = ()=>{
    if (typeof document === 'undefined') {
        return '';
    }
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${I18NEXT_LANGUAGE_COOKIE}=([^;]*)`));
    const value = match?.[1];
    try {
        return value ? decodeURIComponent(value) : '';
    } catch  {
        return '';
    }
};
const readDocumentLanguage = ()=>{
    if (typeof document === 'undefined') {
        return '';
    }
    return document.documentElement.lang.trim();
};
/** Map an i18n language tag to a standard `Accept-Language` header value. */ const toAcceptLanguage = (language)=>ACCEPT_LANGUAGE_BY_LOCALE[resolveSupportedLanguage(language)];
/** Resolve the active client UI language without requiring a React provider. */ const getClientUiLanguage = ()=>resolveSupportedLanguage(readLanguageCookie() || readDocumentLanguage());
/** Resolve the `Accept-Language` header for the current client UI language. */ const getClientAcceptLanguage = ()=>ACCEPT_LANGUAGE_BY_LOCALE[getClientUiLanguage()];
