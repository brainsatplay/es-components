export const options = {
    // one: 'Option #1',
    // two: 'Option #2',
    // three: 'Option #3',
};

export const tagName = 'select'

export const oncreate = function() {
    let target = this
    let element = target.element
    if (!element) {
        if (target.source){
            target = target.source
            element = target.element
        } 
    }


    // Handle Objects
    let options = target.options
    if (!Array.isArray(options)) {
        options = []
        for (let key in target.options)  options.push({value: key, label: target.options[key]})
    }


    // Hide Selector without Options
    if (options.length === 0) {
        element.style.display = 'none'
        return;
    }

    // Set Options
    const show = options.reduce((a,b) => a * !!b.show, true) // all show/hide...
    if (element) element.innerHTML = options.map((o) => {
        const value = (typeof o === 'object') ? o.value : o
        const label = o?.label ?? value
        return `<option value='${value}'>${label}</option>`
    })

    // Hide Dependent Elements
    element.onchange = (ev) => {
        if (show) showHide(ev.target.value, options, element)
        this.run(ev.target.value)
    }

    const first = options?.[0]?.value
    setTimeout(() => {
        if (show) showHide(first, options, element) // initialize show / hide
        this.run(first)
    }, show ? 100 : 10) // wait longer to override other select compoents
}

function showHide(value, options, element) {
    options.forEach((o) => {
        const el = element.parentNode.querySelector(`#${o.show}`)
        if (value === o.value) {
            el.style.display = ''
            el.node.run(el.value) // run new value when shown
        }  else el.style.display = 'none'
    })
}

export default (input) => input