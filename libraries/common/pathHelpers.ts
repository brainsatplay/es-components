import { PathFormat, SetValueOptions } from "../esmonitor/src/types"
import * as standards from '../esc/standards'

const hasKey = (key, obj) =>  key in obj


const getShortcut = (path, shortcuts, keySeparator) => {
    const sc = shortcuts[path[0]]
    if (sc) {
        const value = sc[path.slice(1).join(keySeparator)]
        if (value) return value
    }
}

export const getFromPath = (baseObject, path, opts: any = {}) => {


    const fallbackKeys = opts.fallbacks ?? []
    const keySeparator = opts.keySeparator ?? standards.keySeparator

    if (opts.shortcuts) {
        const shortcut = getShortcut(path, opts.shortcuts, keySeparator)
        if (shortcut) {
            if (opts.output === 'info') return { value: shortcut, exists: true, shortcut: true }
            else return shortcut
        }
    }


    if (typeof path === 'string') path = path.split(keySeparator)
    else if (typeof path == 'symbol') path = [path]

    let exists;
    path = [...path]

    let ref =  baseObject
    
    for (let i = 0; i < path.length; i++) {

        if (!ref) {
            const message = `Could not get path`
            console.error(message, path, ref)
            throw new Error(message)
        }

        const str = path[i]
        // Try Inside ES Components
        if (!hasKey(str, ref) && 'esDOM' in ref) {
            for (let i in fallbackKeys) {
                const key = fallbackKeys[i]
                if (hasKey(key, ref)) {
                    ref = ref[key]
                    break
                }
            }
        }
        
        // Try Standard Path
        exists = hasKey(str, ref)

        if (exists) ref = ref[str]
        else {
            ref = undefined
            exists = true
        }
    }

    if (opts.output === 'info') return { value: ref, exists }
    else return ref
}


export const setFromPath = (path: PathFormat, value: any, ref:any, opts: SetValueOptions = {}) => {
    const create = opts?.create ?? false
    const keySeparator = opts?.keySeparator ?? standards.keySeparator

    if (typeof path === 'string') path = path.split(keySeparator)
    else if (typeof path == 'symbol') path = [path]
    path = [...path]

    const copy = [...path]
    const last = copy.pop() as string | symbol

    if (ref.esDOM) ref = ref.esDOM 

    for (let i = 0; i < copy.length; i++) {
        const str = copy[i]  
        let has = hasKey(str, ref)
        
        // Create if not found
        if (create && !has) {
            ref[str] = {}
            has = true
        }

        // Swap reference
        if (has) ref = ref[str]

        // Throw error if not found
        else {
            const message = `Could not set path`
            console.error(message, path)
            throw new Error(message)
        }

        // Transfer to ESComponents automatically (if not second-to-last key...)
        if (ref.esDOM) ref = ref.esDOM 
    }

    ref[last] = value
}