import { RecordPhase, RecordWarning } from '@todayai-labs/platform-interface';
/** The floating surface contains capture controls; other states stay in the main app. */
export const isRecordingCapsulePresentable = (state) => state?.phase === RecordPhase.Recording ||
    state?.phase === RecordPhase.Paused ||
    (state?.phase === RecordPhase.Starting && state.resuming === true);
export const hasRecordingCapsuleWarning = (state) => (state?.phase === RecordPhase.Recording || state?.phase === RecordPhase.Paused) &&
    state.warning === RecordWarning.NoSound;
