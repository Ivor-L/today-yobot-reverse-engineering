// Compiled fragment from ./src/app/utils/inject.ts.
// The original TypeScript and import graph are not restored.

const getFromContainer = (container, ...classes)=>{
    return classes.map((Class)=>container.get(Class));
};
