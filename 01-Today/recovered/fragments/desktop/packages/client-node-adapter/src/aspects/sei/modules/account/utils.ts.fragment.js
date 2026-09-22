// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/utils.ts.
// The original TypeScript and import graph are not restored.



const copyPublicUser = (user)=>{
    const copy = {
        id: user.id
    };
    if (user.displayName !== undefined) {
        copy.displayName = user.displayName;
    }
    if (user.email !== undefined) {
        copy.email = user.email;
    }
    if (user.avatarUrl !== undefined) {
        copy.avatarUrl = user.avatarUrl;
    }
    return Object.freeze(copy);
};
const snapshotsEqual = (left, right)=>{
    if (left.status !== right.status) {
        return false;
    }
    if (left.status === (/* inlined export .AccountStatus.SignedOut */"signed-out") || right.status === (/* inlined export .AccountStatus.SignedOut */"signed-out")) {
        return true;
    }
    return lodash_es_isEqual(left.user, right.user);
};
