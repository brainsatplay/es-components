
type ComponentElement = Element & { [x:string]: any }

type attributeKeys = keyof HTMLElement['attributes']

export type ESComponent = {
    
    default: Function,
    esCompose: ESComponent // Is Merged into this component

    components: {
        [x:string]: ESComponent
    }
    
    // HTML-Specific
    id: string;
    tagName: string;
    element?: string | ComponentElement,
    parentNode?: Element,
    style: {[key:string]:any},
    attributes:{
        [x in attributeKeys] : any
    }
    onresize: Function,
    onrender: Function
    onremove: Function

}