// Compiled fragment from ./src/modules/recording-capsule-presentation.ts.
// The original TypeScript and import graph are not restored.


/** The floating surface contains capture controls; other states stay in the main app. */ const isRecordingCapsulePresentable = (state)=>state?.phase === (/* inlined export .RecordPhase.Recording */"recording") || state?.phase === (/* inlined export .RecordPhase.Paused */"paused") || state?.phase === (/* inlined export .RecordPhase.Starting */"starting") && state.resuming === true;
const hasRecordingCapsuleWarning = (state)=>(state?.phase === (/* inlined export .RecordPhase.Recording */"recording") || state?.phase === (/* inlined export .RecordPhase.Paused */"paused")) && state.warning === (/* inlined export .RecordWarning.NoSound */"no-sound");
