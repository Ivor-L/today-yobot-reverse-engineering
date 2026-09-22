export class UserInteractionRequiredError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserInteractionRequiredError';
    }
}
