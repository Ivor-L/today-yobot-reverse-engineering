// Compiled fragment from ../../packages/platform-interface/contract/cpi.ts.
// The original TypeScript and import graph are not restored.

/** Lifecycle status of the platform-neutral audio capture primitive. */ var cpi_AudioCaptureStatus = /*#__PURE__*/ function(AudioCaptureStatus) {
    /** No audio capture is active. */ AudioCaptureStatus["Idle"] = "idle";
    /** The native owner retains this capture, including audio awaiting persistence after stop. */ AudioCaptureStatus["Capturing"] = "capturing";
    return AudioCaptureStatus;
}({});
/** PCM signal health, independent of the display level's noise floor. */ var cpi_AudioCaptureHealth = /*#__PURE__*/ function(AudioCaptureHealth) {
    AudioCaptureHealth["Healthy"] = "healthy";
    AudioCaptureHealth["Silent"] = "silent";
    return AudioCaptureHealth;
}({});
/** Stable terminal classifications exposed by the audio capture primitive. */ var cpi_AudioCaptureFailureCode = /*#__PURE__*/ function(AudioCaptureFailureCode) {
    /** Capture stopped because the local audio pipeline became unavailable. */ AudioCaptureFailureCode["Unavailable"] = "UNAVAILABLE";
    /** Capture stopped because a bounded local resource was exhausted. */ AudioCaptureFailureCode["ResourceExhausted"] = "RESOURCE_EXHAUSTED";
    /** Capture stopped because the local audio pipeline violated an internal invariant. */ AudioCaptureFailureCode["Internal"] = "INTERNAL";
    return AudioCaptureFailureCode;
}({});
/**
 * Device data sources whose complete snapshots the Node owner synchronizes to Today Cloud.
 * Identifiers are owned by the server policy; Native selects the local source by them and does
 * not interpret their meaning.
 */ var cpi_DeviceConnectorCapability = /*#__PURE__*/ function(DeviceConnectorCapability) {
    /** Calendar events of every readable calendar. */ DeviceConnectorCapability["CalendarEvents"] = "calendar.events.list";
    /** Reminders of every readable list. */ DeviceConnectorCapability["Reminders"] = "reminders.list";
    return DeviceConnectorCapability;
}({});
/** Discriminator for the outcome of one snapshot read. */ var cpi_DeviceConnectorSnapshotOutcome = /*#__PURE__*/ function(DeviceConnectorSnapshotOutcome) {
    /** A complete snapshot was read. */ DeviceConnectorSnapshotOutcome["Snapshot"] = "snapshot";
    /**
   * At least one fact lost its identity dimension on the wire (identifier over limit, or a
   * recurrence rule over limit without a fallback). The contract forbids submitting a partial
   * set, so the owner must skip this round; this is a result, not a transport error.
   */ DeviceConnectorSnapshotOutcome["IdentityLost"] = "identity-lost";
    return DeviceConnectorSnapshotOutcome;
}({});
/** Account state synchronized from Node Adapter to Native Host. */ var cpi_NativeAccountStatus = /*#__PURE__*/ function(NativeAccountStatus) {
    /** Native Host is not associated with an account. */ NativeAccountStatus["SignedOut"] = "signed-out";
    /** Native Host is associated with one signed-in account. */ NativeAccountStatus["SignedIn"] = "signed-in";
    return NativeAccountStatus;
}({});
/** Risk classification assigned to a Native tool registration. */ var cpi_ToolRiskLevel = /*#__PURE__*/ (/* unused pure expression or super */ null && (function(ToolRiskLevel) {
    /** Low-risk local operation. */ ToolRiskLevel["Low"] = "low";
    /** Medium-risk local operation. */ ToolRiskLevel["Medium"] = "medium";
    /** High-risk local operation. */ ToolRiskLevel["High"] = "high";
    /** Critical local operation requiring the strongest controls. */ ToolRiskLevel["Critical"] = "critical";
    return ToolRiskLevel;
}({})));
/** Operating system reported by the Native Host. */ var cpi_SystemPlatform = /*#__PURE__*/ function(SystemPlatform) {
    /** Apple macOS. */ SystemPlatform["MacOS"] = "macos";
    /** Microsoft Windows. */ SystemPlatform["Windows"] = "windows";
    /** Linux-based operating system. */ SystemPlatform["Linux"] = "linux";
    return SystemPlatform;
}({});
/** CPU architecture reported by the Native Host. */ var cpi_CpuArchitecture = /*#__PURE__*/ (/* unused pure expression or super */ null && (function(CpuArchitecture) {
    /** 64-bit ARM architecture. */ CpuArchitecture["Arm64"] = "arm64";
    /** 64-bit x86 architecture. */ CpuArchitecture["X64"] = "x64";
    /** Architecture not represented by another enum member. */ CpuArchitecture["Other"] = "other";
    return CpuArchitecture;
}({})));
/** Quick Chat shortcut choice stored by the previous native macOS client. */ var cpi_MacOSLegacyQuickChatShortcutOption = /*#__PURE__*/ function(MacOSLegacyQuickChatShortcutOption) {
    /** The legacy client observed a double tap of either Option key. */ MacOSLegacyQuickChatShortcutOption["DoubleOption"] = "double-option";
    /** The legacy client used the Option+Space combination. */ MacOSLegacyQuickChatShortcutOption["OptionSpace"] = "option-space";
    /** The legacy client used a recorded custom combination. */ MacOSLegacyQuickChatShortcutOption["Custom"] = "custom";
    /** The legacy client had no Quick Chat shortcut. */ MacOSLegacyQuickChatShortcutOption["NoShortcut"] = "no-shortcut";
    return MacOSLegacyQuickChatShortcutOption;
}({});
