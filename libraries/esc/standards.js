export const keySeparator = '.'

export const defaultPath = 'default'

export const esSourceKey = '__esmpileSourceBundle'

export const specialKeys = {

    isGraphScript: '__',

    default: defaultPath,

    start: '__onconnected', // asked to start
    stop: '__ondisconnected',
    connected: '__connected', // wait until connected
    resolved: '__resolved', // wait until fully resolved
    started: '__started', // wait until started

    hierarchy: '__children',
    element: '__element',
    webcomponents: '__define',
    attributes: '__attributes',

    listeners: {
        value: '__listeners',
        branch: '__branch',
        bind: '__bind',
        trigger: '__trigger',
        format: '__format',
    },

    trigger: '__trigger',
    compose: '__compose',
    apply: '__apply',

    // Internal to Compose
    uri: 'src',
    reference: 'ref',

    childPosition: '__childposition',

    attribute: 'escomponent',
    options: '__options',

    parent: '__parent',
    component: '__component',

    source: '__source',
    path: '__path',

    animate: '__animate',
    states: '__states',

    promise: '__childresolved',
    editor: '__editor',

    flow: '__manager',

    original: '__original',

    resize: '__onresize',    
    

    proxy: '__proxy'
}
