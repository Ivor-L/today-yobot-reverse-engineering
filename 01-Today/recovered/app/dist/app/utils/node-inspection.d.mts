/**
 * @param {string} directory
 * @returns {string}
 */
export declare const createDesktopDevelopmentSupervisorArgument: (directory: string) => string;
/**
 * @param {unknown} value
 * @returns {value is string}
 */
export declare const isDesktopDevelopmentSupervisorDirectory: (value: unknown) => value is string;
export declare const resolveDesktopDevelopmentSupervisorDirectoryPrefix: () => string;
/**
 * @param {string} directory
 * @returns {string}
 */
export declare const resolveDesktopDevelopmentRestartRequestPath: (directory: string) => string;
/**
 * Treat any enabling form as active. Electron exposes runtime switches and app
 * arguments in one argv list, while Node mode splits them at the entry point;
 * a later app argument must never mask an already active runtime switch.
 *
 * @param {...readonly string[]} argumentLists
 * @returns {boolean}
 */
export declare const isNodeNetworkInspectionEnabled: (...argumentLists: (readonly string[])[]) => boolean;
/**
 * @param {...readonly string[]} argumentLists
 * @returns {boolean | undefined}
 */
export declare const resolveNodeNetworkInspectionOverride: (...argumentLists: (readonly string[])[]) => boolean | undefined;
/**
 * @param {...readonly string[]} argumentLists
 * @returns {boolean | undefined}
 */
export declare const resolveNodeNetworkInspectionRuntimeOverride: (...argumentLists: (readonly string[])[]) => boolean | undefined;
/**
 * @param {readonly string[]} arguments_
 * @param {boolean} enabled
 * @returns {string[]}
 */
export declare const setNodeNetworkInspection: (arguments_: readonly string[], enabled: boolean) => string[];
/**
 * @param {{ launchArguments: readonly string[], overrideArguments: readonly string[] }} params
 * @returns {string[]}
 */
export declare const resolveInitialNodeNetworkInspectionArguments: (params: {
    launchArguments: readonly string[];
    overrideArguments: readonly string[];
}) => string[];
/**
 * @param {{ nodeNetworkInspectionEnabled?: boolean }} [request]
 * @returns {string}
 */
export declare const serializeDesktopDevelopmentRestartRequest: (request?: {
    nodeNetworkInspectionEnabled?: boolean;
}) => string;
/**
 * @param {string} request
 * @returns {{ nodeNetworkInspectionEnabled?: boolean }}
 */
export declare const parseDesktopDevelopmentRestartRequest: (request: string) => {
    nodeNetworkInspectionEnabled?: boolean;
};
