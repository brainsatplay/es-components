
// -------------- Import Modules --------------
import * as test from 'esmpile/tests/basic/index.js'
import * as escFile from './index.esc.js'
import createComponent from '../libraries/escompose/src/index'
import Monitor from '../libraries/esmonitor/src/Monitor.js'
import Inspectable from '../libraries/esmonitor/src/inspectable/index.js'
import ESC from "../libraries/escode/src/core/index";
import validate from "../libraries/escode/src/validate/index";
import { update } from './ui.js'



// -------------- Setup External Monitor --------------
let states: Inspectable[] = []
let logUpdate = (path, info, newVal?: any) =>  update(path, info, newVal, states)

const monitor = new Monitor({
    onInit: logUpdate,
    onUpdate: {
        callback: logUpdate,
        info: {
            performance: true
        }
    },
    pathFormat: 'absolute',
    polling: { sps: 60 }
})

// ------------------ Simple ESMonitor State Object ------------------
const objectStates = {}

// Monitor Object for All Changes
const inspectableState = new Inspectable(objectStates, {
    callback: async (path, info, update) => console.log('States Updated!', path, update)
})

states.push(inspectableState)

// Poll the ESM Object
const esmId = 'ESM'
monitor.set(esmId, test)
monitor.on(esmId, (path, _, update) =>  console.log('Polling Result:', path, update))

// ----------------------- Create ES Component from ESM File -----------------------
const component = createComponent(escFile, {
    monitor, // Use the existing monitor
    listeners: { static: false } // Will be able to track new keys added to the object
})

console.log('Configuration Object', component)

// for (let file in monitor.dependencies) {
//     for (let dep in monitor.dependencies[file]) subscribe(dep, [], true)
// }

// const demos = {
//     "Todo List": {
//         "path": "./drafts/demos/todo/index.esc.json",
//         "img": "./drafts/assets/todo.png"
//     },
//     // "Phaser Demo": {
//     //     "path": "./drafts/demos/phaser/index.esc.json",
//     //     "img": "./drafts/assets/phaser.png"
//     // },
//     "Phaser - Multiplayer": {
//         "path": "./drafts/demos/phaser/versions/multiplayer.esc.json",
//         "img": "./drafts/assets/phaser-multiplayer.png"
//     },
//     "HEG": {
//         "path": "./drafts/demos/devices/audiofeedback/index.esc.json",
//         "img": "./drafts/assets/heg.png"
//     },
//     "EEG": {
//         "path": "./drafts/demos/devices/eegnfb/index.esc.json",
//         "img": "./drafts/assets/eeg.png"
//     }
// };

// const demoContainer = document.getElementById('demos')
// const backButton = document.getElementById('backButton')
// const demo = document.getElementById('demo')

// const appName = document.getElementById('appname')

// const loader = document.getElementById('loader').children[0].children[0]
// const nGraphs = document.getElementById('nGraphs')
// const progress = document.getElementById('progress')

// for (let name in demos) {
//     const o = demos[name]
//     const div = document.createElement('div');
//     demoContainer.appendChild(div)
//     if (o.img){
//         div.style.backgroundImage = `linear-gradient(rgba(0,0,0,.40), rgba(0,0,0,.40)), url(${o.img})`
//         div.style.color = 'white'
//     }
//     div.innerHTML = `<h3>${name}</h3>`;
//     div.onclick = async () => {
//         demoContainer.style.display = 'none'
//         progress.style.opacity = 1
//         demo.style.display = 'block'
//         setTimeout(() => {
//             backButton.style.display = 'block'
//             appName.innerHTML = name
//         }, 100)
//         await loadDemo(o);
//     };
// }

// const loadDemo = async (info) => {

//     const options = {
//         relativeTo: import.meta.url, // allows you to resolve the project,
//         nodeModules: 'node_modules',
//         filesystem: {
//             _fallbacks: {
//                 'browserfs': window.BrowserFS,
//             }
//         },
//         callbacks: {
//             progress: {
//                 source: (label, i, total) => {
//                     const ratio = (i / total)
//                     loader.style.width = `${ratio * 100}%`
//                     if (ratio === 1) setTimeout(() => progress.style.opacity = 0, 100)
//                 },
//                 components: (label, i, graph) => {
//                     nGraphs.innerHTML = i
//                 },
//                 fetch: (label, i, total) => {
//                     console.log('Fetch', label, i, total)
//                 },
//             }
//         }
//     }

//     options.parentNode = document.getElementById('container') 
//     options.activate = true // use internal graph system
//     options.debug = true
//     options.errors = []
//     options.warnings = []

//     // ------------------- Import Mode -------------------
//     const schemaValid = await validate(info.path, options)
//     if (schemaValid) {
//         let esc = new ESC(info.path, options)
//          await esc.init()
//          const loadValid = await validate(esc, options)
//          if (loadValid) {
//             await esc.start()
//             console.log('ESC', esc)
//             backButton.onclick = () => reset(esc)
//          } else console.error('Invalid Loaded ESC Object')
//     } else console.error('Invalid ESC Schema')

//     printError(options.errors, 'import')
//     printError(options.warnings, 'import', "Warning")
// }

// function printError(arr, type, severity='Error'){
//     arr.forEach(e => {
//         const log = (severity === 'Warning') ? console.warn : console.error
//         log(`${severity} (${type})`, e)
//     })
// }

// function reset(esc) {
//     if (esc) esc.stop()
//     demoContainer.style.display = ''
//     backButton.style.display = ''
//     progress.style.opacity = 0
//     appName.innerHTML = ''
//     demo.style.display = ''
//     loader.style.width = `0%`
// }