import Edgelord from "../drafts/edgelord"
import { Editor, EditorProps } from "../escode/src"
import Bundle from "../esmpile/src/Bundle"

type ComponentElement = Element & { [x:string]: any }

type attributeKeys = keyof HTMLElement['attributes']

type baseESElement = string | ComponentElement

export type ESElementInfo = {
    // Get Element
    id?: string,
    selectors?: string,
}

export type ESDefineInfo = {
    name: string,
    extends: string
}

export type ESElementArray = [ESDefineInfo['name'], {extends: ESDefineInfo['extends']}]

export type __source = string | (string | Bundle)[]

export type GeneralElementType = baseESElement | ESElementInfo | ESDefineInfo
export type ESComponent<ElementType = GeneralElementType>  = {

    __: {
        flow: Edgelord,
        path: string,
        symbol: symbol,
        components: Map<string, ESComponent>,
        connected: any,
        resolved: any,
        boundEditors?: Editor[],
        editor?: Editor,
        
        [x:string]: any
    } // Replaces __node from graphscript
    
    default: Function,
    __compose: ESComponent | ESComponent[] // Is Merged into this component

    __parent?: ComponentElement,

    __onconnected: Function
    __ondisconnected: Function

    // HTML-Specific
    __element?: ElementType,
    __childposition?: number // Will be resolved automatically if not set
    __attributes:{ [x in attributeKeys] : any }
    __onresize: Function,
    __extensions?: {[x:string]: any}
    __source: __source // Grabbed from esmpile
    __path: string, // Path of the Component (ALL HAVE IT)
    __editor?: boolean | EditorProps | typeof Editor // Shorthand for creating the editor

    // Keys to Manage Internal Things
    __proxy: ProxyConstructor,
    
    [x:string]: any | ESComponent // General components and properties

}