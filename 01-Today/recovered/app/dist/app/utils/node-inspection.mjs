import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { DESKTOP_DEVELOPMENT_SUPERVISOR_ARGUMENT_NAME, NODE_NETWORK_INSPECTION_ARGUMENT, NODE_NETWORK_INSPECTION_DEFAULT_ARGUMENT, NODE_NETWORK_INSPECTION_DISABLED_ARGUMENT, } from '../consts/node-inspection.mjs';
const DESKTOP_DEVELOPMENT_SUPERVISOR_DIRECTORY_PATTERN = /^today-desktop-development-supervisor-[A-Za-z0-9]{6}$/u;
const DESKTOP_DEVELOPMENT_SUPERVISOR_DIRECTORY_PREFIX = 'today-desktop-development-supervisor-';
const DESKTOP_RESTART_REQUEST = 'restart';
const NODE_NETWORK_INSPECTION_ENABLED_RESTART_REQUEST = 'node-network-inspection=enabled';
const NODE_NETWORK_INSPECTION_DISABLED_RESTART_REQUEST = 'node-network-inspection=disabled';
/**
 * @param {string} argument
 * @returns {string | undefined}
 */
const resolveNormalizedArgumentName = (argument) => argument.split('=', 1)[0]?.replaceAll('_', '-');
/**
 * @param {string} argument
 * @returns {boolean | undefined}
 */
const resolveNodeNetworkInspectionArgument = (argument) => {
    const normalizedName = resolveNormalizedArgumentName(argument);
    if (normalizedName === NODE_NETWORK_INSPECTION_ARGUMENT) {
        return true;
    }
    if (normalizedName === NODE_NETWORK_INSPECTION_DISABLED_ARGUMENT) {
        return false;
    }
    return undefined;
};
/**
 * @param {string} argument
 * @returns {boolean}
 */
const isNodeNetworkInspectionDefaultArgument = (argument) => resolveNormalizedArgumentName(argument) === NODE_NETWORK_INSPECTION_DEFAULT_ARGUMENT;
/**
 * @param {string} directory
 * @returns {string}
 */
export const createDesktopDevelopmentSupervisorArgument = (directory) => {
    if (!isDesktopDevelopmentSupervisorDirectory(directory)) {
        throw new Error('Invalid Desktop development supervisor directory');
    }
    return `--${DESKTOP_DEVELOPMENT_SUPERVISOR_ARGUMENT_NAME}=${directory}`;
};
/**
 * @param {unknown} value
 * @returns {value is string}
 */
export const isDesktopDevelopmentSupervisorDirectory = (value) => typeof value === 'string' &&
    isAbsolute(value) &&
    dirname(value) === tmpdir() &&
    DESKTOP_DEVELOPMENT_SUPERVISOR_DIRECTORY_PATTERN.test(basename(value));
export const resolveDesktopDevelopmentSupervisorDirectoryPrefix = () => join(tmpdir(), DESKTOP_DEVELOPMENT_SUPERVISOR_DIRECTORY_PREFIX);
/**
 * @param {string} directory
 * @returns {string}
 */
export const resolveDesktopDevelopmentRestartRequestPath = (directory) => {
    if (!isDesktopDevelopmentSupervisorDirectory(directory)) {
        throw new Error('Invalid Desktop development supervisor directory');
    }
    return join(directory, 'restart.request');
};
/**
 * Treat any enabling form as active. Electron exposes runtime switches and app
 * arguments in one argv list, while Node mode splits them at the entry point;
 * a later app argument must never mask an already active runtime switch.
 *
 * @param {...readonly string[]} argumentLists
 * @returns {boolean}
 */
export const isNodeNetworkInspectionEnabled = (...argumentLists) => {
    for (const arguments_ of argumentLists) {
        for (const argument of arguments_) {
            if (resolveNodeNetworkInspectionArgument(argument) === true) {
                return true;
            }
        }
    }
    return false;
};
/**
 * @param {...readonly string[]} argumentLists
 * @returns {boolean | undefined}
 */
export const resolveNodeNetworkInspectionOverride = (...argumentLists) => {
    let override;
    for (const arguments_ of argumentLists) {
        for (const argument of arguments_) {
            const value = resolveNodeNetworkInspectionArgument(argument);
            if (typeof value === 'boolean') {
                override = value;
            }
        }
    }
    return override;
};
/**
 * @param {...readonly string[]} argumentLists
 * @returns {boolean | undefined}
 */
export const resolveNodeNetworkInspectionRuntimeOverride = (...argumentLists) => {
    for (const arguments_ of argumentLists) {
        if (arguments_.some(isNodeNetworkInspectionDefaultArgument)) {
            return undefined;
        }
    }
    return resolveNodeNetworkInspectionOverride(...argumentLists);
};
/**
 * @param {readonly string[]} arguments_
 * @param {boolean} enabled
 * @returns {string[]}
 */
export const setNodeNetworkInspection = (arguments_, enabled) => {
    const filteredArguments = arguments_.filter((argument) => resolveNodeNetworkInspectionArgument(argument) === undefined &&
        !isNodeNetworkInspectionDefaultArgument(argument));
    if (enabled) {
        return [NODE_NETWORK_INSPECTION_ARGUMENT, ...filteredArguments];
    }
    return filteredArguments;
};
/**
 * @param {{ launchArguments: readonly string[], overrideArguments: readonly string[] }} params
 * @returns {string[]}
 */
export const resolveInitialNodeNetworkInspectionArguments = (params) => {
    const { launchArguments, overrideArguments } = params;
    const override = resolveNodeNetworkInspectionOverride(overrideArguments);
    if (override === true) {
        return setNodeNetworkInspection(launchArguments, true);
    }
    if (override === false) {
        return [
            NODE_NETWORK_INSPECTION_DISABLED_ARGUMENT,
            ...setNodeNetworkInspection(launchArguments, false),
        ];
    }
    return [
        NODE_NETWORK_INSPECTION_ARGUMENT,
        NODE_NETWORK_INSPECTION_DEFAULT_ARGUMENT,
        ...setNodeNetworkInspection(launchArguments, false),
    ];
};
/**
 * @param {{ nodeNetworkInspectionEnabled?: boolean }} [request]
 * @returns {string}
 */
export const serializeDesktopDevelopmentRestartRequest = (request = {}) => {
    if (request.nodeNetworkInspectionEnabled === true) {
        return NODE_NETWORK_INSPECTION_ENABLED_RESTART_REQUEST;
    }
    if (request.nodeNetworkInspectionEnabled === false) {
        return NODE_NETWORK_INSPECTION_DISABLED_RESTART_REQUEST;
    }
    return DESKTOP_RESTART_REQUEST;
};
/**
 * @param {string} request
 * @returns {{ nodeNetworkInspectionEnabled?: boolean }}
 */
export const parseDesktopDevelopmentRestartRequest = (request) => {
    if (request.trim() === DESKTOP_RESTART_REQUEST) {
        return {};
    }
    if (request.trim() === NODE_NETWORK_INSPECTION_ENABLED_RESTART_REQUEST) {
        return { nodeNetworkInspectionEnabled: true };
    }
    if (request.trim() === NODE_NETWORK_INSPECTION_DISABLED_RESTART_REQUEST) {
        return { nodeNetworkInspectionEnabled: false };
    }
    throw new Error('Invalid Desktop development restart request');
};
