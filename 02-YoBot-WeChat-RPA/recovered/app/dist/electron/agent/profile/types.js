/** 除身份字段外的默认值。新建 profile 时的安全底座。 */
export const PROFILE_DEFAULTS = {
    memoryNamespace: { read: null, write: null },
    sessionPolicy: "persistent",
    runtime: "inproc",
};
