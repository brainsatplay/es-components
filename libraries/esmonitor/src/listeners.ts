import { ActiveInfo, ListenerInfo, ListenerPool } from "./types"
import * as utils from './utils'
import * as infoFunctions from './info'

const register = (info, collection) => {
    // Place in Function Registry
    if (!collection[info.path.absolute]) collection[info.path.absolute] = {}
    collection[info.path.absolute][info.sub] = info
}

const get = (info, collection) => collection[info.path.absolute]

export const getExecutionInfo = async (func, args, info) => {

    let result = {
        value: {
            function: func,
            arguments: args,
            info
        },
        output: undefined,
    } as {
        value: ActiveInfo,
        output: any
    }
    
    

    for (let key in info)  {
        if (info[key] && infoFunctions[key]) {
            const ogFunc = func
            func = async (...args) => {
                const o = await infoFunctions[key](ogFunc, args)
                result.value[key] = o.value
                return o.output
            }   
        }
    }

    result.output = await func(...args)
    return result
}

const handler = (info, collection, subscribeCallback) => {
    // Create Listener for this Object
    
    if (!get(info, collection)) {
        let parent = info.parent
        let val = parent[info.last]
        subscribeCallback(val, parent)
    }

    // Register in Collection
    register(info, collection)
}

export const getters = (info: ListenerInfo, collection: ListenerPool) => {
    handler(info, collection, (value, parent) => {
        let val = value
        Object.defineProperty(parent, info.last, {
            get: () => val,
            set: async (v) => {
                const listeners = Object.assign({}, collection[info.path.absolute])
                const executionInfo = {}
                await utils.iterateSymbols(listeners, (_, o: ListenerInfo) => o.callback(o.path.output, executionInfo, v))
                val = v
            },
            enumerable: true
        })
    })
}




export const functions = (info: ListenerInfo, collection: ListenerPool) => {
    handler(info, collection, (_, parent) => {        
        parent[info.last] = async function(...args) {
            const listeners = Object.assign({}, collection[info.path.absolute])


            const executionInfo = await getExecutionInfo(async (...args) => await info.original.call(this, ...args), args, info.infoToOutput)
            await utils.iterateSymbols(listeners, (_, o: ListenerInfo) => o.callback(o.path.output, executionInfo.value, executionInfo.output))
        }
    })
    
}