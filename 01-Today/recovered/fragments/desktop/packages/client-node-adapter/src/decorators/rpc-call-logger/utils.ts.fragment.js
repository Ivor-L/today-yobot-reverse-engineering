// Compiled fragment from ../../packages/client-node-adapter/src/decorators/rpc-call-logger/utils.ts.
// The original TypeScript and import graph are not restored.


const SENSITIVE_KEY_PATTERN = /(?:address|authorization|cookie|credential|displayname|email|firstname|fullname|lastname|oauth|pass(?:word)?|phone|secret|session|ticket|token|username|verificationcode|otp|^code$)/i;
const PRIVATE_CONTENT_KEY_PATTERN = /(?:content|detail|input|message|payload|result|text|value)/i;
const PRIVATE_LOCATION_KEY_PATTERN = /(?:path|uri|url)/i;
const sanitizeString = (value, budget)=>{
    const length = Math.max(0, Math.min(value.length, (/* inlined export .MAX_SNAPSHOT_STRING_LENGTH */2048), budget.remainingStringLength));
    budget.remainingStringLength -= length;
    if (length === value.length) {
        return value;
    }
    if (length === 0) {
        return UNAVAILABLE_VALUE;
    }
    return `${value.slice(0, length)}…`;
};
const reserveItem = (budget)=>{
    if (budget.remainingItems <= 0) {
        return false;
    }
    budget.remainingItems -= 1;
    return true;
};
const isPrivateKey = (value)=>{
    if (value.length > (/* inlined export .MAX_SNAPSHOT_STRING_LENGTH */2048)) {
        return true;
    }
    const normalized = value.replaceAll(/[^a-z0-9]/gi, '');
    return SENSITIVE_KEY_PATTERN.test(normalized) || PRIVATE_CONTENT_KEY_PATTERN.test(normalized) || PRIVATE_LOCATION_KEY_PATTERN.test(normalized);
};
const snapshotValue = (value, depth, ancestors, budget)=>{
    if (!reserveItem(budget)) {
        return UNAVAILABLE_VALUE;
    }
    if (value === null || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return sanitizeString(value, budget);
    }
    if (typeof value === 'number') {
        if (Number.isFinite(value)) {
            return value;
        }
        return UNAVAILABLE_VALUE;
    }
    if (typeof value === 'bigint') {
        return UNAVAILABLE_VALUE;
    }
    if (value instanceof Error) {
        return UNAVAILABLE_VALUE;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value !== 'object' || depth >= (/* inlined export .MAX_SNAPSHOT_DEPTH */8)) {
        return UNAVAILABLE_VALUE;
    }
    if (ancestors.has(value)) {
        return UNAVAILABLE_VALUE;
    }
    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            return value.slice(0, (/* inlined export .MAX_SNAPSHOT_ITEMS */100)).map((item)=>snapshotValue(item, depth + 1, ancestors, budget));
        }
        const snapshot = Object.create(null);
        let snapshotItemCount = 0;
        for(const rawKey in value){
            if (!Object.prototype.hasOwnProperty.call(value, rawKey)) {
                continue;
            }
            if (snapshotItemCount >= (/* inlined export .MAX_SNAPSHOT_ITEMS */100) || !reserveItem(budget)) {
                break;
            }
            snapshotItemCount += 1;
            if (budget.remainingStringLength <= 0) {
                break;
            }
            const key = sanitizeString(rawKey, budget);
            if (isPrivateKey(rawKey)) {
                snapshot[key] = REDACTED_VALUE;
                continue;
            }
            const child = Reflect.get(value, rawKey);
            snapshot[key] = snapshotValue(child, depth + 1, ancestors, budget);
        }
        return snapshot;
    } catch  {
        return UNAVAILABLE_VALUE;
    } finally{
        ancestors.delete(value);
    }
};
const createRpcSnapshot = (value)=>{
    try {
        return snapshotValue(value, 0, new WeakSet(), {
            remainingItems: (/* inlined export .MAX_SNAPSHOT_TOTAL_ITEMS */1000),
            remainingStringLength: (/* inlined export .MAX_SNAPSHOT_TOTAL_STRING_LENGTH */65536)
        });
    } catch  {
        return UNAVAILABLE_VALUE;
    }
};
const createRpcRequestSnapshot = (args)=>{
    if (args.length === 0) {
        return null;
    }
    if (args.length === 1) {
        return createRpcSnapshot(args[0]);
    }
    return createRpcSnapshot(args);
};
