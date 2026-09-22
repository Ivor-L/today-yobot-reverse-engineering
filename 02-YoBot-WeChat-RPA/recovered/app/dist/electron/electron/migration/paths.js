import os from "node:os";
import path from "node:path";
export function getManagedDataLayout(userHome = os.homedir()) {
    return {
        userHome,
        yokoagent: path.join(userHome, ".yokoagent"),
        webot: path.join(userHome, ".webot"),
        yokowebot: path.join(userHome, ".yokowebot"),
    };
}
