import * as path from 'path';
/**
 * `child` 是否严格位于 `parent` 之内。
 *
 * 用 path.relative 而不是字符串前缀比较：`C:\ws-evil` 以 `C:\ws` 为前缀，但显然不在
 * 它里面。调用方须先对两侧做 realpath，否则符号链接可以绕过检查。
 */
export function isInsideDir(parent, child) {
    const relative = path.relative(parent, child);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
