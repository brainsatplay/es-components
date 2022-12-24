import { Options } from "../common/types"
import { specialKeys } from "../../../spec/properties"
import { deep as deepClone } from "../common/clone"
import { AnyClass, ConfigInput, FinalConfig, Loaders } from "./types"

import { toReturn } from "./symbols"
import { isNode } from "../common/globals"
import { merge } from "../common/utils"

const isNativeClass= (o) => typeof o === 'function' && o.hasOwnProperty('prototype') && !o.hasOwnProperty('arguments')

// This function accepts pre-parsed configuration objects and returns a final configuration object
export default function parse(config: ConfigInput, overrides: any = {}, options: Partial<Options> = {}) {

    if (!isNode) {
        if (config instanceof globalThis.NodeList) config = Array.from(config)  // DOM NodeList Support (e.g. from querySelectorAll): Converts to an array of configurations
    }


    if ( typeof config === 'string') config =  { [specialKeys.apply]: config } // String Support: Transform string so that it is compiled from source

    // Function Support: Transform function so that it becomes an object
    else if ( typeof config === 'function') {
        if (isNativeClass(config)) config = new (config as AnyClass)(overrides, options) // Create a class
        else {
            delete (config as any).__ // remove a triggering __ property from the function
            config = { [specialKeys.default]: config } // Apply as a default function
        }
    }

    // Apply Component to the Element
    else if (!isNode && config instanceof globalThis.Element) {
        const component = config[specialKeys.component]

        // Directly Merge into existing element + component pairs (TO FINISH)
        if (component) {

            overrides = deepClone(overrides) // Clone the applied object to prevent mutation

            // We cannot handle the compose and apply keywords the same way—so we will approximate here.
            const shouldHaveComposed = overrides.__compose
            const shouldHaveApplied = overrides.__apply
            delete overrides.__compose
            delete overrides.__apply

            if (shouldHaveComposed) {
                console.warn('Cannot compose a component onto an element that already has a component. Merging with the base object instead...')
                overrides = Object.assign(shouldHaveComposed, overrides)
            }

            if (shouldHaveApplied) {
                console.warn('Cannot apply a component onto an element that already has a component. Applying to the base object instead...')
                overrides = Object.assign(overrides, shouldHaveApplied)
            }

            const merged = merge(component, overrides, true); // Basic reverse merge
            return {[toReturn]: merged} // Return immediately
        }
        // Create new component with element as the base
        else {
            config = { [specialKeys.element]: config } // Compile element to object
        }
    }

    // Bulk Operations
    else if (Array.isArray(config)) return config // return array to be handled

    // Failed Resolution
    else if ( typeof config === 'object') {
        config = (options.clone !== false ? deepClone(config) : config)
    }

    else throw new Error(`Invalid configuration type: ${ typeof config }. Expected object or string.`)   
    
    // -------------- Assign Standard Properties to the Component Object --------------         
    return config as FinalConfig
}