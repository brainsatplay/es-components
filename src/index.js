import { Graph } from "./graphscript/Graph";
import { DOMService } from "./graphscript/services/dom/DOM.service";

import transform from "./transform.js";
import getFnParamInfo from "./parse.js";

const isNode = 'process' in globalThis

class ESPlugin {
    
    // Private
    #initial;
    #instance;
    #graphscript;
    #toRun = false

    // Restricted
    get initial() { return this.#initial }

    get instance() { return this.#instance }

    get graphscript() { return this.#graphscript }
    set graphscript(v) { this.#graphscript = v }

    constructor(node, options = {}) {

        // Get Base Initial Object
        this.#initial = node;
        do { this.#initial = this.initial.initial ?? this.initial } while (this.initial instanceof ESPlugin)
        
        const isFunction = typeof this.initial === 'function'
        const hasDefault = 'default' in this.initial
        let hasGraph = !!node.graph
        let runProps = true

        if (!hasDefault && !hasGraph) {
            let newNode = {graph: {nodes: {}}}
            for (let namedExport in node) newNode.graph.nodes[namedExport] = {default: node[namedExport]}
            this.#initial = newNode
            hasGraph = true
            runProps = false
        }

        // Parse ESPlugins (with default export)
        if (hasDefault || isFunction) this.graphscript = this.#create(options.tag ?? 'defaultESPluginTag', this.initial)

        // Parse Graphs
        if (hasGraph) {

            const hasGraphs = {}

            // Instantiate Components First
            for (let tag in this.initial.graph.nodes) {
                const node2 = this.initial.graph.nodes[tag];
                if (!(node2 instanceof ESPlugin)) {
                    const clonedOptions = Object.assign({}, Object.assign(options));
                    this.initial.graph.nodes[tag] = new ESPlugin(node2, Object.assign(clonedOptions, { tag }));
                    if (typeof options.onPlugin === "function")
                    options.onPlugin(this.initial.graph.nodes[tag]);
                } else hasGraphs[tag] = node2.graphscript
            }


            // Compose Graph Tree from Components   
            let tree = {}
            for (let tag in this.initial.graph.nodes) {

                // Recreate Graph from Initial Values (stored here)
                const thisNode = this.initial.graph.nodes[tag]
                if (hasGraphs[tag]) {
                    const thisNode =  hasGraphs[tag]._initial
                    thisNode.tag = tag // adjust tag
                    thisNode[tag].state.triggers = {} //remove subs
                }
                
                const innerNode = this.#create(tag, thisNode); // create new plugin
                tree[tag] = innerNode.graphscript ?? innerNode;
            }

            const edges = this.initial.graph.edges
            for (let output in edges) {
                const splitEdge = output.split('.')
                const first = splitEdge.shift()
                let outNode = tree[first]
                splitEdge.forEach(str => outNode = outNode.nodes.get(str))
                if (!outNode.children) outNode.children = {}
                for (let input in edges[output]) outNode.children[input] = true
            }


            const ports = node.graph.ports
            const props = this.#instance ?? node
            this.graphscript = isNode ? new Graph(tree, options.tag, props) : new DOMService({ routes: tree, name: options.tag, props: runProps ? props : undefined}, options.parentNode);

            if (ports) {
                let input = ports.input;
                let output = ports.output;
                node.operator = async function(...args) {
                  await this.run(input, ...args);
                };
        
                this.graphscript.state.triggers = {} // clearing subscriptions
                this.graphscript.subscribe(output, (...args) => {
                  for (let tag in this.graphscript.children) this.#runGraph(this.graphscript.children[tag], ...args);
                });
              }

        }

        Object.defineProperty(this, 'tag', {
            get: () => this.graphscript?.tag,
            enumerable: true
        })
    }

    init = async () => {
        if (this.#toRun) await this.run()
    }
    

    #create = (tag, info) => {

        if (typeof info === 'function') info = {default: info} // transform function
        if (!("default" in info) || info instanceof Graph) return info; // just a graph
        else {

        let activeInfo;
        if (info instanceof ESPlugin){
            activeInfo = info.instance
            info = info.initial
        }

        const args = getFnParamInfo(info.default) ?? new Map();
        if (args.size === 0) args.set("default", {});
        const input = args.keys().next().value

        // merge with user-specified arguments
        if (info.arguments) {
            for (let key in info.arguments) {
                const o = args.get(key);
                o.state = info.arguments[key];
                if (input === key) this.#toRun = true
            }
        }

        const gsIn = {
            arguments: args,
            operator: info.default,
            tag,
            default: info.default // to use for reconstruction
        }


        var props = Object.getOwnPropertyNames(info)
        const onActive = ['arguments', 'default', 'tag', 'operator']
        props.forEach(key => {
            if (!onActive.includes(key)) gsIn[key] = info[key]
        })

        // Transfer Active Info 
        if (activeInfo) {
            for (let key in activeInfo) {
                if (!onActive.includes(key)) gsIn[key] = activeInfo[key] // replace with active
            }
        }

        this.#instance = gsIn

        return transform(tag, gsIn) // add arguments as sub-graphs
    }
    }

    // Handle GraphScript Run Syntax
    #runGraph = async (graph=this.graphscript, ...args) => {
        if (graph instanceof Graph) {
          if (graph.node)
            return graph.node.run(...args);
          else {
            if (args.length === 0)
              return this.#runDefault(graph);
            else if (graph.nodes.has(args[0]))
              return graph.run(...args);
            else
              return this.#runDefault(graph, ...args);
          }
        } else return await graph.run(...args);
      }
    
      #runDefault = (graph, ...args) => graph.run(graph.nodes.values().next().value, ...args);
      run = async (...args) => this.#runGraph(this.graphscript, ...args)
}

export default ESPlugin;
