import * as core from './packages/core/index'


// Loaders
import * as compose from "./packages/escode-compose-loader"
import * as dom from "./packages/escode-dom/loader/index"
import * as start from "./packages/escode-start-loader"
import * as animate from "./packages/escode-animation-loader"

import { isNode } from './packages/common/globals'
import { ConfigInput, ConfigObject, Loaders } from './packages/core/types'
import { Options } from './packages/common/types'

// --------- Specifying Loaders ---------
const standardLoaders: Loaders = []

// Object Composition
standardLoaders.push(compose)

// DOM Elements
if (!isNode) standardLoaders.push(dom)

// Lifecycle Functions
standardLoaders.push(start)

// Additional Default Loaders
standardLoaders.push(animate)

// Allow editing core loaders
export const loaders = standardLoaders

// Exports from Core
export const monitor = core.monitor // Monitor any object for changes
export const resolve = core.resolve // Apply a callback to promises and direct references
export const clone = core.clone // Deep clone an object without creating an ES Component
export const merge = core.merge // Merge two objects together without creating an ES Component 
export const find = core.find // Find components on an object

// Exports Modified from Core
export const create = (config: ConfigInput, overrides?: ConfigObject, options: Partial<Options> = {}) => {

    // Merge Default Loaders
    if (options.loaders) options.loaders = Array.from(new Set([...options.loaders, ...standardLoaders]))
    else options.loaders = standardLoaders

    // Create the Component
    return core.create(config, overrides, options)
}
export default create