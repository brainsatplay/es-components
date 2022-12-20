import { shallow } from "../../../common/clone"
import { all } from "../../../common/properties"

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
    updateOriginal: boolean = false, // choose to update original
    flipPrecedence: boolean = false, // flip precedence of merge
    composeFunctions: boolean = false, // use composition on functions
    seen: any[]=[], // for circular references
) => {

    let copy = (updateOriginal) ? main : shallow(main) // choose to copy

    if (flipPrecedence) [copy, override] = [override, copy]

    if (override){

        const keys = all(copy)
        const newKeys = new Set(all(override))

        keys.forEach(k => {
            newKeys.delete(k)

            // Merge individual object keys
            if (typeof override[k] === 'object' && !Array.isArray(override[k])) {

                    // Track seen so you don't drill infinitely on circular references
                    if (typeof copy[k] === 'object') {
                        const val = copy[k]
                        const idx = seen.indexOf(val)
                        if (idx !== -1) copy[k] = seen[idx]
                        else {
                            seen.push(val)
                            copy[k] =  merge(val, override[k], updateOriginal, false, composeFunctions, seen)
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
                    } 
                    else console.warn(`This function was already composed. Ignoring duplicate.`)
                }

            }
            
            // Replace values and arrays
            else if (k in override) copy[k] = override[k]
        })

        newKeys.forEach(k => copy[k] = override[k])
    }

    return copy // named exports
}