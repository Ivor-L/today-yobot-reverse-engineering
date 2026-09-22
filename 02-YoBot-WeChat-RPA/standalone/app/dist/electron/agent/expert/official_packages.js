import * as path from "node:path";
import { ProfileLoader } from "../profile/loader.js";
import { ExpertComponentRegistry } from "./component_registry.js";
/**
 * Official identity is admitted only from this application-controlled root. Workspace files are
 * intentionally excluded even if they copy the same manifest fields or publisher badge.
 */
export function resolveBundledExpertDirectory(env = process.env, cwd = process.cwd()) {
    // Production must never fall back to cwd when the packaged directory is missing: cwd may be
    // writable by the user and therefore cannot substitute for the application trust root.
    if (env.RESOURCES_PATH)
        return path.join(env.RESOURCES_PATH, "experts");
    return path.join(cwd, "experts");
}
export function createBundledExpertProfileLoader(env = process.env, cwd = process.cwd()) {
    return new ProfileLoader(resolveBundledExpertDirectory(env, cwd));
}
export function resolveBundledExpertComponentDirectory(env = process.env, cwd = process.cwd()) {
    if (env.RESOURCES_PATH)
        return path.join(env.RESOURCES_PATH, "expert-components");
    return path.join(cwd, "expert-components");
}
export function createBundledExpertComponentRegistry(env = process.env, cwd = process.cwd()) {
    return new ExpertComponentRegistry(resolveBundledExpertComponentDirectory(env, cwd));
}
