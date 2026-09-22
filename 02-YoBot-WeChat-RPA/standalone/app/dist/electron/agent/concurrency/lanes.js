export class LaneManager {
    lanes = new Map();
    /**
     * Executes a task in a serialized lane for the given sessionId.
     * Ensures that tasks for the same session do not run in parallel.
     */
    async runInLane(sessionId, task) {
        // Get the current tail of the queue (or resolved promise if empty)
        const currentLane = this.lanes.get(sessionId) || Promise.resolve();
        // Create a new promise that chains the task to the current tail
        // We need to return the result of the task, but we also need to update the map with a promise that resolves when the task is done (regardless of success/failure).
        const taskPromise = currentLane.then(async () => {
            return await task();
        });
        // We need a promise that always resolves to keep the lane alive
        const lanePromise = taskPromise
            .then(() => { })
            .catch(() => { });
        this.lanes.set(sessionId, lanePromise);
        // Clean up lane if empty? (Optional, maybe TTL later)
        // For now, let it grow.
        return taskPromise;
    }
    /**
     * Check if a lane is busy (Optional helper)
     */
    isBusy(sessionId) {
        // This is hard with just Promises. We'd need a flag or inspect the promise.
        // For now, we assume if it's in the map, it might be active, but promises resolve.
        // So this is not accurate.
        return this.lanes.has(sessionId);
    }
}
