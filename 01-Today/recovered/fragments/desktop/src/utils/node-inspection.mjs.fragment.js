// Compiled fragment from ./src/utils/node-inspection.mjs.
// The original TypeScript and import graph are not restored.




const DESKTOP_DEVELOPMENT_SUPERVISOR_DIRECTORY_PATTERN = /^today-desktop-development-supervisor-[A-Za-z0-9]{6}$/u;
const DESKTOP_DEVELOPMENT_SUPERVISOR_DIRECTORY_PREFIX = 'today-desktop-development-supervisor-';
const DESKTOP_RESTART_REQUEST = 'restart';
const NODE_NETWORK_INSPECTION_ENABLED_RESTART_REQUEST = 'node-network-inspection=enabled';
const NODE_NETWORK_INSPECTION_DISABLED_RESTART_REQUEST = 'node-network-inspection=disabled';
/**
 * @param {string} argument
 * @returns {string | undefined}
 */ const resolveNormalizedArgumentName = (argument)=>argument.split('=', 1)[0]?.replaceAll('_', '-');
/**
 * @param {string} argument
 * @returns {boolean | undefined}
 */ const resolveNodeNetworkInspectionArgument = (argument)=>{
    const normalizedName = resolveNormalizedArgumentName(argument);
    if (normalizedName === node_inspection_NODE_NETWORK_INSPECTION_ARGUMENT) {
        return true;
    }
    if (normalizedName === node_inspection_NODE_NETWORK_INSPECTION_DISABLED_ARGUMENT) {
        return false;
    }
    return undefined;
};
/**
 * @param {string} argument
 * @returns {boolean}
 */ const isNodeNetworkInspectionDefaultArgument = (argument)=>resolveNormalizedArgumentName(argument) === node_inspection_NODE_NETWORK_INSPECTION_DEFAULT_ARGUMENT;
/**
 * @param {string} directory
 * @returns {string}
 */ const createDesktopDevelopmentSupervisorArgument = (directory)=>{
    if (!isDesktopDevelopmentSupervisorDirectory(directory)) {
        throw new Error('Invalid Desktop development supervisor directory');
    }
    return `--${DESKTOP_DEVELOPMENT_SUPERVISOR_ARGUMENT_NAME}=${directory}`;
};
/**
 * @param {unknown} value
 * @returns {value is string}
 */ const isDesktopDevelopmentSupervisorDirectory = (value)=>typeof value === 'string' && (0,external_node_path_namespaceObject.isAbsolute)(value) && (0,external_node_path_namespaceObject.dirname)(value) === (0,external_node_os_namespaceObject.tmpdir)() && DESKTOP_DEVELOPMENT_SUPERVISOR_DIRECTORY_PATTERN.test((0,external_node_path_namespaceObject.basename)(value));
const resolveDesktopDevelopmentSupervisorDirectoryPrefix = ()=>join(tmpdir(), DESKTOP_DEVELOPMENT_SUPERVISOR_DIRECTORY_PREFIX);
/**
 * @param {string} directory
 * @returns {string}
 */ const resolveDesktopDevelopmentRestartRequestPath = (directory)=>{
    if (!isDesktopDevelopmentSupervisorDirectory(directory)) {
        throw new Error('Invalid Desktop development supervisor directory');
    }
    return (0,external_node_path_namespaceObject.join)(directory, 'restart.request');
};
/**
 * Treat any enabling form as active. Electron exposes runtime switches and app
 * arguments in one argv list, while Node mode splits them at the entry point;
 * a later app argument must never mask an already active runtime switch.
 *
 * @param {...readonly string[]} argumentLists
 * @returns {boolean}
 */ const isNodeNetworkInspectionEnabled = (...argumentLists)=>{
    for (const arguments_ of argumentLists){
        for (const argument of arguments_){
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
 */ const resolveNodeNetworkInspectionOverride = (...argumentLists)=>{
    let override;
    for (const arguments_ of argumentLists){
        for (const argument of arguments_){
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
 */ const resolveNodeNetworkInspectionRuntimeOverride = (...argumentLists)=>{
    for (const arguments_ of argumentLists){
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
 */ const setNodeNetworkInspection = (arguments_, enabled)=>{
    const filteredArguments = arguments_.filter((argument)=>resolveNodeNetworkInspectionArgument(argument) === undefined && !isNodeNetworkInspectionDefaultArgument(argument));
    if (enabled) {
        return [
            node_inspection_NODE_NETWORK_INSPECTION_ARGUMENT,
            ...filteredArguments
        ];
    }
    return filteredArguments;
};
/**
 * @param {{ launchArguments: readonly string[], overrideArguments: readonly string[] }} params
 * @returns {string[]}
 */ const resolveInitialNodeNetworkInspectionArguments = (params)=>{
    const { launchArguments, overrideArguments } = params;
    const override = resolveNodeNetworkInspectionOverride(overrideArguments);
    if (override === true) {
        return setNodeNetworkInspection(launchArguments, true);
    }
    if (override === false) {
        return [
            NODE_NETWORK_INSPECTION_DISABLED_ARGUMENT,
            ...setNodeNetworkInspection(launchArguments, false)
        ];
    }
    return [
        NODE_NETWORK_INSPECTION_ARGUMENT,
        NODE_NETWORK_INSPECTION_DEFAULT_ARGUMENT,
        ...setNodeNetworkInspection(launchArguments, false)
    ];
};
/**
 * @param {{ nodeNetworkInspectionEnabled?: boolean }} [request]
 * @returns {string}
 */ const serializeDesktopDevelopmentRestartRequest = (request = {})=>{
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
 */ const parseDesktopDevelopmentRestartRequest = (request)=>{
    if (request.trim() === DESKTOP_RESTART_REQUEST) {
        return {};
    }
    if (request.trim() === NODE_NETWORK_INSPECTION_ENABLED_RESTART_REQUEST) {
        return {
            nodeNetworkInspectionEnabled: true
        };
    }
    if (request.trim() === NODE_NETWORK_INSPECTION_DISABLED_RESTART_REQUEST) {
        return {
            nodeNetworkInspectionEnabled: false
        };
    }
    throw new Error('Invalid Desktop development restart request');
};
