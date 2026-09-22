// Compiled fragment from ../../packages/socket/src/url.ts.
// The original TypeScript and import graph are not restored.

function trimTrailingSlashes(value) {
    let end = value.length;
    while(end > 0 && value.charCodeAt(end - 1) === 47){
        end -= 1;
    }
    return end === value.length ? value : value.slice(0, end);
}
