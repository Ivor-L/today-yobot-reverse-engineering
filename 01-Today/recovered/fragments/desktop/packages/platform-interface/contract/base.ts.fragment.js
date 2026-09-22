// Compiled fragment from ../../packages/platform-interface/contract/base.ts.
// The original TypeScript and import graph are not restored.

/** JSON-compatible scalar value. */ /** Runtime environment selected for the current client process. */ var base_RuntimeEnvironment = /*#__PURE__*/ function(RuntimeEnvironment) {
    /** Local or development runtime. */ RuntimeEnvironment["Development"] = "dev";
    /** Shared staging runtime. */ RuntimeEnvironment["Staging"] = "staging";
    /** Production runtime. */ RuntimeEnvironment["Production"] = "prod";
    return RuntimeEnvironment;
}({});
/** Host process that provides the current client runtime. */ var base_ClientRuntimeHost = /*#__PURE__*/ function(ClientRuntimeHost) {
    /** Regular browser runtime without an Electron host. */ ClientRuntimeHost["Browser"] = "browser";
    /** Electron runtime backed by the desktop client. */ ClientRuntimeHost["Electron"] = "electron";
    return ClientRuntimeHost;
}({});
/** Platform family exposed to Web for runtime-specific presentation decisions. */ var base_ClientRuntimePlatform = /*#__PURE__*/ function(ClientRuntimePlatform) {
    /** Platform-neutral browser runtime. */ ClientRuntimePlatform["Web"] = "web";
    /** Apple macOS desktop runtime. */ ClientRuntimePlatform["MacOS"] = "macos";
    /** Microsoft Windows desktop runtime. */ ClientRuntimePlatform["Windows"] = "windows";
    /** Linux desktop runtime. */ ClientRuntimePlatform["Linux"] = "linux";
    return ClientRuntimePlatform;
}({});
/** Product surface hosted by the current client runtime. */ var base_ClientRuntimeSurface = /*#__PURE__*/ function(ClientRuntimeSurface) {
    /** Regular Web application surface. */ ClientRuntimeSurface["Web"] = "web";
    /** Desktop application shell surface. */ ClientRuntimeSurface["AppShell"] = "app-shell";
    /** Compact desktop quick-chat surface. */ ClientRuntimeSurface["QuickChat"] = "quick-chat";
    return ClientRuntimeSurface;
}({});
/** Stable error codes shared by every interface boundary. */ var base_InterfaceErrorCode = /*#__PURE__*/ function(InterfaceErrorCode) {
    /** The provider does not implement the requested capability. */ InterfaceErrorCode["Unsupported"] = "UNSUPPORTED";
    /** The capability exists but is not currently available. */ InterfaceErrorCode["Unavailable"] = "UNAVAILABLE";
    /** The caller supplied an invalid argument. */ InterfaceErrorCode["InvalidArgument"] = "INVALID_ARGUMENT";
    /** The requested resource does not exist. */ InterfaceErrorCode["NotFound"] = "NOT_FOUND";
    /** The operation requires an authenticated account. */ InterfaceErrorCode["AuthRequired"] = "AUTH_REQUIRED";
    /** The operation requires a permission decision. */ InterfaceErrorCode["PermissionRequired"] = "PERMISSION_REQUIRED";
    /** The required permission was denied. */ InterfaceErrorCode["PermissionDenied"] = "PERMISSION_DENIED";
    /** Permission UI was opened; the operation has not started. */ InterfaceErrorCode["PermissionSettingsOpened"] = "PERMISSION_SETTINGS_OPENED";
    /** The operation conflicts with current state. */ InterfaceErrorCode["Conflict"] = "CONFLICT";
    /** The operation was cancelled before completion. */ InterfaceErrorCode["Cancelled"] = "CANCELLED";
    /** The operation exceeded its allowed duration. */ InterfaceErrorCode["DeadlineExceeded"] = "DEADLINE_EXCEEDED";
    /** The provider cannot allocate the required resource. */ InterfaceErrorCode["ResourceExhausted"] = "RESOURCE_EXHAUSTED";
    /** A required network operation failed. */ InterfaceErrorCode["NetworkError"] = "NETWORK_ERROR";
    /** An unclassified provider failure occurred. */ InterfaceErrorCode["Internal"] = "INTERNAL";
    return InterfaceErrorCode;
}({});
/** Identifier for each transport-backed top-level platform interface. */ var base_InterfaceKind = /*#__PURE__*/ function(InterfaceKind) {
    /** Node Adapter interface consumed by Web. */ InterfaceKind["WebExtended"] = "WEI";
    /** Native Host interface consumed by Node Adapter. */ InterfaceKind["CrossPlatform"] = "CPI";
    /** Node Adapter interface consumed by Native Host. */ InterfaceKind["NativeExtended"] = "NEI";
    return InterfaceKind;
}({});
/** Availability of one module in a transport descriptor. */ var base_ModuleAvailability = /*#__PURE__*/ function(ModuleAvailability) {
    /** The module is available for calls. */ ModuleAvailability["Available"] = "available";
    /** The current provider does not implement the module. */ ModuleAvailability["Unsupported"] = "unsupported";
    return ModuleAvailability;
}({});
/** Public account sign-in state. */ var base_AccountStatus = /*#__PURE__*/ function(AccountStatus) {
    /** No account is signed in. */ AccountStatus["SignedOut"] = "signed-out";
    /** One account is signed in. */ AccountStatus["SignedIn"] = "signed-in";
    return AccountStatus;
}({});
/** Origin of an account lifecycle transition. */ var base_AccountEventOrigin = /*#__PURE__*/ function(AccountEventOrigin) {
    /** Transition initiated by the current consumer context. */ AccountEventOrigin["CurrentContext"] = "current-context";
    /** Transition observed from another consumer context. */ AccountEventOrigin["ExternalContext"] = "external-context";
    return AccountEventOrigin;
}({});
/** Availability of one tool in a caller-visible catalog. */ var base_ToolAvailabilityState = /*#__PURE__*/ function(ToolAvailabilityState) {
    /** Tool can be started immediately. */ ToolAvailabilityState["Available"] = "available";
    /** Tool requires a permission decision before use. */ ToolAvailabilityState["PermissionRequired"] = "permission-required";
    /** Tool was disabled by provider or policy. */ ToolAvailabilityState["Disabled"] = "disabled";
    /** Tool exists but is temporarily unavailable. */ ToolAvailabilityState["Unavailable"] = "unavailable";
    /** Current provider does not implement the tool. */ ToolAvailabilityState["Unsupported"] = "unsupported";
    return ToolAvailabilityState;
}({});
/** Named local file roots that a user can allow independently. */ var base_ToolFileRoot = /*#__PURE__*/ function(ToolFileRoot) {
    /** The current user's desktop directory. */ ToolFileRoot["Desktop"] = "desktop";
    /** The current user's documents directory. */ ToolFileRoot["Documents"] = "documents";
    /** The current user's downloads directory. */ ToolFileRoot["Downloads"] = "downloads";
    /** Other permitted locations, excluding the three named directories. */ ToolFileRoot["OtherFiles"] = "other_files";
    return ToolFileRoot;
}({});
/** Lifecycle state of one tool task. */ var base_ToolTaskState = /*#__PURE__*/ function(ToolTaskState) {
    /** Task is currently executing. */ ToolTaskState["Running"] = "running";
    /** Task completed successfully. */ ToolTaskState["Succeeded"] = "succeeded";
    /** Task terminated with an error. */ ToolTaskState["Failed"] = "failed";
    /** Task was cancelled before completion. */ ToolTaskState["Cancelled"] = "cancelled";
    return ToolTaskState;
}({});
/** Current authorization state for one permission. */ var base_PermissionState = /*#__PURE__*/ function(PermissionState) {
    /** Provider cannot determine a more specific state. */ PermissionState["Unknown"] = "unknown";
    /** User has not made a permission decision. */ PermissionState["NotDetermined"] = "not-determined";
    /** Permission is fully granted. */ PermissionState["Granted"] = "granted";
    /** Permission is granted with platform limitations. */ PermissionState["Limited"] = "limited";
    /** User denied the permission. */ PermissionState["Denied"] = "denied";
    /** System policy prevents granting the permission. */ PermissionState["Restricted"] = "restricted";
    /** Permission does not exist in the current provider. */ PermissionState["Unavailable"] = "unavailable";
    return PermissionState;
}({});
/** User action supported for one permission. */ var base_PermissionAction = /*#__PURE__*/ function(PermissionAction) {
    /** Request the permission through the platform prompt. */ PermissionAction["Request"] = "request";
    /** Open the platform settings surface for the permission. */ PermissionAction["OpenSettings"] = "open-settings";
    return PermissionAction;
}({});
/** Stable permission identifiers shared by every provider and consumer. */ var base_WellKnownPermissionId = /*#__PURE__*/ (/* unused pure expression or super */ null && (function(WellKnownPermissionId) {
    /** Permission to deliver application notifications. */ WellKnownPermissionId["Notifications"] = "notifications";
    return WellKnownPermissionId;
}({})));
/** Stable preference identifiers shared by every provider and consumer. */ var base_WellKnownPreferenceId = /*#__PURE__*/ function(WellKnownPreferenceId) {
    /** Whether message notifications are enabled. */ WellKnownPreferenceId["MessageNotificationsEnabled"] = "message-notifications.enabled";
    /** Whether upcoming calendar meetings prompt the user to start recording. */ WellKnownPreferenceId["MeetingDetectionEnabled"] = "meeting-detection.enabled";
    /**
   * Whether the Browser provider prints structured event logs to the browser
   * console. Browser-only; Client Node providers do not register this item.
   */ WellKnownPreferenceId["BrowserEventLogsEnabled"] = "browser.event-logs.enabled";
    /**
   * Whether the desktop client requests prevent-sleep behavior while running,
   * so tasks keep executing when the screen turns off. Providers report
   * support through PreferenceInfo.available.
   */ WellKnownPreferenceId["DesktopPreventSleepWhileRunning"] = "desktop.prevent-sleep-while-running";
    return WellKnownPreferenceId;
}({});
/** Severity assigned to one structured log event. */ var base_LogLevel = /*#__PURE__*/ function(LogLevel) {
    /** A failure that prevents an operation from completing. */ LogLevel["Error"] = "error";
    /** A recoverable or potentially harmful condition. */ LogLevel["Warning"] = "warning";
    /** An informational lifecycle or business event. */ LogLevel["Info"] = "info";
    /** General diagnostic output. */ LogLevel["Log"] = "log";
    return LogLevel;
}({});
/** Destination selected for one structured log event. */ var base_PushTarget = /*#__PURE__*/ function(PushTarget) {
    /** Product analytics event ingestion. */ PushTarget["PostHog"] = "posthog";
    /** Error and diagnostic event ingestion. */ PushTarget["Sentry"] = "sentry";
    /** Local persistent log storage. */ PushTarget["File"] = "file";
    /** Current runtime console output. */ PushTarget["Console"] = "console";
    return PushTarget;
}({});
/** Lifecycle status of one asynchronous local-log upload. */ var base_LocalLogUploadStatus = /*#__PURE__*/ function(LocalLogUploadStatus) {
    /** A local-log batch is being uploaded. */ LocalLogUploadStatus["Uploading"] = "uploading";
    /** The local-log batch was uploaded successfully. */ LocalLogUploadStatus["Completed"] = "completed";
    /** The local-log batch could not be uploaded. */ LocalLogUploadStatus["Failed"] = "failed";
    return LocalLogUploadStatus;
}({});
/** Stable shortcut identifiers shared by providers and consumers. */ var base_WellKnownShortcutId = /*#__PURE__*/ function(WellKnownShortcutId) {
    /** Opens or closes chat-history search in the primary chat surface. */ WellKnownShortcutId["ChatHistorySearch"] = "chat-history-search";
    /** Shows or hides the desktop quick-chat surface. */ WellKnownShortcutId["QuickChat"] = "quick-chat";
    return WellKnownShortcutId;
}({});
/** Modifier keys supported by portable shortcut bindings. */ var base_ShortcutModifier = /*#__PURE__*/ function(ShortcutModifier) {
    /** Control modifier. */ ShortcutModifier["Control"] = "control";
    /** Alt or Option modifier. */ ShortcutModifier["Alt"] = "alt";
    /** Shift modifier. */ ShortcutModifier["Shift"] = "shift";
    /** Command or platform Meta modifier. */ ShortcutModifier["Meta"] = "meta";
    return ShortcutModifier;
}({});
/** Scope in which a registered shortcut may be triggered. */ var base_ShortcutScope = /*#__PURE__*/ function(ShortcutScope) {
    /** Trigger only while an application Web surface has keyboard focus. */ ShortcutScope["Foreground"] = "foreground";
    /** Trigger even while the application is not in the foreground. */ ShortcutScope["Global"] = "global";
    return ShortcutScope;
}({});
/** Discriminant selecting one shortcut binding form. */ var base_ShortcutBindingKind = /*#__PURE__*/ function(ShortcutBindingKind) {
    /** One non-modifier key pressed together with side-agnostic modifiers. */ ShortcutBindingKind["KeyCombination"] = "key-combination";
    /** One modifier pressed twice in quick succession. */ ShortcutBindingKind["ModifierDoubleTap"] = "modifier-double-tap";
    /** Several concrete physical modifier keys held together. */ ShortcutBindingKind["ModifierChord"] = "modifier-chord";
    return ShortcutBindingKind;
}({});
/** Physical side of one concrete modifier key. */ var base_PhysicalModifierSide = /*#__PURE__*/ function(PhysicalModifierSide) {
    /** Left-hand modifier key. */ PhysicalModifierSide["Left"] = "left";
    /** Right-hand modifier key. */ PhysicalModifierSide["Right"] = "right";
    return PhysicalModifierSide;
}({});
/** Side requirement of one modifier-double-tap gesture. */ var base_ModifierDoubleTapSide = /*#__PURE__*/ function(ModifierDoubleTapSide) {
    /** Only the left-hand modifier key counts. */ ModifierDoubleTapSide["Left"] = "left";
    /** Only the right-hand modifier key counts. */ ModifierDoubleTapSide["Right"] = "right";
    /** Either modifier key may be used, but both taps must use the same side. */ ModifierDoubleTapSide["Either"] = "either";
    return ModifierDoubleTapSide;
}({});
/** Stable feature identifiers shared by providers and consumers. */ var base_WellKnownFeatureId = /*#__PURE__*/ function(WellKnownFeatureId) {
    /** Whether the current surface may present the application's side panel. */ WellKnownFeatureId["ShowSidePanel"] = "show-side-panel";
    /** Whether the current provider allows the entry for starting a new recording. */ WellKnownFeatureId["Recording"] = "recording";
    return WellKnownFeatureId;
}({});
/** Permission-waiting policy for starting the shared Recording workflow. */ var base_RecordStartType = /*#__PURE__*/ function(RecordStartType) {
    /** Check once; request missing permission and return without waiting for authorization. */ RecordStartType["Direct"] = "direct";
    /** If initially focused, wait for blur and refocus before checking permission again. */ RecordStartType["WaitRefocused"] = "wait-refocused";
    /** Poll permission once per second for up to ninety seconds. */ RecordStartType["Loop"] = "loop";
    return RecordStartType;
}({});
/** Caller-visible phase of the Recording business workflow. */ var base_RecordPhase = /*#__PURE__*/ function(RecordPhase) {
    /** No Recording workflow is currently presented. */ RecordPhase["Idle"] = "idle";
    /** Recording startup is in progress. */ RecordPhase["Starting"] = "starting";
    /** Audio is actively being captured. */ RecordPhase["Recording"] = "recording";
    /** The active Recording workflow is paused. */ RecordPhase["Paused"] = "paused";
    /** Captured audio is being finalized and sent to the service. */ RecordPhase["Processing"] = "processing";
    /** The Recording workflow failed and may offer recovery actions. */ RecordPhase["Failed"] = "failed";
    return RecordPhase;
}({});
/** Current service-processing step after audio capture stops. */ var base_RecordProcessingStage = /*#__PURE__*/ function(RecordProcessingStage) {
    /** The final local audio segment is being finalized. */ RecordProcessingStage["Finalizing"] = "finalizing";
    /** Finalized audio segments are being uploaded. */ RecordProcessingStage["Uploading"] = "uploading";
    /** Retained audio is waiting for connectivity or a bounded automatic send retry. */ RecordProcessingStage["Retrying"] = "retrying";
    /** The complete server capture is being sealed. */ RecordProcessingStage["Sealing"] = "sealing";
    /** The sealed capture is waiting for its authoritative transcription outcome. */ RecordProcessingStage["Transcribing"] = "transcribing";
    return RecordProcessingStage;
}({});
/** Nonterminal capture warning that does not pause recording. */ var base_RecordWarning = /*#__PURE__*/ function(RecordWarning) {
    RecordWarning["NoSound"] = "no-sound";
    return RecordWarning;
}({});
/** Localizable recording failure classifications. */ var base_RecordFailureReason = /*#__PURE__*/ function(RecordFailureReason) {
    RecordFailureReason["NoUsableSpeech"] = "no-usable-speech";
    RecordFailureReason["CaptureInterrupted"] = "capture-interrupted";
    RecordFailureReason["LocalStoragePending"] = "local-storage-pending";
    RecordFailureReason["UploadFailed"] = "upload-failed";
    return RecordFailureReason;
}({});
/** Atomic action supported by the update provider. */ var base_UpdateAction = /*#__PURE__*/ function(UpdateAction) {
    /** Check whether an update is available. */ UpdateAction["Check"] = "check";
    /** Download the available update. */ UpdateAction["Download"] = "download";
    /** Install the downloaded update. */ UpdateAction["Install"] = "install";
    /** Restart the application to complete an update. */ UpdateAction["Restart"] = "restart";
    /** Open the external update source. */ UpdateAction["OpenUpdateSource"] = "open-update-source";
    return UpdateAction;
}({});
/** Current lifecycle state of application updates. */ var base_UpdateStatus = /*#__PURE__*/ function(UpdateStatus) {
    /** Current provider does not support application updates. */ UpdateStatus["Unsupported"] = "unsupported";
    /** Updater is idle. */ UpdateStatus["Idle"] = "idle";
    /** Updater is checking for an update. */ UpdateStatus["Checking"] = "checking";
    /** Installed version is current. */ UpdateStatus["UpToDate"] = "up-to-date";
    /** An update is available. */ UpdateStatus["Available"] = "available";
    /** Available update is downloading. */ UpdateStatus["Downloading"] = "downloading";
    /** Downloaded update is ready to install. */ UpdateStatus["Ready"] = "ready";
    /** Update is being applied. */ UpdateStatus["Applying"] = "applying";
    /** Application restart is required. */ UpdateStatus["RestartRequired"] = "restart-required";
    /** Update completion was handed to an external source. */ UpdateStatus["ExternalHandoff"] = "external-handoff";
    /** Updater encountered an error. */ UpdateStatus["Failed"] = "failed";
    return UpdateStatus;
}({});
/** Whether the current application version may continue to use the product. */ var base_UpdateRequirement = /*#__PURE__*/ function(UpdateRequirement) {
    /** The user may continue using the application without installing an update. */ UpdateRequirement["Optional"] = "optional";
    /** The user must update or exit before continuing to use the application. */ UpdateRequirement["Required"] = "required";
    return UpdateRequirement;
}({});
/** Origin of one update check attempt. */ var base_UpdateCheckTrigger = /*#__PURE__*/ function(UpdateCheckTrigger) {
    /** Automatic check shortly after application startup. */ UpdateCheckTrigger["ScheduledStartup"] = "scheduled-startup";
    /** Automatic recurring check while the application remains running. */ UpdateCheckTrigger["ScheduledInterval"] = "scheduled-interval";
    /** User-initiated check from a platform update entry point. */ UpdateCheckTrigger["Manual"] = "manual";
    /** User-initiated retry after a visible update failure. */ UpdateCheckTrigger["ManualRetry"] = "manual-retry";
    return UpdateCheckTrigger;
}({});
/** Current unified Socket lifecycle status. */ var base_SocketStatus = /*#__PURE__*/ function(SocketStatus) {
    /** Socket is idle. */ SocketStatus["Idle"] = "idle";
    /** Socket is connecting. */ SocketStatus["Connecting"] = "connecting";
    /** Socket is connected. */ SocketStatus["Connected"] = "connected";
    /** Socket is recovering a previous connection. */ SocketStatus["Reconnecting"] = "reconnecting";
    /** Socket requires a signed-in account. */ SocketStatus["AuthRequired"] = "auth-required";
    /** Socket stopped after an error. */ SocketStatus["Failed"] = "failed";
    return SocketStatus;
}({});
/** Direction of one transport-neutral Socket packet observed at its owning layer. */ var base_DebugSocketPacketDirection = /*#__PURE__*/ function(DebugSocketPacketDirection) {
    /** Packet received from the remote Socket endpoint. */ DebugSocketPacketDirection["Incoming"] = "incoming";
    /** Packet sent to the remote Socket endpoint. */ DebugSocketPacketDirection["Outgoing"] = "outgoing";
    return DebugSocketPacketDirection;
}({});
/** Socket debug transport implementation. */ var base_DebugSocketTransport = /*#__PURE__*/ (/* unused pure expression or super */ null && (function(DebugSocketTransport) {
    /** WebSocket client owned by the current context. */ DebugSocketTransport["Classic"] = "classic";
    /** WebSocket client owned by a SharedWorker. */ DebugSocketTransport["Shared"] = "shared";
    return DebugSocketTransport;
}({})));
/** Direction of one Socket debug record. */ var base_DebugSocketDirection = /*#__PURE__*/ (/* unused pure expression or super */ null && (function(DebugSocketDirection) {
    /** Frame received from the remote endpoint. */ DebugSocketDirection["Incoming"] = "incoming";
    /** Frame sent to the remote endpoint. */ DebugSocketDirection["Outgoing"] = "outgoing";
    /** Internal lifecycle or diagnostic record. */ DebugSocketDirection["Internal"] = "internal";
    return DebugSocketDirection;
}({})));
/** Connection status observed by the Socket debug provider. */ var base_DebugSocketConnectionStatus = /*#__PURE__*/ (/* unused pure expression or super */ null && (function(DebugSocketConnectionStatus) {
    /** No Socket connection is active. */ DebugSocketConnectionStatus["Idle"] = "idle";
    /** Socket connection is being established. */ DebugSocketConnectionStatus["Connecting"] = "connecting";
    /** Socket connection is active. */ DebugSocketConnectionStatus["Connected"] = "connected";
    /** Socket connection is being re-established. */ DebugSocketConnectionStatus["Reconnecting"] = "reconnecting";
    /** Remote endpoint rejected current credentials. */ DebugSocketConnectionStatus["Unauthorized"] = "unauthorized";
    /** Socket connection has closed. */ DebugSocketConnectionStatus["Closed"] = "closed";
    /** Socket connection encountered an error. */ DebugSocketConnectionStatus["Error"] = "error";
    return DebugSocketConnectionStatus;
}({})));
/** SharedWorker status observed by the Socket debug provider. */ var base_DebugSocketWorkerStatus = /*#__PURE__*/ (/* unused pure expression or super */ null && (function(DebugSocketWorkerStatus) {
    /** No SharedWorker connection is active. */ DebugSocketWorkerStatus["Idle"] = "idle";
    /** SharedWorker connection is being established. */ DebugSocketWorkerStatus["Connecting"] = "connecting";
    /** SharedWorker connection is active. */ DebugSocketWorkerStatus["Connected"] = "connected";
    /** SharedWorker connection is being re-established. */ DebugSocketWorkerStatus["Reconnecting"] = "reconnecting";
    /** Client is using its non-SharedWorker fallback. */ DebugSocketWorkerStatus["Fallback"] = "fallback";
    /** SharedWorker is unavailable in the current runtime. */ DebugSocketWorkerStatus["Unavailable"] = "unavailable";
    /** SharedWorker connection has closed. */ DebugSocketWorkerStatus["Closed"] = "closed";
    /** SharedWorker connection encountered an error. */ DebugSocketWorkerStatus["Error"] = "error";
    return DebugSocketWorkerStatus;
}({})));
/** Component that produced one Socket debug record. */ var base_DebugSocketSource = /*#__PURE__*/ (/* unused pure expression or super */ null && (function(DebugSocketSource) {
    /** Classic Socket client. */ DebugSocketSource["Classic"] = "classic";
    /** SharedWorker-facing client. */ DebugSocketSource["SharedClient"] = "shared-client";
    /** SharedWorker runtime. */ DebugSocketSource["SharedWorker"] = "shared-worker";
    return DebugSocketSource;
}({})));
