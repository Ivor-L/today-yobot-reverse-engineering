// --- RPA Push Notification Protocol ---
export var RPAPushEventType;
(function (RPAPushEventType) {
    RPAPushEventType["SYSTEM_ERROR"] = "system_error";
    RPAPushEventType["TASK_PROGRESS"] = "task_progress";
    RPAPushEventType["SERVICE_STATE"] = "service_state"; // Service lifecycle state
})(RPAPushEventType || (RPAPushEventType = {}));
