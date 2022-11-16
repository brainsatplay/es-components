
import { Graph } from "../../libraries/external/graphscript/index"
import * as esc from '../showcase/demos/graph/index.esc'
import tree from './tree.js'
import * as transform from "../../libraries/escomposer/src/schema"
import * as escompose from "../../libraries/escompose/src/index"

import { deep } from "../../libraries/common/clone";

const divs = {};

const toGS = 'escXgs'
const toESC = 'gsXesc'

const trees = [
    {id: 'tree', value: tree},
    {id: 'esc', value: esc},
    // {id: 'escXgs', value: esc},
    // {id: 'gsXesc', value: deep(tree) } // Otherwise I get node properties...
];

const readouts = document.getElementById('readouts')

for (let i in trees){
    
    const o = trees[i]
    console.log(`------------------------ Loading ${o.id} ------------------------`)

    let tree = o.value

    if (!divs[o.id]) {
        divs[o.id] = document.createElement('ol')
        divs[o.id].id = o.id
         readouts.appendChild(divs[o.id])

        divs[o.id].innerHTML = `<h1>${o.id}</h1>`
    }


    const transformToESC =  o.id == toESC
    if (transformToESC)  tree = transform.graphscript.from(tree)


    // Convert to GS
    if (o.id === 'esc' || transformToESC) {

            const onConnected = (tree) => {

                tree.__children.nodeB.x += 1; //should trigger nodeA listener

                tree.__children.nodeB.__children.nodeC.default(4); //should trigger nodeA listener
            
                tree.__children.nodeA.jump();
                        
                const popped = tree.__children.nodeB.__disconnected()  

                divs[o.id].innerHTML += '<li><b>nodeB removed!</b></li>'

                popped.x += 1; //should no longer trigger nodeA.x listener on nodeC, but will still trigger the nodeB.x listener on nodeA
            
                tree.__children.nodeA.jump(); //this should not trigger the nodeA.jump listener on nodeC now

                setTimeout(()=>{ 

                    tree.__children.nodeE.__disconnected()  
                    divs[o.id].innerHTML += '<li><b>nodeE removed!</b></li>'

                }, 5500)

            }

            // NOTE: This is how you declare this to work with the ESCompose object inline
            escompose.create(tree, { __parent: divs[o.id] }, {listen: true, clone: true, await: true}).then(onConnected)

            // // NOTE: Works with no __parent originally—but listeners will not be placed before onconnect declarations
            // const res = transform.graphscript.esc(tree)
            // res.__parent = divs[o.id]
            // onConnected(res)            

        continue;
    }
    else if (o.id === toGS) {
        tree = transform.graphscript.to(tree)
        console.log('Got', tree)
    }


    let graph = new Graph({
        tree,
        loaders:{

            'looper':(props,parent,graph)=>{ //badabadabadabooop

                let oncreate = () => {}
            
                if (props.__loop && typeof props.__loop === 'number') {
                    oncreate= (node) => {
                        if (node.__loop && typeof node.__loop === 'number') {
                            node.__isLooping = true
                            if (!node.__looper) {
                                node.__looper = () => {
                                    if (node.__isLooping) {
                                        node.__operator();
                                        setTimeout(node.__looper, node.__loop);
                                    }
                                }
                                node.__looper();
                            }
                        }
                    }
                }

                if (typeof props.__onconnected === 'undefined') props.__onconnected = [oncreate];
                else if (typeof props.__onconnected === 'function') props.__onconnected = [oncreate, props.__onconnected];
                else if (Array.isArray(props.__onconnected)) props.__onconnected.unshift(oncreate);

                let ondelete = (node) => {
                    if (node.__isLooping) node.__isLooping = false;
                }

                if (typeof props.__ondisconnected === 'undefined') props.__ondisconnected = [ondelete];
                else if (typeof props.__ondisconnected === 'function') props.__ondisconnected = [ondelete, props.__ondisconnected];
                else if (Array.isArray(props.__ondisconnected)) props.__ondisconnected.unshift(ondelete);
            }
        }
    });

    graph.get('nodeB').x += 1; //should trigger nodeA listener

    graph.run('nodeB.nodeC', 4); //should trigger nodeA listener

    graph.get('nodeA').jump();

    let tree2 = {
        graph
    };

    let graph2 = new Graph({tree:tree2});

    let popped = graph.remove('nodeB');

    divs[o.id].innerHTML += '<li><b>nodeB removed!</b></li>'

    graph2.add(popped); //reparent nodeB to the parent graph

    popped.x += 1; //should no longer trigger nodeA.x listener on nodeC, but will still trigger the nodeB.x listener on nodeA

    popped.__children.nodeC.__operator(1);

    graph.get('nodeA').jump(); //this should not trigger the nodeA.jump listener on nodeC now

    setTimeout(()=>{ 

        graph.remove('nodeE'); 
        divs[o.id].innerHTML += '<li><b>nodeE removed!</b></li>'

    },5500)

}
