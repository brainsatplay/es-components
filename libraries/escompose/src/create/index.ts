import * as element from './element'
import * as clone from "../../../common/clone.js"

export default (id, esm, parent?) => {
    
        esm = clone.deep(esm);

        // ------------------ Produce a Complete ESM Element ------------------
        esm = element.add(id, esm, parent);

        // TODO: Delcare all internal properties here...so you can update the UI in real-time
        // Listen for Changes to Element
        let el = esm.element;
        delete esm.element;
        Object.defineProperty(esm, 'element', {
            get: function() {
                if (el instanceof Element) return el
            },
            set: function(v) {

                if (v instanceof Element) {
                    el = v

                    // TODO: Fix so that this triggers the parentNode setter...
                    for (let name in esm.components) v.appendChild(esm.components[name].element) // Manually carry to new parent node
                }
            },
            enumerable:true
        })

        esm.element = el


        const parentNode = esm.parentNode;
        delete esm.parentNode;
        Object.defineProperty(esm, 'parentNode',{
            get:function () { 
                if (esm.element instanceof Element) return esm.element.parentNode; 
            },
            set:(v) => { 
                if (typeof v === 'string') {
                    const newValue = document.querySelector(v);
                    if (newValue) v = newValue
                    else v = document.getElementById(v);
                }

                if (v?.element instanceof Element) v = v.element
                if (esm.element instanceof Element) {
                    if(esm.element.parentNode) esm.element.remove()
                    if (v) v.appendChild(esm.element);
                }
            },
            enumerable:true
        });

        esm.parentNode = parentNode

        // Delete Function
        esm.delete = function () {
            this.element.remove(); 
            if(
                this.onremove
                && this.element instanceof Element
            ) this.onremove.call(this); 
        }

        // On Resize Function
        let onresize = esm.onresize
        let onresizeEventCallback: any = null
        Object.defineProperty(esm,'onresize',{
            get: function() { return onresize },
            set: function(foo) {
                onresize = onresize
                if (onresizeEventCallback) window.removeEventListener('resize', onresizeEventCallback) // Stop previous listener
                if (onresize) {
                    onresizeEventCallback = (ev) => { 
                        if ( onresize && esm.element instanceof Element ) foo.call(this, ev) 
                    };
                    window.addEventListener('resize', onresizeEventCallback);
                }
            }
        })

        esm.onresize = onresize


    
        if (esm.element) esm.element.component = esm; // Bind component to the element
        
        // -------- Bind Functions to GraphNode --------
        let initialesm = esm._initial ?? esm
        for (let key in initialesm) {
            if (typeof initialesm[key] === 'function') {
                const desc = Object.getOwnPropertyDescriptor(initialesm, key)
                if (desc && desc.get && !desc.set) initialesm = Object.assign({}, initialesm) // Support ESM Modules: Only make a copy if a problem
                const og = initialesm[key]
                initialesm[key] = (...args) => og.call(esm, ...args)

                // Try
                // og.call(esm) 
            } else if (key === 'attributes') {
                for (let key2 in initialesm.attributes) {
                    if (typeof initialesm.attributes[key2] === 'function') {
                        const og = initialesm.attributes[key2]
                        initialesm.attributes[key2] = (...args) => og.call(esm, ...args)

                        // Try
                        // og.call(esm) 
                    }
                }
            }
        }
    
        return esm;
}
