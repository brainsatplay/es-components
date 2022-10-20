import * as player from  "../../../../../components/phaser/player.js"
import update from "../scripts/player/update.js"
import createCompanion from "../scripts/player/create/companion.js"
// import equals from "../../../../components/basic/equals.js"

import * as phaser from '../index.esc'

const model = Object.assign({}, phaser) as any
model.esComponents = Object.assign({}, model.esComponents) as any
model.esComponents.game = Object.assign({}, model.esComponents.game) as any
model.esComponents.game.esComponents = Object.assign({}, model.esComponents.game.esComponents) as any

export const esListeners = Object.assign({}, model.esListeners)
Object.assign(esListeners, {

    // Companion Controls
    ['keys.w']: {
        ['game.companion.jump']: true,
    },
    ['keys.a']: {
        ['game.companion.velocity']: {
            esBranch: [
                {equals: true, value: -200},
                {equals: false, value: 0},
            ]
        }
    },
    ['keys.d']: {
        ['game.companion.velocity']: {
            esBranch: [
                {equals: true, value: 200},
                {equals: false, value: 0},
            ]
        }
    }
})

model.esComponents.game.esComponents.companion = {
    esCompose: player,
    position: {
        x: 100,
        y: 200
    },
    size: {
        offset: {
            height: -8
        }
    },
    bounce: 0.2,
    collideWorldBounds: false,
    create: createCompanion,
    update
}

export const esComponents = model.esComponents