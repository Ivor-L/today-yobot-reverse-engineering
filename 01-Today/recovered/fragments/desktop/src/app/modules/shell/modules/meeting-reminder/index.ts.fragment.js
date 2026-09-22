// Compiled fragment from ./src/app/modules/shell/modules/meeting-reminder/index.ts.
// The original TypeScript and import graph are not restored.















class ShellMeetingReminder {
    async install() {
        if (this.installed) {
            return;
        }
        this.installed = true;
        this.installIpc();
        const { account, preferences, features, record, socket } = this.adapter.sei;
        try {
            this.subscriptions.push(await account.subscribe('beforeSwitch', this.clearAccount));
            this.subscriptions.push(await account.subscribe('beforeSignOut', this.clearAccount));
            this.subscriptions.push(await account.subscribe('changed', (snapshot)=>this.applyAccount(snapshot)));
            this.subscriptions.push(await preferences.subscribe('changed', (preference)=>{
                if (preference.id === (/* inlined export .WellKnownPreferenceId.MeetingDetectionEnabled */"meeting-detection.enabled")) {
                    this.preferencesVersion += 1;
                    this.enabled = preference.available && preference.value === true;
                    this.reevaluate();
                    this.refresh();
                }
            }));
            this.subscriptions.push(await features.subscribe('changed', (feature)=>{
                if (feature.id === (/* inlined export .WellKnownFeatureId.Recording */"recording")) {
                    this.featuresVersion += 1;
                    this.recordingEnabled = feature.value === true;
                    this.reevaluate();
                    this.refresh();
                }
            }));
            this.subscriptions.push(await record.subscribe('stateChanged', (state)=>this.applyRecordState(state)));
            this.subscriptions.push(await socket.subscribe('receive', (message)=>this.receive(message)));
            this.subscriptions.push(await socket.subscribe('stateChange', (state)=>{
                if (state.status === (/* inlined export .SocketStatus.Connected */"connected")) {
                    this.refresh();
                }
            }));
            const generation = this.generation;
            const preferencesVersion = this.preferencesVersion;
            const featuresVersion = this.featuresVersion;
            const [snapshot, items, feature, state] = await Promise.all([
                account.getAccountSnapshot(),
                preferences.listPreferences(),
                features.getFeature({
                    featureId: (/* inlined export .WellKnownFeatureId.Recording */"recording")
                }),
                record.getState()
            ]);
            if (this.disposed) {
                return;
            }
            if (preferencesVersion === this.preferencesVersion) {
                this.enabled = items.some((item)=>item.id === (/* inlined export .WellKnownPreferenceId.MeetingDetectionEnabled */"meeting-detection.enabled") && item.available && item.value === true);
            }
            if (featuresVersion === this.featuresVersion) {
                this.recordingEnabled = feature.value === true;
            }
            this.applyRecordState(state);
            if (generation === this.generation) {
                this.applyAccount(snapshot);
            }
            this.configuration.application.once('will-quit', this.handleQuit);
            external_electron_.powerMonitor.on('resume', this.handleResume);
            this.refreshTimer = setInterval(this.handleResume, (/* inlined export .MEETING_REMINDER_REFRESH_MS */300000));
            this.refreshTimer.unref();
            this.refresh();
        } catch (error) {
            await this.dispose();
            throw error;
        }
    }
    async dispose() {
        this.disposed = true;
        this.clearAccount();
        clearInterval(this.refreshTimer);
        external_electron_.powerMonitor.removeListener('resume', this.handleResume);
        this.configuration.application.removeListener('will-quit', this.handleQuit);
        this.configuration.ipc.removeHandler(MEETING_REMINDER_CHANNEL);
        this.window.close();
        for (const subscription of this.subscriptions.splice(0)){
            try {
                await subscription.unsubscribe();
            } catch  {
            // Shutdown may already have disposed the Adapter.
            }
        }
    }
    /** Local Debug Console entry; follows the same timing, settings, and recording guards. */ simulate(offer) {
        if (!this.installed || this.disposed) {
            throw new Error('Meeting reminders are not ready. Wait for Today to finish starting.');
        }
        if (!this.accountId) {
            throw new Error('Sign in to Today before simulating a meeting reminder.');
        }
        if (!this.enabled) {
            throw new Error('Enable Meeting detection in Settings before simulating a reminder.');
        }
        if (!this.recordingEnabled) {
            throw new Error('Enable the Recording feature before simulating a reminder.');
        }
        if (offer.expiresAtEpochMs <= Date.now()) {
            throw new Error('The simulated reminder has expired. Choose a later expiry time.');
        }
        if (this.simulatedOffer) {
            this.seen.delete(this.simulatedOffer.id);
        }
        // A retrigger is a new presentation even when the editable offer ID is unchanged.
        this.interactedOffer = undefined;
        this.simulatedOffer = {
            ...offer,
            id: `record-debug:${offer.id}:${(0,external_node_crypto_namespaceObject.randomUUID)()}`
        };
        this.seen.delete(this.simulatedOffer.id);
        this.reevaluate();
    }
    applyAccount(snapshot) {
        const nextId = snapshot.status === (/* inlined export .AccountStatus.SignedIn */"signed-in") ? snapshot.user.id : null;
        if (this.accountId === nextId) {
            return;
        }
        this.clearAccount();
        this.accountId = nextId;
        this.refresh();
    }
    receive(message) {
        if (message.type === socketEventNames.dayInProgress.eventsChangedV1) {
            this.refresh();
            return;
        }
        if (!this.accountId || !this.enabled || !this.recordingEnabled) {
            return;
        }
        const offer = recordingOfferFromSocketMessage(message, this.accountId);
        if (!offer) {
            return;
        }
        this.offersVersion += 1;
        this.offers = [
            ...this.offers.filter((item)=>item.id !== offer.id),
            offer
        ];
        this.reevaluate();
    }
    applyRecordState(state) {
        if (state.revision < this.recordRevision) {
            return;
        }
        this.recordRevision = state.revision;
        const started = state.phase === (/* inlined export .RecordPhase.Recording */"recording") && this.recordPhase !== (/* inlined export .RecordPhase.Recording */"recording");
        this.recordPhase = state.phase;
        if (started) {
            this.interactedOffer = undefined;
            this.window.hide();
        }
        this.window.setRecording(state.phase !== (/* inlined export .RecordPhase.Idle */"idle") && state.phase !== (/* inlined export .RecordPhase.Starting */"starting"));
        this.reevaluate();
    }
    async refresh() {
        if (this.disposed || !this.accountId || !this.enabled || !this.recordingEnabled) {
            return;
        }
        const generation = this.generation;
        const version = ++this.offersVersion;
        try {
            const offers = await this.adapter.sei.record.listScheduledOffers();
            if (this.disposed || generation !== this.generation || version !== this.offersVersion) {
                return;
            }
            if (this.interactedOffer && !this.interactedOffer.id.startsWith('record-debug:') && this.interactedOffer.expiresAtEpochMs > Date.now() && !offers.some((offer)=>offer.id === this.interactedOffer?.id)) {
                this.interactedOffer = undefined;
            }
            this.offers = offers;
            this.reevaluate();
        } catch  {
        // Keep the previous valid schedule until its absolute expiry; reconnect/resume retries.
        }
    }
    reevaluate() {
        clearTimeout(this.timer);
        const now = Date.now();
        if (this.simulatedOffer && this.simulatedOffer.expiresAtEpochMs <= now && this.simulatedOffer.id !== this.interactedOffer?.id) {
            this.seen.delete(this.simulatedOffer.id);
            this.simulatedOffer = undefined;
        }
        if (this.disposed || !this.accountId || !this.enabled || !this.recordingEnabled) {
            this.interactedOffer = undefined;
            this.window.hide();
            return;
        }
        for (const [id, expiry] of this.seen){
            if (expiry <= now) {
                this.seen.delete(id);
            }
        }
        const available = [
            ...this.offers,
            ...this.simulatedOffer ? [
                this.simulatedOffer
            ] : []
        ];
        const updatedInteraction = available.find((offer)=>offer.id === this.interactedOffer?.id);
        if (updatedInteraction && this.interactedOffer && (updatedInteraction.startAtEpochMs !== this.interactedOffer.startAtEpochMs || updatedInteraction.endAtEpochMs !== this.interactedOffer.endAtEpochMs)) {
            this.interactedOffer = undefined;
        }
        if (this.interactedOffer && !available.some((offer)=>offer.id === this.interactedOffer?.id)) {
            available.push(this.interactedOffer);
        }
        const offers = available.filter((offer)=>offer.expiresAtEpochMs > now || offer.id === this.interactedOffer?.id).toSorted((left, right)=>left.startAtEpochMs - right.startAtEpochMs);
        const active = this.window.getOffer();
        const updated = offers.find((offer)=>offer.id === active?.id);
        if (updated && updated.startAtEpochMs - (/* inlined export .MEETING_REMINDER_LEAD_MS */60000) > now) {
            this.interactedOffer = undefined;
            this.seen.delete(updated.id);
        }
        const current = updated && updated.startAtEpochMs - (/* inlined export .MEETING_REMINDER_LEAD_MS */60000) <= now ? updated : undefined;
        const pendingSimulation = this.simulatedOffer && !this.seen.has(this.simulatedOffer.id) && this.simulatedOffer.startAtEpochMs - (/* inlined export .MEETING_REMINDER_LEAD_MS */60000) <= now ? this.simulatedOffer : undefined;
        const next = pendingSimulation ?? current ?? offers.find((offer)=>!this.seen.has(offer.id) && offer.startAtEpochMs - (/* inlined export .MEETING_REMINDER_LEAD_MS */60000) <= now);
        if (next) {
            this.seen.set(next.id, next.expiresAtEpochMs);
            if (next !== active) {
                if (next.id !== this.interactedOffer?.id) {
                    this.interactedOffer = undefined;
                }
                this.window.show(next);
            }
        } else if (active) {
            this.window.hide();
        }
        while(this.seen.size > (/* inlined export .MEETING_REMINDER_SEEN_LIMIT */256)){
            this.seen.delete(this.seen.keys().next().value);
        }
        const deadlines = offers.flatMap((offer)=>{
            if (offer.id === next?.id && offer.expiresAtEpochMs > now) {
                return [
                    offer.expiresAtEpochMs
                ];
            }
            if (!this.seen.has(offer.id) && offer.startAtEpochMs - (/* inlined export .MEETING_REMINDER_LEAD_MS */60000) > now) {
                return [
                    offer.startAtEpochMs - (/* inlined export .MEETING_REMINDER_LEAD_MS */60000)
                ];
            }
            return [];
        });
        if (this.simulatedOffer && this.simulatedOffer.expiresAtEpochMs > now) {
            deadlines.push(this.simulatedOffer.expiresAtEpochMs);
        }
        if (deadlines.length > 0) {
            this.timer = setTimeout(()=>this.reevaluate(), Math.min(2147483647, Math.max(1, Math.min(...deadlines) - now)));
            this.timer.unref();
        }
    }
    installIpc() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(MEETING_REMINDER_CHANNEL);
        ipc.handle(MEETING_REMINDER_CHANNEL, async (event, action, id, value, menuOpen)=>{
            if (!this.window.isTrustedSender(event)) {
                throw new Error('Rejected untrusted meeting reminder sender');
            }
            if (action === 'get') {
                return this.window.getState();
            }
            if (action === 'ready' || action === 'finish-exit') {
                if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0) {
                    throw new Error('Invalid meeting reminder presentation');
                }
                if (action === 'ready') {
                    return this.window.ready(id);
                }
                this.window.finishExit(id);
                return;
            }
            const offer = this.window.getOffer();
            if (!offer || typeof id !== 'string' || offer.id !== id || offer.expiresAtEpochMs <= Date.now() && this.interactedOffer?.id !== offer.id || !this.accountId || !this.enabled) {
                throw new Error('The meeting reminder has expired');
            }
            if (action === 'set-expanded') {
                if (typeof value !== 'boolean' || typeof menuOpen !== 'boolean' || menuOpen && !value) {
                    throw new Error('Invalid meeting reminder expansion state');
                }
                this.window.setExpanded(value, menuOpen);
                return;
            }
            if (action === 'open-settings') {
                const { buildEnvironment, macosRegion } = this.configuration.current;
                const scheme = resolveDesktopDeepLinkScheme(buildEnvironment, macosRegion);
                this.surfaces.openDeepLink(`${scheme}://settings?focus=meeting-detection&scrollRequestId=${(0,external_node_crypto_namespaceObject.randomUUID)()}`);
                this.interactedOffer = undefined;
                this.window.hide();
                this.reevaluate();
                return;
            }
            if (action === 'dismiss') {
                this.interactedOffer = undefined;
                this.window.hide();
                this.reevaluate();
                return;
            }
            if (action !== 'start' || this.recordPhase !== (/* inlined export .RecordPhase.Idle */"idle") && this.recordPhase !== (/* inlined export .RecordPhase.Starting */"starting") || !this.recordingEnabled) {
                throw new Error('Invalid meeting reminder action');
            }
            const request = this.loopRequest ? undefined : Symbol('meeting recording permission wait');
            this.interactedOffer = offer;
            if (request) {
                this.loopRequest = request;
            }
            try {
                await this.adapter.sei.record.start({
                    type: request ? base_RecordStartType.Loop : base_RecordStartType.Direct
                });
            } catch (error) {
                if (typeof error === 'object' && error !== null && 'code' in error && (error.code === base_InterfaceErrorCode.PermissionDenied || error.code === base_InterfaceErrorCode.PermissionRequired || error.code === base_InterfaceErrorCode.PermissionSettingsOpened || error.code === base_InterfaceErrorCode.Cancelled)) {
                    return;
                }
                throw new Error('Recording could not be started');
            } finally{
                if (request && this.loopRequest === request) {
                    this.loopRequest = undefined;
                }
            }
        });
    }
    constructor(){
        this.installed = false;
        this.disposed = false;
        this.generation = 0;
        this.preferencesVersion = 0;
        this.featuresVersion = 0;
        this.recordRevision = -1;
        this.offersVersion = 0;
        this.accountId = null;
        this.enabled = false;
        this.recordingEnabled = false;
        this.offers = [];
        this.seen = new Map();
        this.subscriptions = [];
        this.handleQuit = ()=>{
            this.dispose();
        };
        this.handleResume = ()=>{
            this.reevaluate();
            this.refresh();
        };
        this.clearAccount = ()=>{
            this.generation += 1;
            this.loopRequest = undefined;
            this.accountId = null;
            this.offers = [];
            this.simulatedOffer = undefined;
            this.interactedOffer = undefined;
            this.seen.clear();
            clearTimeout(this.timer);
            this.window.hide();
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellMeetingReminder.prototype, "adapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellMeetingReminder.prototype, "configuration", void 0);
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], ShellMeetingReminder.prototype, "surfaces", void 0);
__decorate([
    inject(ShellMeetingReminderWindow),
    __metadata("design:type", typeof ShellMeetingReminderWindow === "undefined" ? Object : ShellMeetingReminderWindow)
], ShellMeetingReminder.prototype, "window", void 0);
ShellMeetingReminder = __decorate([
    injectable()
], ShellMeetingReminder);
