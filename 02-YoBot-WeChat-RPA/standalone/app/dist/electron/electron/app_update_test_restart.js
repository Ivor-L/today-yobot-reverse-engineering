/**
 * Prepare the isolated update_test app for a real next-launch recovery.
 *
 * The production client never needs to manufacture its own "next launch": a
 * user closes it and later starts it normally. The Sandbox E2E coordinator is
 * already independent of this process, so it owns the one exact-path restart
 * after observing that this PID has disappeared. Keeping that ownership out of
 * the Electron process prevents a detached child from being lost with its
 * parent and guarantees that two clients are not intentionally overlapped.
 */
export async function executeAppUpdateTestRestartExit(dependencies) {
    dependencies.report?.('test-restart-requested');
    dependencies.markQuitting();
    dependencies.report?.('test-restart-teardown-start');
    await dependencies.teardown();
    dependencies.report?.('test-restart-teardown-complete');
    dependencies.report?.('test-restart-exit-requested');
    dependencies.requestExit();
}
