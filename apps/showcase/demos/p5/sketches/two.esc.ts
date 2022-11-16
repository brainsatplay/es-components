import * as sketch from '../components/sketch.esc.js'

// Shapes
import * as rectangle from '../components/rectangle.esc.js'

import * as global from './global.js'

export const background =  200
export const __compose = [global.fillParent, sketch]
export const __children = {
    rectangle
}