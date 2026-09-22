/**
 * Window-scoped closures must replace their previous registration when macOS
 * recreates the main window. Electron rejects duplicate handle() calls, while
 * duplicate on() listeners silently execute the same action more than once.
 */
export function replaceWindowIpcHandler(target, channel, listener) {
    target.removeHandler(channel);
    target.handle(channel, listener);
}
export function replaceWindowIpcListener(target, channel, listener) {
    target.removeAllListeners(channel);
    target.on(channel, listener);
}
