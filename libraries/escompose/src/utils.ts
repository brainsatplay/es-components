const isPromise = (o) => typeof o === 'object' && typeof o.then === 'function'

// Resolve if promise or object
export const resolve = (object, callback?) => {

    // can resolve arrays with promises
    if (typeof object === 'object' && Array.isArray(object) && object.find(v => isPromise(v))) object = Promise.all(object)

    // resolves with or without callback 
    if (isPromise(object)) {
        return new Promise(resolvePromise => {
            object.then(async (res) => {
                const output = (callback) ? callback(res) : res
                resolvePromise(output)
            })
        })
    } else {
        return (callback) ? callback(object) : object
    }
}

// ------------ Merge ------------
// Merge individual object keys AND nest functions to maintain their bindings
// -------------------------------

export const merge = (
    main, 
    override, 

    path: any[] = [],  // for debugging only
    updateOriginal = false, // choose to update original
    composeFunctions: boolean = false, // use composition on functions
    seen: any[]=[], // for circular references
) => {

    const copy = (updateOriginal) ? main : Object.assign({}, main) // choose to copy
    if (override){

        const keys = Object.keys(copy)
        const newKeys = new Set(Object.keys(override))

        keys.forEach(k => {
            newKeys.delete(k)

            const thisPath = [...path, k]

            // Merge individual object keys
            if (typeof override[k] === 'object' && !Array.isArray(override[k])) {

                    // Track seen so you don't drill infinitely on circular references
                    if (typeof copy[k] === 'object') {
                        const val = copy[k]
                        const idx = seen.indexOf(val)
                        if (idx !== -1) copy[k] = seen[idx]
                        else {
                            seen.push(val)
                            copy[k] =  merge(val, override[k], thisPath, updateOriginal, seen)
                        }
                    }
                    else copy[k] = override[k]
            } 

            // Nest functions
            else if (typeof override[k] === 'function') {

                const original = copy[k]
                const isFunc = typeof original === 'function'
                if (isFunc && !original.functionList) original.functionList = [original]

                const newFunc = override[k]
                const composeFunction = newFunc.__compose === true

                // Direct Function Replacement
                if (!isFunc || (!composeFunctions && !composeFunction)) copy[k] = newFunc
                
                // Function Composition
                else {
                    if (!original.functionList.includes(newFunc)) {
                        const func = copy[k] = function(...args) {
                            const res = original.call(this, ...args);
                            return newFunc.call(this, ...Array.isArray(res) ? res : [res]);
                        } as Function & {functionList?: Function[]}
                        if (!func.functionList) func.functionList = [original]
                        func.functionList.push(override)
                    } else console.warn(`This function was already composed into ${thisPath.join('.')}. Ignoring duplicate.`)
                }

            }
            
            // Replace values and arrays
            else if (k in override) copy[k] = override[k]
        })

        newKeys.forEach(k => copy[k] = override[k])
    }

    return copy // named exports
}