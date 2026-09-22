// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/state/index.ts.
// The original TypeScript and import graph are not restored.






class AccountState extends readonly_events_ReadonlyEvents {
    getRecord() {
        return this.record;
    }
    getGeneration() {
        return this.generation;
    }
    setRecord(record) {
        this.record = record;
    }
    set(record, generation) {
        this.record = record;
        this.generation = generation;
    }
    mutate(operation) {
        return this.tasks.run(operation);
    }
    beginLogin() {
        if (this.debt) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The previous account session is still being cleared.');
        }
        if (this.login) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'Another account login is already in progress.');
        }
        const lease = {
            generation: this.generation,
            token: Symbol('account-login')
        };
        this.login = lease;
        return lease;
    }
    ownsLogin(lease) {
        return this.login?.token === lease.token && this.generation === lease.generation;
    }
    finishLogin(lease) {
        if (this.login?.token === lease.token) {
            this.login = undefined;
        }
    }
    cancelLogin() {
        this.login = undefined;
    }
    getDebt() {
        return this.debt;
    }
    beginSignOut(previousSnapshot, event) {
        if (this.debt) {
            return this.debt;
        }
        const debt = {
            generation: this.generation + 1,
            previousSnapshot,
            event
        };
        this.debt = debt;
        this.record = null;
        this.generation = debt.generation;
        this.cancelLogin();
        return debt;
    }
    finishSignOut(debt) {
        if (this.debt !== debt) {
            return false;
        }
        this.debt = undefined;
        return true;
    }
    publish(eventName, event) {
        try {
            this.emit(eventName, event);
        } catch  {
        // Observers cannot roll back an already committed account transaction.
        }
    }
    constructor(...args){
        super(...args), this.record = null, this.generation = 0;
    }
}
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], AccountState.prototype, "tasks", void 0);
AccountState = __decorate([
    injectable()
], AccountState);
