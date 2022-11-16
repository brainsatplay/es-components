(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name2 in all)
      __defProp(target, name2, { get: all[name2], enumerable: true });
  };

  // ../../libraries/external/graphscript/services/EventHandler.ts
  var EventHandler = class {
    constructor(data) {
      this.pushToState = {};
      this.data = {};
      this.triggers = {};
      this.setState = (updateObj) => {
        Object.assign(this.data, updateObj);
        for (const prop of Object.getOwnPropertyNames(updateObj)) {
          if (this.triggers[prop])
            this.triggers[prop].forEach((obj) => obj.onchange(this.data[prop]));
        }
        return this.data;
      };
      this.setValue = (key, value2) => {
        this.data[key] = value2;
        if (this.triggers[key])
          this.triggers[key].forEach((obj) => obj.onchange(this.data[key]));
      };
      this.subscribeTrigger = (key, onchange) => {
        if (key) {
          if (!this.triggers[key]) {
            this.triggers[key] = [];
          }
          let l = this.triggers[key].length;
          this.triggers[key].push({ idx: l, onchange });
          return this.triggers[key].length - 1;
        } else
          return void 0;
      };
      this.unsubscribeTrigger = (key, sub) => {
        let triggers = this.triggers[key];
        if (triggers) {
          if (!sub)
            delete this.triggers[key];
          else {
            let idx = void 0;
            let obj = triggers.find((o, i) => {
              if (o.idx === sub) {
                idx = i;
                return true;
              }
            });
            if (obj)
              triggers.splice(idx, 1);
            if (this.onRemoved)
              this.onRemoved(obj);
            return true;
          }
        }
      };
      this.subscribeTriggerOnce = (key, onchange) => {
        let sub;
        let changed = (value2) => {
          onchange(value2);
          this.unsubscribeTrigger(key, sub);
        };
        sub = this.subscribeTrigger(key, changed);
      };
      this.getTrigger = (key, sub) => {
        for (const s in this.triggers[key]) {
          if (this.triggers[key][s].idx === sub)
            return this.triggers[key][s];
        }
      };
      if (typeof data === "object")
        this.data = data;
    }
  };

  // ../../libraries/external/graphscript/index.ts
  var state = new EventHandler();
  var GraphNode = class {
    constructor(properties, parent, graph) {
      this.__node = {
        tag: `node${Math.floor(Math.random() * 1e15)}`,
        unique: `${Math.random()}`,
        state
      };
      this.__subscribe = (callback, key, subInput, bound, target) => {
        const subscribeToFunction = (k, setTarget = (callback2, target2) => callback2, triggerCallback = callback) => {
          let sub = this.__node.state.subscribeTrigger(k, triggerCallback);
          let trigger = this.__node.state.getTrigger(k, sub);
          trigger.source = this.__node.tag;
          if (key)
            trigger.key = key;
          trigger.target = setTarget(callback);
          if (bound)
            trigger.bound = bound;
          return sub;
        };
        const subscribeToGraph = (callback2) => {
          let fn = this.__node.graph.get(callback2);
          if (!fn && callback2.includes(".")) {
            let n = this.__node.graph.get(callback2.substring(0, callback2.lastIndexOf(".")));
            let key2 = callback2.substring(callback2.lastIndexOf(".") + 1);
            if (n && typeof n[key2] === "function")
              callback2 = (...args) => {
                return n[key2](...args);
              };
            console.log(n, fn);
          }
        };
        if (key) {
          if (!this.__node.localState) {
            this.__addLocalState(this);
          }
          if (typeof callback === "string") {
            if (typeof this[callback] === "function")
              callback = this[callback];
            else if (this.__node.graph)
              subscribeToGraph(callback);
          }
          let sub;
          let k = subInput ? this.__node.unique + "." + key + "input" : this.__node.unique + "." + key;
          if (typeof callback === "function")
            sub = subscribeToFunction(k);
          else if (callback?.__node)
            sub = subscribeToFunction(
              k,
              (callback2, target2) => target2 ? target2 : callback2.__node.unique,
              (state2) => {
                if (callback.__operator)
                  callback.__operator(state2);
              }
            );
          return sub;
        } else {
          if (typeof callback === "string") {
            if (this.__node.graph)
              callback = this.__node.graph.get(callback);
            else
              callback = this.__node.graph.nodes.get(callback);
          }
          let sub;
          let k = subInput ? this.__node.unique + "input" : this.__node.unique;
          if (typeof callback === "function")
            sub = subscribeToFunction(k);
          else if (callback?.__node) {
            sub = this.__node.state.subscribeTrigger(k, (res) => {
              if (callback.__operator)
                callback.__operator(res);
            });
            let trigger = this.__node.state.getTrigger(k, sub);
            trigger.source = this.__node.tag;
            if (key)
              trigger.key = key;
            trigger.target = target ? target : callback.__node.unique;
            if (bound)
              trigger.bound = bound;
          }
          return sub;
        }
      };
      this.__unsubscribe = (sub, key, subInput) => {
        if (key) {
          return this.__node.state.unsubscribeTrigger(subInput ? this.__node.unique + "." + key + "input" : this.__node.unique + "." + key, sub);
        } else
          return this.__node.state.unsubscribeTrigger(subInput ? this.__node.unique + "input" : this.__node.unique, sub);
      };
      this.__setOperator = (fn) => {
        fn = fn.bind(this);
        this.__operator = (...args) => {
          if (this.__node.inputState)
            this.__node.state.setValue(this.__node.unique + "input", args);
          let result = fn(...args);
          if (typeof result?.then === "function") {
            result.then((res) => {
              if (res !== void 0)
                this.__node.state.setValue(this.__node.unique, res);
            }).catch(console.error);
          } else if (result !== void 0)
            this.__node.state.setValue(this.__node.unique, result);
          return result;
        };
        return this.__operator;
      };
      if (typeof properties === "function") {
        properties = {
          __operator: properties,
          __node: {
            forward: true,
            tag: properties.name
          }
        };
      } else if (typeof properties === "string") {
        if (graph?.get(properties)) {
          properties = graph.get(properties);
        }
      }
      if (typeof properties === "object") {
        if (typeof properties.__node === "string") {
          if (graph?.get(properties.__node.tag)) {
            properties = graph.get(properties.__node.tag);
          } else
            properties.__node = {};
        } else if (!properties.__node)
          properties.__node = {};
        if (!properties.__parent && parent)
          properties.__parent = parent;
        if (graph) {
          properties.__node.graph = graph;
        }
        if (properties.__operator) {
          if (typeof properties.__operator === "string") {
            if (graph) {
              let n = graph.get(properties.__operator);
              if (n)
                properties.__operator = n.__operator;
              if (!properties.__node.tag && properties.__operator.name)
                properties.__node.tag = properties.__operator.name;
            }
          }
          if (typeof properties.__operator === "function")
            properties.__operator = this.__setOperator(properties.__operator);
        }
        if (!properties.__node.tag) {
          if (properties.__operator?.name)
            properties.__node.tag = properties.__operator.name;
          else
            properties.__node.tag = `node${Math.floor(Math.random() * 1e15)}`;
        }
        if (parent?.__node && !(parent instanceof Graph || properties instanceof Graph))
          properties.__node.tag = parent.__node.tag + "." + properties.__node.tag;
        if (parent instanceof Graph && properties instanceof Graph) {
          if (properties.__node.loaders)
            Object.assign(parent.__node.loaders ? parent.__node.loaders : {}, properties.__node.loaders);
          if (parent.__node.mapGraphs) {
            properties.__node.nodes.forEach((n) => {
              parent.__node.nodes.set(properties.__node.tag + "." + n.__node.tag, n);
            });
            let ondelete = () => {
              properties.__node.nodes.forEach((n) => {
                parent.__node.nodes.delete(properties.__node.tag + "." + n.__node.tag);
              });
            };
            this.__addDisconnected(ondelete);
          }
        }
        properties.__node.initial = properties;
        properties.__node = Object.assign(this.__node, properties.__node);
        Object.assign(this, properties);
        if (properties.__operator && parent instanceof GraphNode && parent.__operator) {
          let sub = parent.__subscribe(this);
          let ondelete = () => {
            parent?.__unsubscribe(sub);
          };
          this.__addDisconnected(ondelete);
        } else if (typeof properties.default === "function" && !properties.__operator) {
          let fn = properties.default.bind(this);
          this.default = (...args) => {
            if (this.__node.inputState)
              this.__node.state.setValue(this.__node.unique + "input", args);
            let result = fn(...args);
            if (typeof result?.then === "function") {
              result.then((res) => {
                if (res !== void 0)
                  this.__node.state.setValue(this.__node.unique, res);
              }).catch(console.error);
            } else if (result !== void 0)
              this.__node.state.setValue(this.__node.unique, result);
            return result;
          };
          properties.default = this.default;
        }
        if (properties instanceof Graph)
          this.__node.source = properties;
      }
    }
    __addLocalState(props) {
      if (!props)
        return;
      if (!this.__node.localState) {
        this.__node.localState = {};
      }
      let localState = this.__node.localState;
      for (let k in props) {
        if (typeof props[k] === "function") {
          if (!k.startsWith("_")) {
            let fn = props[k].bind(this);
            props[k] = (...args) => {
              if (this.__node.inputState)
                this.__node.state.setValue(this.__node.unique + "." + k + "input", args);
              let result = fn(...args);
              if (typeof result?.then === "function") {
                result.then((res) => {
                  this.__node.state.setValue(this.__node.unique + "." + k, res);
                }).catch(console.error);
              } else
                this.__node.state.setValue(this.__node.unique + "." + k, result);
              return result;
            };
            this[k] = props[k];
          }
        } else {
          localState[k] = props[k];
          let definition = {
            get: () => {
              return localState[k];
            },
            set: (v) => {
              if (this.__node.state.triggers[this.__node.unique + "." + k])
                this.__node.state.setValue(this.__node.unique + "." + k, v);
              localState[k] = v;
            },
            enumerable: true,
            configurable: true
          };
          Object.defineProperty(this, k, definition);
          const ogProps = this.__node.initial;
          let dec = Object.getOwnPropertyDescriptor(ogProps, k);
          if (dec === void 0 || dec?.configurable)
            Object.defineProperty(ogProps, k, definition);
        }
      }
    }
    __addOnconnected(callback) {
      if (Array.isArray(this.__ondisconnected)) {
        this.__onconnected.push(callback);
      } else if (typeof this.__onconnected === "function") {
        this.__onconnected = [callback, this.__onconnected];
      } else
        this.__onconnected = callback;
    }
    __addDisconnected(callback) {
      if (Array.isArray(this.__ondisconnected)) {
        this.__ondisconnected.push(callback);
      } else if (typeof this.__ondisconnected === "function") {
        this.__ondisconnected = [callback, this.__ondisconnected];
      } else
        this.__ondisconnected = callback;
    }
    __callConnected(node = this) {
      if (typeof this.__onconnected === "function") {
        this.__onconnected(this);
      } else if (Array.isArray(this.__onconnected)) {
        this.__onconnected.forEach((o) => {
          o(this);
        });
      }
    }
    __callDisconnected(node = this) {
      if (typeof this.__ondisconnected === "function")
        this.__ondisconnected(this);
      else if (Array.isArray(this.__ondisconnected)) {
        this.__ondisconnected.forEach((o) => {
          o(this);
        });
      }
    }
  };
  var Graph = class {
    constructor(options) {
      this.__node = {
        tag: `graph${Math.floor(Math.random() * 1e15)}`,
        nodes: /* @__PURE__ */ new Map(),
        state
      };
      this.init = (options) => {
        if (options) {
          recursivelyAssign(this.__node, options);
          if (options.tree)
            this.setTree(options.tree);
        }
      };
      this.setTree = (tree2) => {
        this.__node.tree = Object.assign(this.__node.tree ? this.__node.tree : {}, tree2);
        let cpy = Object.assign({}, tree2);
        delete cpy.__node;
        let listeners2 = this.recursiveSet(cpy, this);
        if (tree2.__node) {
          if (!tree2.__node.tag)
            tree2.__node._tag = `tree${Math.floor(Math.random() * 1e15)}`;
          else if (!this.get(tree2.__node.tag)) {
            let node = new GraphNode(tree2, this, this);
            for (const l in this.__node.loaders) {
              this.__node.loaders[l](node, this, this, tree2, tree2);
            }
            this.__node.nodes.set(node.__node.tag, node);
            if (node.__listeners) {
              listeners2[node.__node.tag] = node.__listeners;
            }
          }
        }
        this.setListeners(listeners2);
      };
      this.setLoaders = (loaders, replace) => {
        if (replace)
          this.__node.loaders = loaders;
        else
          Object.assign(this.__node.loaders, loaders);
        return this.__node.loaders;
      };
      this.add = (properties, parent) => {
        let listeners2 = {};
        if (typeof parent === "string")
          parent = this.get(parent);
        let props = Object.assign({}, properties);
        if (properties.__node)
          props.__node = Object.assign({}, properties.__node);
        if (!props.__node?.tag || !this.get(props.__node.tag)) {
          let node = new GraphNode(props, parent, this);
          for (const l in this.__node.loaders) {
            this.__node.loaders[l](node, parent, this, this.__node.tree, properties);
          }
          this.__node.nodes.set(node.__node.tag, node);
          this.__node.tree[node.__node.tag] = properties;
          if (node.__listeners) {
            listeners2[node.__node.tag] = node.__listeners;
          }
          if (node.__children) {
            node.__children = Object.assign({}, node.__children);
            this.recursiveSet(node.__children, node, listeners2);
          }
          this.setListeners(listeners2);
          node.__callConnected();
          return node;
        }
        return;
      };
      this.recursiveSet = (t, parent, listeners2 = {}) => {
        for (const key in t) {
          let p = t[key];
          if (Array.isArray(p))
            continue;
          if (typeof p === "function")
            p = { __operator: p };
          else if (typeof p === "string")
            p = this.__node.tree[p];
          else if (typeof p === "boolean")
            p = this.__node.tree[key];
          if (typeof p === "object") {
            p = Object.assign({}, p);
            if (!p.__node)
              p.__node = {};
            if (!p.__node.tag)
              p.__node.tag = key;
            if (this.get(p.__node.tag) || parent?.__node && this.get(parent.__node.tag + "." + p.__node.tag))
              continue;
            let props = Object.assign({}, p);
            props.__node = Object.assign({}, p.__node);
            let node = new GraphNode(props, parent, this);
            for (const l in this.__node.loaders) {
              this.__node.loaders[l](node, parent, this, t, p);
            }
            t[key] = node;
            this.__node.tree[node.__node.tag] = p;
            this.set(node.__node.tag, node);
            if (node.__listeners) {
              listeners2[node.__node.tag] = node.__listeners;
            } else if (node.__children) {
              node.__children = Object.assign({}, node.__children);
              this.recursiveSet(node.__children, node, listeners2);
            }
            node.__callConnected();
          }
        }
        return listeners2;
      };
      this.remove = (node, clearListeners = true) => {
        this.unsubscribe(node);
        if (typeof node === "string")
          node = this.get(node);
        if (node instanceof GraphNode) {
          this.__node.nodes.delete(node.__node.tag);
          delete this.__node.tree[node.__node.tag];
          if (clearListeners) {
            this.clearListeners(node);
          }
          node.__callDisconnected();
          const recursiveRemove = (t) => {
            for (const key in t) {
              this.unsubscribe(t[key]);
              this.__node.nodes.delete(t[key].__node.tag);
              delete this.__node.tree[t[key].__node.tag];
              this.__node.nodes.delete(key);
              delete this.__node.tree[key];
              t[key].__node.tag = t[key].__node.tag.substring(t[key].__node.tag.lastIndexOf(".") + 1);
              if (clearListeners) {
                this.clearListeners(t[key]);
              }
              t[key].__callDisconnected();
              if (t[key].__children) {
                recursiveRemove(t[key].__children);
              }
            }
          };
          if (node.__children) {
            recursiveRemove(node.__children);
          }
        }
        if (node?.__node.tag && node?.__parent) {
          delete node?.__parent;
          node.__node.tag = node.__node.tag.substring(node.__node.tag.indexOf(".") + 1);
        }
        return node;
      };
      this.removeTree = (tree2) => {
      };
      this.run = (node, ...args) => {
        if (typeof node === "string") {
          let nd = this.get(node);
          if (!nd && node.includes(".")) {
            nd = this.get(node.substring(0, node.lastIndexOf(".")));
            if (typeof nd?.[node.substring(node.lastIndexOf(".") + 1)] === "function")
              return nd[node.substring(node.lastIndexOf(".") + 1)](...args);
          } else
            return nd.__operator(...args);
        }
        if (node?.__operator) {
          return node?.__operator(...args);
        }
      };
      this.setListeners = (listeners2) => {
        for (const key in listeners2) {
          let node = this.get(key);
          if (typeof listeners2[key] === "object") {
            for (const k in listeners2[key]) {
              let n = this.get(k);
              let sub;
              console.log("listener", k, "for", key, "k first part:", k.substring(0, k.lastIndexOf(".")), "; k second part:", k.substring(k.lastIndexOf(".") + 1));
              if (typeof listeners2[key][k] === "function")
                listeners2[key][k] = { callback: listeners2[key][k] };
              if (typeof listeners2[key][k].callback === "function")
                listeners2[key][k].callback = listeners2[key][k].callback.bind(node);
              if (typeof node.__listeners !== "object")
                node.__listeners = {};
              if (!n) {
                let tag = k.substring(0, k.lastIndexOf("."));
                n = this.get(tag);
                if (n) {
                  sub = this.subscribe(n, listeners2[key][k].callback, k.substring(k.lastIndexOf(".") + 1), listeners2[key][k].inputState, key, k);
                  if (typeof node.__listeners[k] !== "object")
                    node.__listeners[k] = { callback: listeners2[key][k].callback, inputState: listeners2[key][k]?.inputState };
                  node.__listeners[k].sub = sub;
                }
              } else {
                sub = this.subscribe(n, listeners2[key][k].callback, void 0, listeners2[key][k].inputState, key, k);
                if (typeof node.__listeners[k] !== "object")
                  node.__listeners[k] = { callback: listeners2[key][k].callback, inputState: listeners2[key][k]?.inputState };
                node.__listeners[k].sub = sub;
              }
            }
          }
        }
      };
      this.clearListeners = (node, listener) => {
        if (typeof node === "string")
          node = this.get(node);
        if (node?.__listeners) {
          for (const key in node.__listeners) {
            if (listener && key !== listener)
              continue;
            if (typeof node.__listeners[key].sub !== "number")
              continue;
            let n = this.get(key);
            if (!n) {
              n = this.get(key.substring(0, key.lastIndexOf(".")));
              if (n)
                this.unsubscribe(n, node.__listeners[key].sub, key.substring(key.lastIndexOf(".") + 1), node.__listeners[key].inputState);
            } else {
              this.unsubscribe(n, node.__listeners[key].sub, void 0, node.__listeners[key].inputState);
            }
            delete node.__listeners[key];
          }
        }
      };
      this.get = (tag) => {
        return this.__node.nodes.get(tag);
      };
      this.set = (tag, node) => {
        return this.__node.nodes.set(tag, node);
      };
      this.getProps = (node, getInitial) => {
        if (typeof node === "string")
          node = this.get(node);
        if (node instanceof GraphNode) {
          let cpy;
          if (getInitial)
            cpy = Object.assign({}, this.__node.tree[node.__node.tag]);
          else {
            cpy = Object.assign({}, node);
            delete cpy.__unsubscribe;
            delete cpy.__setOperator;
            delete cpy.__node;
            delete cpy.__subscribeState;
            delete cpy.__subscribe;
          }
        }
      };
      this.subscribe = (node, callback, key, subInput, target, bound) => {
        let nd = node;
        if (!(node instanceof GraphNode))
          nd = this.get(node);
        let sub;
        if (nd instanceof GraphNode) {
          if (typeof callback === "string" && target)
            callback = target + "." + callback;
          sub = nd.__subscribe(callback, key, subInput, target, bound);
          let ondelete = () => {
            nd.__unsubscribe(sub, key, subInput);
          };
          nd.__addDisconnected(ondelete);
        } else if (typeof node === "string") {
          if (callback instanceof GraphNode && callback.__operator) {
            sub = this.get(node).__subscribe(callback.__operator, key, subInput, target, bound);
            let ondelete = () => {
              this.get(node).__unsubscribe(sub);
            };
            callback.__addDisconnected(ondelete);
          } else if (typeof callback === "function" || typeof callback === "string") {
            sub = this.get(node).__subscribe(callback, key, subInput, target, bound);
            this.__node.state.getTrigger(this.get(node).__node.unique, sub).source = node;
          }
        }
        return sub;
      };
      this.unsubscribe = (node, sub, key, subInput) => {
        if (node instanceof GraphNode) {
          return node.__unsubscribe(sub, key, subInput);
        } else
          return this.get(node)?.__unsubscribe(sub, key, subInput);
      };
      this.setState = (update) => {
        this.__node.state.setState(update);
      };
      this.init(options);
    }
  };
  function recursivelyAssign(target, obj) {
    for (const key in obj) {
      if (obj[key]?.constructor.name === "Object" && !Array.isArray(obj[key])) {
        if (target[key]?.constructor.name === "Object" && !Array.isArray(target[key]))
          recursivelyAssign(target[key], obj[key]);
        else
          target[key] = recursivelyAssign({}, obj[key]);
      } else {
        target[key] = obj[key];
      }
    }
    return target;
  }

  // ../showcase/demos/graph/index.esc.js
  var index_esc_exports = {};
  __export(index_esc_exports, {
    __children: () => __children,
    __element: () => __element,
    __listeners: () => __listeners
  });

  // ../showcase/demos/graph/components/nodeA.esc.js
  var nodeA_esc_exports = {};
  __export(nodeA_esc_exports, {
    jump: () => jump,
    x: () => x,
    y: () => y
  });

  // ../showcase/demos/graph/utils/index.js
  var getTopNode = (target) => {
    while (target.__parent && target.__parent.hasAttribute("escomponent")) {
      const component = target.__parent.__component;
      if (component.__parent)
        target = component;
      else
        break;
    }
    return target.__element;
  };

  // ../showcase/demos/graph/components/nodeA.esc.js
  var x = 1;
  var y = 2;
  function jump() {
    const id = this._node ? "escXgs" : "esc";
    const escDiv = document.getElementById(id) ?? getTopNode(this);
    escDiv.insertAdjacentHTML("beforeend", `<li>jump!</li>`);
    return "jumped!";
  }

  // ../showcase/demos/graph/components/nodeB.esc.js
  var nodeB_esc_exports = {};
  __export(nodeB_esc_exports, {
    x: () => x2,
    y: () => y2
  });
  var x2 = 3;
  var y2 = 4;

  // ../showcase/demos/graph/components/nodeC.esc.js
  var nodeC_esc_exports = {};
  __export(nodeC_esc_exports, {
    z: () => z
  });
  var z = 4;

  // ../showcase/demos/graph/components/nodeD.esc.js
  var nodeD_esc_exports = {};
  __export(nodeD_esc_exports, {
    default: () => nodeD_esc_default
  });
  var nodeD_esc_default = (a, b, c) => {
    return a + b + c;
  };

  // ../showcase/demos/graph/index.esc.js
  var escId = "esc";
  var escxgsId = "escXgs";
  var __element = "div";
  var __children = {
    nodeA: {
      __compose: nodeA_esc_exports
    },
    nodeB: {
      __compose: nodeB_esc_exports,
      __children: {
        nodeC: {
          __compose: nodeC_esc_exports,
          default: function(a) {
            this.z += a;
            const id = this._node ? escxgsId : escId;
            const esmDiv = document.getElementById(id) ?? getTopNode(this);
            if (esmDiv)
              esmDiv.insertAdjacentHTML("beforeend", `<li>nodeC z prop added to</li>`);
            return this.z;
          }
        }
      }
    },
    nodeD: {
      __compose: nodeD_esc_exports
    },
    nodeE: {
      __animate: 1,
      default: function() {
        const id = this._node ? escxgsId : escId;
        const esmDiv = document.getElementById(id) ?? getTopNode(this);
        if (esmDiv)
          esmDiv.insertAdjacentHTML("beforeend", `<li>looped!</li>`);
      }
    }
  };
  var __listeners = {
    "": {
      "nodeA.x": {
        value: function(newX) {
          const id = this._node ? escxgsId : escId;
          const esmDiv = document.getElementById(id) ?? getTopNode(this);
          if (esmDiv)
            esmDiv.insertAdjacentHTML("beforeend", `<li>nodeA x prop updated ${newX}</li>`);
        },
        __bind: "nodeB.nodeC"
      },
      "nodeA.jump": {
        value: function(jump3) {
          const esmDiv = document.getElementById(this._node ? escxgsId : escId) ?? getTopNode(this);
          if (esmDiv)
            esmDiv.insertAdjacentHTML("beforeend", `<li>nodeA ${jump3}</li>`);
        },
        __bind: "nodeB.nodeC"
      },
      "nodeB.x": {
        value: function(newX) {
          this.x = newX;
          const esmDiv = document.getElementById(this._node ? escxgsId : escId) ?? getTopNode(this);
          if (esmDiv)
            esmDiv.insertAdjacentHTML("beforeend", `<li>nodeB x prop changed: ${newX}</li>`);
          return newX;
        },
        __bind: "nodeA"
      },
      "nodeB.nodeC": {
        value: function(op_result) {
          const esmDiv = document.getElementById(this._node ? escxgsId : escId) ?? getTopNode(this);
          if (esmDiv)
            esmDiv.insertAdjacentHTML("beforeend", `<li>nodeC operator returned: ${op_result}</li>`);
          return op_result;
        },
        __bind: "nodeA"
      },
      "nodeB.nodeC.z": {
        value: function(newZ) {
          const esmDiv = document.getElementById(this._node ? escxgsId : escId) ?? getTopNode(this);
          if (esmDiv)
            esmDiv.insertAdjacentHTML("beforeend", `<li>nodeC z prop changed: ${newZ}</li>`);
          return newZ;
        },
        __bind: "nodeA"
      }
    }
  };

  // nodes/nodeA.js
  var nodeA_exports = {};
  __export(nodeA_exports, {
    __listeners: () => __listeners2,
    jump: () => jump2,
    x: () => x3,
    y: () => y3
  });
  var x3 = 1;
  var y3 = 2;
  var jump2 = function() {
    const id = this.__node ? "tree" : "gsXesc";
    const treeDiv = document.getElementById(id);
    treeDiv.innerHTML += `<li>jump!</li>`;
    return "jumped!";
  };
  var __listeners2 = {
    "nodeB.x": function(newX) {
      console.log("Changing a.x with b.x listener", this);
      this.x = newX;
      const id = this.__node ? "tree" : "gsXesc";
      const treeDiv = document.getElementById(id);
      treeDiv.innerHTML += `<li>nodeB x prop changed: ${newX}</li>`;
    },
    "nodeB.nodeC": function(op_result) {
      const id = this.__node ? "tree" : "gsXesc";
      const treeDiv = document.getElementById(id);
      treeDiv.innerHTML += `<li>nodeC operator returned: ${op_result}</li>`;
    },
    "nodeB.nodeC.z": function(newZ) {
      console.log("nodeC z prop changed... (NOT HAPPENING)");
      const id = this.__node ? "tree" : "gsXesc";
      const treeDiv = document.getElementById(id);
      treeDiv.innerHTML += `<li>nodeC z prop changed: ${newZ}</li>`;
    }
  };

  // tree.js
  var nodeAInstance = Object.assign({}, nodeA_exports);
  var tree = {
    nodeA: nodeAInstance,
    nodeB: {
      x: 3,
      y: 4,
      __children: {
        nodeC: {
          z: 4,
          __operator: function(a) {
            console.log("NODE C Z THING", this);
            this.z += a;
            const id = this.__node ? "tree" : "gsXesc";
            const div = document.getElementById(id);
            div.innerHTML += `<li>nodeC z prop added to</li>`;
            return this.z;
          },
          __listeners: {
            "nodeA.x": function(newX) {
              console.log("Node A x changed");
              const id = this.__node ? "tree" : "gsXesc";
              const div = document.getElementById(id);
              div.innerHTML += `<li>nodeA x prop updated ${newX}</li>`;
            },
            "nodeA.jump": function(jump3) {
              const id = this.__node ? "tree" : "gsXesc";
              const div = document.getElementById(id);
              div.innerHTML += `<li>nodeA ${jump3}</li>`;
            }
          }
        }
      }
    },
    nodeD: (a, b, c) => {
      return a + b + c;
    },
    nodeE: {
      __loop: 1e3,
      __operator: function() {
        const id = this.__node ? "tree" : "gsXesc";
        const div = document.getElementById(id);
        div.innerHTML += `<li>looped!</li>`;
      }
    }
  };
  var tree_default = tree;

  // ../../libraries/escomposer/src/schema/graphscript.ts
  var graphscript_exports = {};
  __export(graphscript_exports, {
    from: () => from,
    to: () => to
  });

  // ../../libraries/common/check.js
  var moduleStringTag = "[object Module]";
  var esm = (object) => {
    const res = object && (!!Object.keys(object).reduce((a, b) => {
      const desc = Object.getOwnPropertyDescriptor(object, b);
      const isModule = desc && desc.get && !desc.set ? 1 : 0;
      return a + isModule;
    }, 0) || Object.prototype.toString.call(object) === moduleStringTag);
    return !!res;
  };

  // ../../libraries/esmonitor/src/utils.ts
  var isSame = (a, b) => {
    if (a && typeof a === "object" && b && typeof b === "object") {
      const jA = JSON.stringify(a);
      const jB = JSON.stringify(b);
      return jA === jB;
    } else
      return a === b;
  };
  var iterateSymbols = (obj, callback) => {
    return Promise.all(Object.getOwnPropertySymbols(obj).map((sym) => callback(sym, obj[sym])));
  };
  var getPath = (type, info2) => {
    const pathType = info2.path[type];
    if (!pathType)
      throw new Error("Invalid Path Type");
    const filtered = pathType.filter((v) => typeof v === "string");
    return filtered.join(info2.keySeparator);
  };
  var getPathInfo = (path, options) => {
    let splitPath = path;
    if (typeof path === "string")
      splitPath = path.split(options.keySeparator);
    else if (typeof path === "symbol")
      splitPath = [path];
    return {
      id: splitPath[0],
      path: splitPath.slice(1)
    };
  };
  var runCallback = (callback, path, info2, output, setGlobal = true) => {
    if (callback instanceof Function) {
      if (output && typeof output === "object" && typeof output.then === "function")
        output.then((value2) => callback(path, info2, value2));
      else
        callback(path, info2, output);
    }
    if (setGlobal && window.ESMonitorState) {
      const callback2 = window.ESMonitorState.callback;
      window.ESMonitorState.state[path] = { output, value: info2 };
      runCallback(callback2, path, info2, output, false);
    }
  };

  // ../../libraries/esmonitor/src/Poller.ts
  var defaultSamplingRate = 60;
  var Poller = class {
    constructor(listeners2, sps) {
      this.listeners = {};
      this.setOptions = (opts = {}) => {
        for (let key in opts)
          this[key] = opts[key];
      };
      this.add = (info2) => {
        const sub = info2.sub;
        this.listeners[sub] = info2;
        this.start();
      };
      this.get = (sub) => this.listeners[sub];
      this.remove = (sub) => {
        delete this.listeners[sub];
        if (!Object.keys(this.listeners).length)
          this.stop();
      };
      this.poll = (listeners2) => {
        iterateSymbols(listeners2, (sym, o) => {
          let { callback, current, history } = o;
          if (!o.path.resolved)
            o.path.resolved = getPath("output", o);
          if (!isSame(current, history)) {
            runCallback(callback, o.path.resolved, {}, current);
            if (typeof current === "object") {
              if (Array.isArray(current))
                history = [...current];
              else
                history = { ...current };
            } else
              listeners2[sym].history = current;
          }
        });
      };
      this.start = (listeners2 = this.listeners) => {
        if (!this.sps)
          this.sps = defaultSamplingRate;
        else if (!this.#pollingId) {
          console.warn("[escode]: Starting Polling!");
          this.#pollingId = setInterval(() => this.poll(listeners2), 1e3 / this.sps);
        }
      };
      this.stop = () => {
        if (this.#pollingId) {
          console.warn("[escode]: Stopped Polling!");
          clearInterval(this.#pollingId);
          this.#pollingId = void 0;
        }
      };
      if (listeners2)
        this.listeners = listeners2;
      if (sps)
        this.sps = sps;
    }
    #pollingId;
    #sps;
    get sps() {
      return this.#sps;
    }
    set sps(sps) {
      this.#sps = sps;
      const listeners2 = this.listeners;
      const nListeners = Object.keys(listeners2).length;
      if (nListeners) {
        this.stop();
        this.start();
      }
    }
  };

  // ../../libraries/esmonitor/src/listeners.ts
  var listeners_exports = {};
  __export(listeners_exports, {
    functionExecution: () => functionExecution,
    functions: () => functions2,
    info: () => info,
    register: () => register,
    set: () => set,
    setterExecution: () => setterExecution,
    setters: () => setters
  });

  // ../../libraries/esmonitor/src/global.ts
  window.ESMonitorState = {
    state: {},
    callback: void 0,
    info: {}
  };
  var global_default = window.ESMonitorState;

  // ../../libraries/esmonitor/src/info.ts
  var performance = async (callback, args) => {
    const tic = globalThis.performance.now();
    const output = await callback(...args);
    const toc = globalThis.performance.now();
    return {
      output,
      value: toc - tic
    };
  };
  var infoFunctions = {
    performance
  };
  var get = (func, args, info2) => {
    let result = {
      value: {},
      output: void 0
    };
    const infoToGet = { ...global_default.info, ...info2 };
    for (let key in infoToGet) {
      if (infoToGet[key] && infoFunctions[key]) {
        const ogFunc = func;
        func = async (...args2) => {
          const o = await infoFunctions[key](ogFunc, args2);
          result.value[key] = o.value;
          return o.output;
        };
      }
    }
    result.output = func(...args);
    return result;
  };

  // ../../libraries/esmonitor/src/globals.ts
  var isProxy = Symbol("isProxy");
  var fromInspectable = Symbol("fromInspectable");

  // ../../libraries/esc/standards.js
  var keySeparator = ".";
  var defaultPath = "default";
  var esSourceKey = "__esmpileSourceBundle";
  var isPrivate = (key) => false;
  var specialKeys = {
    default: defaultPath,
    start: "__connected",
    stop: "__disconnected",
    connected: "__ready",
    hierarchy: "__children",
    element: "__element",
    webcomponents: "__define",
    attributes: "__attributes",
    listeners: {
      value: "__listeners",
      branch: "__branch",
      bind: "__bind",
      trigger: "__trigger",
      format: "__format"
    },
    trigger: "__trigger",
    compose: "__compose",
    uri: "__src",
    reference: "__object",
    childPosition: "__childposition",
    attribute: "escomponent",
    options: "__options",
    parent: "__parent",
    component: "__component",
    source: "__source",
    path: "__path",
    animate: "__animate",
    states: "__states",
    promise: "__childresolved",
    editor: "__editor",
    flow: "__manager",
    original: "__original",
    resize: "__onresize",
    proxy: "__proxy"
  };

  // ../../libraries/common/pathHelpers.ts
  var hasKey = (key, obj) => key in obj;
  var getShortcut = (path, shortcuts, keySeparator2) => {
    const sc = shortcuts[path[0]];
    if (sc) {
      const value2 = sc[path.slice(1).join(keySeparator2)];
      if (value2)
        return value2;
    }
  };
  var getFromPath = (baseObject, path, opts = {}) => {
    const fallbackKeys = opts.fallbacks ?? [];
    const keySeparator2 = opts.keySeparator ?? keySeparator;
    if (opts.shortcuts) {
      const shortcut = getShortcut(path, opts.shortcuts, keySeparator2);
      if (shortcut) {
        if (opts.output === "info")
          return { value: shortcut, exists: true, shortcut: true };
        else
          return shortcut;
      }
    }
    if (typeof path === "string")
      path = path.split(keySeparator2);
    else if (typeof path == "symbol")
      path = [path];
    let exists;
    path = [...path];
    let ref = baseObject;
    for (let i = 0; i < path.length; i++) {
      if (!ref) {
        const message = `Could not get path`;
        console.error(message, path, ref);
        throw new Error(message);
      }
      const str = path[i];
      if (!hasKey(str, ref) && "__children" in ref) {
        for (let i2 in fallbackKeys) {
          const key = fallbackKeys[i2];
          if (hasKey(key, ref)) {
            ref = ref[key];
            break;
          }
        }
      }
      exists = hasKey(str, ref);
      if (exists)
        ref = ref[str];
      else {
        ref = void 0;
        exists = true;
      }
    }
    if (opts.output === "info")
      return { value: ref, exists };
    else
      return ref;
  };
  var setFromPath = (path, value2, ref, opts = {}) => {
    const create3 = opts?.create ?? false;
    const keySeparator2 = opts?.keySeparator ?? keySeparator;
    if (typeof path === "string")
      path = path.split(keySeparator2);
    else if (typeof path == "symbol")
      path = [path];
    path = [...path];
    const copy = [...path];
    const last = copy.pop();
    if (ref.__children)
      ref = ref.__children;
    for (let i = 0; i < copy.length; i++) {
      const str = copy[i];
      let has = hasKey(str, ref);
      if (create3 && !has) {
        ref[str] = {};
        has = true;
      }
      if (has)
        ref = ref[str];
      else {
        const message = `Could not set path`;
        console.error(message, path);
        throw new Error(message);
      }
      if (ref.__children)
        ref = ref.__children;
    }
    ref[last] = value2;
  };

  // ../../libraries/esmonitor/src/inspectable/handlers.ts
  var handlers_exports = {};
  __export(handlers_exports, {
    functions: () => functions,
    objects: () => objects
  });
  var functions = (proxy) => {
    return {
      apply: async function(target, thisArg, argumentsList) {
        try {
          let foo = target;
          const isFromInspectable = argumentsList[0]?.[fromInspectable];
          if (isFromInspectable) {
            foo = argumentsList[0].value;
            argumentsList = argumentsList.slice(1);
          }
          let listeners2 = proxy.listeners.functions;
          const pathStr = proxy.path.join(proxy.options.keySeparator);
          const toActivate = listeners2 ? listeners2[pathStr] : void 0;
          let output, executionInfo = {};
          if (toActivate) {
            executionInfo = functionExecution(thisArg, toActivate, foo, argumentsList);
            output = executionInfo.output;
          } else {
            output = foo.apply(thisArg, argumentsList);
            executionInfo = proxy?.state?.[pathStr]?.value ?? {};
          }
          const callback = proxy.options.callback;
          runCallback(callback, pathStr, executionInfo, output);
          return output;
        } catch (e) {
          console.warn(`Function failed:`, e, proxy.path);
        }
      }
    };
  };
  var objects = (proxy) => {
    return {
      get(target, prop, receiver) {
        if (prop === isProxy)
          return true;
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, newVal, receiver) {
        if (prop === isProxy)
          return true;
        const pathStr = [...proxy.path, prop].join(proxy.options.keySeparator);
        const isFromInspectable = newVal?.[fromInspectable];
        if (isFromInspectable)
          newVal = newVal.value;
        const listeners2 = proxy.listeners.setters;
        if (!target.hasOwnProperty(prop)) {
          if (typeof proxy.options.globalCallback === "function") {
            const id = proxy.path[0];
            set("setters", pathStr, newVal, proxy.options.globalCallback, { [id]: proxy.root }, proxy.listeners, proxy.options);
          }
        }
        if (newVal) {
          const newProxy = proxy.create(prop, target, newVal);
          if (newProxy)
            newVal = newProxy;
        }
        if (listeners2) {
          const toActivate = listeners2[pathStr];
          if (toActivate)
            setterExecution(toActivate, newVal);
        }
        const callback = proxy.options.callback;
        const info2 = proxy?.state?.[pathStr]?.value ?? {};
        runCallback(callback, pathStr, info2, newVal);
        if (isFromInspectable)
          return true;
        else
          return Reflect.set(target, prop, newVal, receiver);
      }
    };
  };

  // ../../libraries/esmonitor/src/inspectable/index.ts
  var canCreate = (parent, key, val) => {
    try {
      if (val === void 0)
        val = parent[key];
    } catch (e) {
      return e;
    }
    const alreadyIs = parent[key] && parent[key][isProxy];
    if (alreadyIs)
      return false;
    const type = typeof val;
    const isObject = type === "object";
    const isFunction = type == "function";
    const notObjOrFunc = !val || !(isObject || isFunction);
    if (notObjOrFunc)
      return false;
    if (val instanceof Element)
      return false;
    if (val instanceof EventTarget)
      return false;
    const isESM = isObject && esm(val);
    if (isFunction)
      return true;
    else {
      const desc = Object.getOwnPropertyDescriptor(parent, key);
      if (desc && (desc.value && desc.writable || desc.set)) {
        if (!isESM)
          return true;
      } else if (!parent.hasOwnProperty(key))
        return true;
    }
    return false;
  };
  var Inspectable = class {
    constructor(target = {}, opts = {}, name2, parent) {
      this.path = [];
      this.listeners = {};
      this.state = {};
      this.set = (path, info2, update) => {
        this.state[path] = {
          output: update,
          value: info2
        };
        setFromPath(path, update, this.proxy, { create: true });
      };
      this.check = canCreate;
      this.create = (key, parent, val, set2 = false) => {
        const create3 = this.check(parent, key, val);
        if (val === void 0)
          val = parent[key];
        if (create3 && !(create3 instanceof Error)) {
          parent[key] = new Inspectable(val, this.options, key, this);
          return parent[key];
        }
        if (set2) {
          try {
            this.proxy[key] = val ?? parent[key];
          } catch (e) {
            const isESM = esm(parent);
            const path = [...this.path, key];
            console.error(`Could not set value (${path.join(this.options.keySeparator)})${isESM ? " because the parent is an ESM." : ""}`, isESM ? "" : e);
          }
        }
        return;
      };
      if (!opts.pathFormat)
        opts.pathFormat = "relative";
      if (!opts.keySeparator)
        opts.keySeparator = keySeparator;
      if (target.__proxy)
        this.proxy = target.__proxy;
      else if (target[isProxy])
        this.proxy = target;
      else {
        this.target = target;
        this.options = opts;
        this.parent = parent;
        if (this.parent) {
          this.root = this.parent.root;
          this.path = [...this.parent.path];
          this.state = this.parent.state ?? {};
        } else
          this.root = target;
        if (name2)
          this.path.push(name2);
        if (this.options.listeners)
          this.listeners = this.options.listeners;
        if (this.options.path) {
          if (this.options.path instanceof Function)
            this.path = this.options.path(this.path);
          else if (Array.isArray(this.options.path))
            this.path = this.options.path;
          else
            console.log("Invalid path", this.options.path);
        }
        if (this.path)
          this.path = this.path.filter((str) => typeof str === "string");
        if (!this.options.keySeparator)
          this.options.keySeparator = keySeparator;
        let type = this.options.type;
        if (type != "object")
          type = typeof target === "function" ? "function" : "object";
        const handler2 = handlers_exports[`${type}s`](this);
        this.proxy = new Proxy(target, handler2);
        Object.defineProperty(target, "__proxy", { value: this.proxy, enumerable: false });
        Object.defineProperty(target, "__esInspectable", { value: this, enumerable: false });
        for (let key in target) {
          if (!this.parent) {
            let value2 = target[key];
            if (typeof value2 === "function") {
              target[key] = async (...args) => await this.proxy[key]({ [fromInspectable]: true, value: value2 }, ...args);
            } else {
              try {
                Object.defineProperty(target, key, {
                  get: () => value2,
                  set: (val) => {
                    value2 = val;
                    this.proxy[key] = { [fromInspectable]: true, value: val };
                  },
                  enumerable: true,
                  configurable: true
                });
              } catch (e) {
                console.error(`Could not reassign ${key} to a top-level setter...`);
              }
            }
          }
          this.create(key, target, void 0, true);
        }
      }
      return this.proxy;
    }
  };

  // ../../libraries/esmonitor/src/optionsHelpers.ts
  var setFromOptions = (path, value2, baseOptions, opts) => {
    const ref = opts.reference;
    const id = Array.isArray(path) ? path[0] : typeof path === "string" ? path.split(baseOptions.keySeparator)[0] : path;
    let isDynamic = opts.hasOwnProperty("static") ? !opts.static : false;
    if (isDynamic && !globalThis.Proxy) {
      isDynamic = false;
      console.warn("Falling back to using function interception and setters...");
    }
    if (isDynamic) {
      value2 = new Inspectable(value2, {
        pathFormat: baseOptions.pathFormat,
        keySeparator: baseOptions.keySeparator,
        listeners: opts.listeners,
        path: (path2) => path2.filter((str) => !baseOptions.fallbacks || !baseOptions.fallbacks.includes(str))
      }, id);
    }
    let options = { keySeparator: baseOptions.keySeparator, ...opts };
    setFromPath(path, value2, ref, options);
    return value2;
  };

  // ../../libraries/esmonitor/src/listeners.ts
  var info = (id, callback, path, originalValue, base, listeners2, options, refShortcut = {}) => {
    if (typeof path === "string")
      path = path.split(options.keySeparator);
    const relativePath = path.join(options.keySeparator);
    const refs = base;
    const shortcutRef = refShortcut.ref;
    const shortcutPath = refShortcut.path;
    const get3 = (path2) => {
      const thisBase = shortcutRef ?? base;
      const res = getFromPath(thisBase, path2, {
        keySeparator: options.keySeparator,
        fallbacks: options.fallbacks
      });
      return res;
    };
    const set2 = (path2, value2) => {
      const thisBase = shortcutRef ?? base;
      setFromOptions(path2, value2, options, {
        reference: thisBase,
        listeners: listeners2
      });
    };
    let onUpdate = options.onUpdate;
    let infoToOutput = {};
    if (onUpdate && typeof onUpdate === "object" && onUpdate.callback instanceof Function) {
      infoToOutput = onUpdate.info ?? {};
      onUpdate = onUpdate.callback;
    }
    const absolute = [id, ...path];
    let pathInfo = {
      absolute,
      relative: relativePath.split(options.keySeparator),
      parent: absolute.slice(0, -1)
    };
    pathInfo.output = pathInfo[options.pathFormat];
    const completePathInfo = pathInfo;
    const info2 = {
      id,
      path: completePathInfo,
      keySeparator: options.keySeparator,
      infoToOutput,
      callback: (...args) => {
        const output = callback(...args);
        if (onUpdate instanceof Function)
          onUpdate(...args);
        return output;
      },
      get current() {
        return get3(shortcutPath ?? info2.path.absolute);
      },
      set current(val) {
        set2(shortcutPath ?? info2.path.absolute, val);
      },
      get parent() {
        return get3(shortcutPath ? shortcutPath?.slice(0, -1) : info2.path.parent);
      },
      get reference() {
        return refs[id];
      },
      set reference(val) {
        refs[id] = val;
      },
      original: originalValue,
      history: typeof originalValue === "object" ? Object.assign({}, originalValue) : originalValue,
      sub: Symbol("subscription"),
      last: path.slice(-1)[0]
    };
    return info2;
  };
  var registerInLookup = (name2, sub, lookups) => {
    if (lookups) {
      const id = Math.random();
      lookups.symbol[sub] = {
        name: name2,
        id
      };
      if (!lookups.name[name2])
        lookups.name[name2] = {};
      lookups.name[name2][id] = sub;
    }
  };
  var register = (info2, collection, lookups) => {
    const absolute = getPath("absolute", info2);
    if (!collection[absolute])
      collection[absolute] = {};
    collection[absolute][info2.sub] = info2;
    registerInLookup(absolute, info2.sub, lookups);
  };
  var listeners = {
    functions: functions2,
    setters
  };
  var set = (type, absPath, value2, callback, base, allListeners, options) => {
    const { id, path } = getPathInfo(absPath, options);
    const fullInfo = info(id, callback, path, value2, base, listeners, options);
    if (listeners[type])
      listeners[type](fullInfo, allListeners[type], allListeners.lookup);
    else {
      const path2 = getPath("absolute", fullInfo);
      allListeners[type][path2][fullInfo.sub] = fullInfo;
      if (allListeners.lookup)
        registerInLookup(path2, fullInfo.sub, allListeners.lookup);
    }
  };
  var get2 = (info2, collection) => collection[getPath("absolute", info2)];
  var handler = (info2, collection, subscribeCallback, lookups) => {
    if (!get2(info2, collection)) {
      let parent = info2.parent;
      let val = parent[info2.last];
      subscribeCallback(val, parent);
    }
    register(info2, collection, lookups);
  };
  var setterExecution = (listeners2, value2) => {
    return iterateSymbols(listeners2, (_, o) => {
      const path = getPath("output", o);
      runCallback(o.callback, path, {}, value2);
    });
  };
  function setters(info2, collection, lookups) {
    handler(info2, collection, (value2, parent) => {
      let val = value2;
      if (!parent[isProxy]) {
        let redefine = true;
        try {
          delete parent[info2.last];
        } catch (e) {
          console.error("Unable to redeclare setters. May already be a dynamic object...");
          redefine = false;
        }
        if (redefine) {
          try {
            Object.defineProperty(parent, info2.last, {
              get: () => val,
              set: async (v) => {
                val = v;
                const listeners2 = Object.assign({}, collection[getPath("absolute", info2)]);
                setterExecution(listeners2, v);
              },
              enumerable: true,
              configurable: true
            });
          } catch (e) {
            throw e;
          }
        }
      }
    }, lookups);
  }
  var functionExecution = (context, listeners2, func, args) => {
    listeners2 = Object.assign({}, listeners2);
    const keys = Object.getOwnPropertySymbols(listeners2);
    const infoTemplate = listeners2[keys[0]] ?? {};
    const executionInfo = get((...args2) => func.call(context, ...args2), args, infoTemplate.infoToOutput);
    iterateSymbols(listeners2, (_, o) => {
      const path = getPath("output", o);
      runCallback(o.callback, path, executionInfo.value, executionInfo.output);
    });
    return executionInfo;
  };
  function functions2(info2, collection, lookups) {
    handler(info2, collection, (_, parent) => {
      if (!parent[isProxy]) {
        parent[info2.last] = function(...args) {
          const listeners2 = collection[getPath("absolute", info2)];
          const got = functionExecution(this, listeners2, info2.original, args);
          return got;
        };
      }
    }, lookups);
  }

  // ../../libraries/common/drill.js
  var drillSimple = (obj, callback, options) => {
    let accumulator = options.accumulator;
    if (!accumulator)
      accumulator = options.accumulator = {};
    const ignore = options.ignore || [];
    const path = options.path || [];
    const condition = options.condition || true;
    const seen = [];
    const fromSeen = [];
    let drill = (obj2, acc = {}, globalInfo) => {
      for (let key in obj2) {
        if (ignore.includes(key))
          continue;
        const val = obj2[key];
        const newPath = [...globalInfo.path, key];
        const info2 = {
          typeof: typeof val,
          name: val?.constructor?.name,
          simple: true,
          object: val && typeof val === "object",
          path: newPath
        };
        if (info2.object) {
          const name2 = info2.name;
          const isESM = esm(val);
          if (isESM || name2 === "Object" || name2 === "Array") {
            info2.simple = true;
            const idx = seen.indexOf(val);
            if (idx !== -1)
              acc[key] = fromSeen[idx];
            else {
              seen.push(val);
              const pass = condition instanceof Function ? condition(key, val, info2) : condition;
              info2.pass = pass;
              acc[key] = callback(key, val, info2);
              if (pass) {
                fromSeen.push(acc[key]);
                acc[key] = drill(val, acc[key], { ...globalInfo, path: newPath });
              }
            }
          } else {
            info2.simple = false;
            acc[key] = callback(key, val, info2);
          }
        } else
          acc[key] = callback(key, val, info2);
      }
      return acc;
    };
    return drill(obj, accumulator, { path });
  };

  // ../../libraries/esmonitor/src/Monitor.ts
  var createLookup = () => {
    return { symbol: {}, name: {} };
  };
  var Monitor = class {
    constructor(opts = {}) {
      this.poller = new Poller();
      this.options = {
        pathFormat: "relative",
        keySeparator
      };
      this.listeners = {
        polling: this.poller.listeners,
        functions: {},
        setters: {},
        lookup: createLookup()
      };
      this.references = {};
      this.get = (path, output, reference = this.references) => {
        return getFromPath(reference, path, {
          keySeparator: this.options.keySeparator,
          fallbacks: this.options.fallbacks,
          output
        });
      };
      this.set = (path, value2, opts = {}) => {
        const optsCopy = { ...opts };
        if (!optsCopy.reference)
          optsCopy.reference = this.references;
        if (!optsCopy.listeners)
          optsCopy.listeners = this.listeners;
        return setFromOptions(path, value2, this.options, optsCopy);
      };
      this.on = (absPath, callback) => {
        const info2 = getPathInfo(absPath, this.options);
        return this.listen(info2.id, callback, info2.path);
      };
      this.getInfo = (label, callback, path, original) => {
        const info2 = info(label, callback, path, original, this.references, this.listeners, this.options);
        const id = Math.random();
        const lookups = this.listeners.lookup;
        const name2 = getPath("absolute", info2);
        lookups.symbol[info2.sub] = {
          name: name2,
          id
        };
        if (!lookups.name[name2])
          lookups.name[name2] = {};
        lookups.name[name2][id] = info2.sub;
        return info2;
      };
      this.listen = (id, callback, path = [], __internal = {}) => {
        if (typeof path === "string")
          path = path.split(this.options.keySeparator);
        else if (typeof path === "symbol")
          path = [path];
        const arrayPath = path;
        let baseRef = this.references[id];
        if (!baseRef) {
          console.error(`Reference does not exist.`, id);
          return;
        }
        if (!__internal.poll)
          __internal.poll = esm(baseRef);
        if (!__internal.seen)
          __internal.seen = [];
        const __internalComplete = __internal;
        if (!this.references[id])
          this.references[id] = baseRef;
        const ref = this.get([id, ...arrayPath]);
        const toMonitorInternally = (val, allowArrays = false) => {
          const first = val && typeof val === "object";
          if (!first)
            return false;
          const isEl = val instanceof Element;
          if (isEl)
            return false;
          if (allowArrays)
            return true;
          else
            return !Array.isArray(val);
        };
        let subs = {};
        if (toMonitorInternally(ref, true)) {
          if (ref.__esInspectable)
            ref.__esInspectable.options.globalCallback = callback;
          drillSimple(ref, (_, __, drillInfo) => {
            if (drillInfo.pass)
              return;
            else {
              const fullPath = [...arrayPath, ...drillInfo.path];
              const internalSubs = this.listen(id, callback, fullPath, __internalComplete);
              Object.assign(subs, internalSubs);
            }
          }, {
            condition: (_, val) => toMonitorInternally(val)
          });
        }
        let info2;
        try {
          info2 = this.getInfo(id, callback, arrayPath, ref);
          if (__internalComplete.poll) {
            this.poller.add(info2);
          } else {
            let type = "setters";
            if (typeof ref === "function")
              type = "functions";
            this.add(type, info2);
          }
        } catch (e) {
          console.error("Fallback to polling:", path, e);
          this.poller.add(info2);
        }
        subs[getPath("absolute", info2)] = info2.sub;
        if (this.options.onInit instanceof Function) {
          const executionInfo = {};
          for (let key in info2.infoToOutput)
            executionInfo[key] = void 0;
          this.options.onInit(getPath("output", info2), executionInfo);
        }
        return subs;
      };
      this.add = (type, info2) => {
        if (listeners_exports[type])
          listeners_exports[type](info2, this.listeners[type], this.listeners.lookup);
        else
          this.listeners[type][getPath("absolute", info2)][info2.sub] = info2;
      };
      this.remove = (subs) => {
        if (!subs) {
          subs = {
            ...this.listeners.functions,
            ...this.listeners.setters,
            ...this.listeners.polling
          };
        }
        if (typeof subs !== "object")
          subs = { sub: subs };
        for (let key in subs) {
          let innerSub = subs[key];
          const handleUnsubscribe = (sub) => {
            const res = this.unsubscribe(sub);
            if (res === false)
              console.warn(`Subscription for ${key} does not exist.`, sub);
          };
          if (typeof innerSub !== "symbol")
            iterateSymbols(innerSub, handleUnsubscribe);
          else
            handleUnsubscribe(innerSub);
        }
        return true;
      };
      this.unsubscribe = (sub) => {
        const info2 = this.listeners.lookup.symbol[sub];
        const absPath = info2.name;
        const polling = this.poller.get(sub);
        const funcs = this.listeners.functions[absPath];
        const func = funcs?.[sub];
        const setters2 = this.listeners.setters[absPath];
        const setter = setters2?.[sub];
        if (polling)
          this.poller.remove(sub);
        else if (func) {
          delete funcs[sub];
          if (!Object.getOwnPropertySymbols(funcs).length) {
            func.current = func.original;
            delete this.listeners.functions[absPath];
          }
        } else if (setter) {
          delete setters2[sub];
          if (!Object.getOwnPropertySymbols(setters2).length) {
            const parent = setter.parent;
            const last = setter.last;
            const value2 = parent[last];
            Object.defineProperty(parent, last, { value: value2, writable: true });
            delete this.listeners.setters[absPath];
          }
        } else
          return false;
        delete this.listeners.lookup.symbol[sub];
        const nameLookup = this.listeners.lookup.name[info2.name];
        delete nameLookup[info2.id];
        if (!Object.getOwnPropertyNames(nameLookup).length)
          delete this.listeners.lookup.name[info2.name];
      };
      Object.defineProperty(this.listeners, "lookup", {
        value: createLookup(),
        enumerable: false,
        configurable: false
      });
      Object.assign(this.options, opts);
      this.poller.setOptions(opts.polling);
    }
  };

  // ../../libraries/esmonitor/src/index.ts
  var src_default = Monitor;

  // ../../libraries/common/clone.js
  var deep = (obj, opts = {}) => {
    if (typeof obj === "object") {
      if (Array.isArray(obj)) {
        obj = [...obj];
        opts.accumulator = [];
      } else {
        obj = { ...obj };
        opts.accumulator = {};
      }
    } else
      return obj;
    drillSimple(obj, (key, val, info2) => {
      if (info2.simple && info2.object)
        return Array.isArray(val) ? [] : {};
      else
        return val;
    }, opts);
    return opts.accumulator;
  };

  // ../../libraries/escompose/src/utils.ts
  var isPromise = (o) => typeof o === "object" && typeof o.then === "function";
  var resolve = (object, callback) => {
    if (typeof object === "object" && Array.isArray(object) && object.find((v) => isPromise(v)))
      object = Promise.all(object);
    if (isPromise(object)) {
      return new Promise((resolvePromise) => {
        object.then(async (res) => {
          const output = callback ? callback(res) : res;
          resolvePromise(output);
        });
      });
    } else {
      return callback ? callback(object) : object;
    }
  };
  var merge = (main, override, path = []) => {
    const copy = Object.assign({}, main);
    if (override) {
      const keys = Object.keys(copy);
      const newKeys = new Set(Object.keys(override));
      keys.forEach((k) => {
        newKeys.delete(k);
        const thisPath = [...path, k];
        if (typeof override[k] === "object" && !Array.isArray(override[k])) {
          if (typeof copy[k] === "object")
            copy[k] = merge(copy[k], override[k], thisPath);
          else
            copy[k] = override[k];
        } else if (typeof override[k] === "function") {
          const original = copy[k];
          const isFunc = typeof original === "function";
          if (isFunc && !original.functionList)
            original.functionList = [original];
          const newFunc = override[k];
          if (!isFunc)
            copy[k] = newFunc;
          else if (!original.functionList.includes(newFunc)) {
            const func = copy[k] = function(...args) {
              original.call(this, ...args);
              return newFunc.call(this, ...args);
            };
            if (!func.functionList)
              func.functionList = [original];
            func.functionList.push(override);
          } else
            console.warn(`This function was already merged into ${thisPath.join(".")}. Ignoring duplicate.`);
        } else if (k in override)
          copy[k] = override[k];
      });
      newKeys.forEach((k) => copy[k] = override[k]);
    }
    return copy;
  };

  // ../../libraries/drafts/edgelord/index.ts
  var listenerObject = Symbol("listenerObject");
  var toSet = Symbol("toSet");
  var isConfigObject = (o) => specialKeys.listeners.format in o || specialKeys.listeners.branch in o || specialKeys.listeners.trigger in o || specialKeys.listeners.bind in o;
  var initializedStatus = "INITIALIZED";
  var registeredStatus = "REGISTERED";
  var globalFrom = {};
  var globalTo = {};
  var globalActive = {};
  var subscriptionKey = Symbol("subscriptionKey");
  var configKey = Symbol("configKey");
  var toResolveWithKey = Symbol("toResolveWithKey");
  var Edgelord = class {
    constructor(listeners2 = {}, root, context) {
      this.original = {};
      this.active = {};
      this.globals = {};
      this.context = {};
      this.rootPath = "";
      this.status = "";
      this.#triggers = [];
      this.#queue = [];
      this.getManager = (mode = "from") => {
        let target = mode === "to" ? this.globals.to : this.globals.from;
        this.rootPath.split(this.context.options.keySeparator).forEach((key) => {
          if (!target[key])
            target[key] = {};
          target = target[key];
        });
        return target[toResolveWithKey] ?? this;
      };
      this.onStart = (f) => {
        const res = this.#toResolveWith;
        const isSame2 = res === this;
        if (isSame2) {
          if (this.status === initializedStatus)
            f();
          else
            this.#queue.push(f);
        } else
          res.onStart(f);
      };
      this.runEachListener = (listeners2, callback) => {
        if (!callback)
          return;
        for (let toPath in listeners2) {
          const from2 = listeners2[toPath];
          if (!from2) {
            console.warn("Skipping empty listener:", toPath);
            continue;
          }
          if (from2 && typeof from2 === "object") {
            for (let fromPath in from2)
              callback(fromPath, toPath, from2[fromPath]);
          } else {
            if (typeof toPath === "string")
              callback(from2, toPath, toPath);
            else
              console.error("Improperly Formatted Listener", toPath);
          }
        }
      };
      this.register = (listeners2 = this.original) => {
        this.runEachListener(listeners2, this.add);
        this.status = registeredStatus;
      };
      this.#initialize = (o) => {
        const res = this.context.monitor.get(o.path, "info");
        if (typeof res.value === "function") {
          const args = Array.isArray(o.args) ? o.args : [o.args];
          res.value(...args);
        } else
          console.error("Cannot yet trigger values...", o);
      };
      this.initialize = (o) => {
        if (!this.status)
          this.#triggers.push(o);
        else if (this.status === registeredStatus) {
          this.status = initializedStatus;
          this.#triggers.forEach(this.#initialize);
          this.#queue.forEach((f) => f());
          this.#queue = [];
          this.#triggers = [];
        } else
          this.#initialize(o);
      };
      this.start = () => {
        this.register();
        this.initialize();
      };
      this.#getAbsolutePath = (name2) => {
        const sep = this.context.monitor.options.keySeparator;
        return !name2 || !this.rootPath || this.rootPath === name2.slice(0, this.rootPath.length) && name2[this.rootPath.length] === sep ? name2 : [this.rootPath, name2].join(sep);
      };
      this.#getPathInfo = (path) => {
        const output = {
          absolute: {},
          relative: {}
        };
        path = this.#getAbsolutePath(path);
        let rel = this.rootPath ? path.replace(`${this.rootPath}.`, "") : path;
        const baseArr = path.split(this.context.options.keySeparator);
        output.absolute.array = [this.context.id, ...baseArr];
        output.relative.array = rel.split(this.context.options.keySeparator);
        const obj = this.context.monitor.get(output.relative.array, void 0, this.context.instance);
        const isComponent = obj?.hasOwnProperty(specialKeys.path);
        if (isComponent) {
          output.absolute.array.push(defaultPath);
          output.relative.array.push(defaultPath);
        }
        output.absolute.value = output.absolute.array.slice(1).join(this.context.options.keySeparator);
        output.relative.value = output.relative.array.join(this.context.options.keySeparator);
        return output;
      };
      this.add = (from2, to2, value2 = true, subscription) => {
        if (!value2)
          return;
        const fromInfo = this.#getPathInfo(from2);
        const toInfo = this.#getPathInfo(to2);
        const absPath = fromInfo.absolute.value;
        if (!subscription)
          subscription = this.globals.active[absPath]?.[subscriptionKey];
        if (!subscription) {
          subscription = this.context.monitor.on(fromInfo.absolute.array, (path, _, update) => this.activate(path, update), {
            ref: this.context.instance,
            path: fromInfo.relative.array
          });
        }
        const info2 = {
          value: value2,
          [listenerObject]: true
        };
        const refs = [this.active, this.globals.active];
        refs.forEach((ref) => {
          if (!ref[absPath])
            ref[absPath] = {};
          const base = ref[absPath];
          if (!base[subscriptionKey]) {
            Object.defineProperty(base, subscriptionKey, {
              value: subscription,
              configurable: true
            });
          }
          base[toInfo.absolute.value] = info2;
        });
        const args = value2[specialKeys.listeners.trigger];
        if (args)
          this.#toResolveWith.initialize({
            path: fromInfo.absolute.array,
            args
          });
        this.addToGlobalLog(absPath);
        return info2;
      };
      this.addToGlobalLog = (path, mode = "from") => {
        const absolutePath = this.#getAbsolutePath(path);
        let target = mode === "to" ? this.globals.to : this.globals.from;
        const globalPath = absolutePath.split(this.context.options.keySeparator);
        globalPath.forEach((key) => {
          if (!target[key])
            target[key] = {};
          target = target[key];
          if (!target[toResolveWithKey])
            target[toResolveWithKey] = this;
        });
      };
      this.remove = (from2, to2) => {
        const fromInfo = this.#getPathInfo(from2);
        const toInfo = this.#getPathInfo(to2);
        const path = [fromInfo.absolute.value, toInfo.absolute.value];
        const toRemove = [
          { ref: this.active, path },
          { ref: this.globals.active, path, unlisten: true }
        ];
        toRemove.forEach((o) => {
          const { ref, path: path2, unlisten } = o;
          let base = ref[path2[0]];
          if (typeof base === "object") {
            delete base[path2[1]];
            if (Object.keys(base).length === 0) {
              delete ref[path2[0]];
              const sub = base[subscriptionKey];
              if (unlisten && sub) {
                this.context.monitor.remove(sub);
              }
              delete base[subscriptionKey];
            }
          } else
            delete ref[path2[0]];
        });
      };
      this.clear = (name2) => {
        const value2 = this.#getAbsolutePath(name2);
        Object.keys(this.active).forEach((from2) => {
          Object.keys(this.active[from2]).forEach((to2) => {
            if (!value2 || from2.slice(0, value2.length) === value2 || to2.slice(0, value2.length) === value2)
              this.remove(from2, to2);
          });
        });
      };
      this.has = (from2, ref = this.active) => !!ref[from2];
      this.get = (from2, ref = this.active) => ref[from2];
      this.activate = (from2, update) => {
        const listenerGroups = [{
          info: this.get(from2, this.globals.active),
          name
        }];
        listenerGroups.forEach((group) => {
          const info2 = group.info;
          if (info2) {
            if (info2[listenerObject]) {
              this.pass(from2, {
                value: info2.value,
                parent: this.active,
                key: group.name,
                subscription: info2.subscription,
                __value: true
              }, update);
            } else if (typeof info2 === "object") {
              for (let key in info2) {
                this.pass(from2, {
                  parent: info2,
                  key,
                  subscription: info2[key].subscription,
                  value: info2[key].value
                }, update);
              }
            } else
              console.error("Improperly Formatted Listener", info2);
          }
        });
      };
      this.pass = (from2, target, update) => {
        const id = this.context.id;
        const isValue = target?.__value;
        let parent = target.parent;
        let to2 = target.key;
        const info2 = target.parent[to2];
        target = info2.value;
        let config = info2?.[configKey];
        let ogValue = target;
        const type = typeof target;
        const checkIfSetter = (path, willSet) => {
          const info3 = this.context.monitor.get(path, "info");
          if (info3.exists) {
            const val = info3.value;
            const noDefault = typeof val !== "function" && !val?.default;
            const value2 = noDefault ? toSet : val;
            const res = { value: value2 };
            if (willSet) {
              target = res.value;
              parent[to2] = res;
            }
            return res;
          } else
            return { value: void 0 };
        };
        const transform = (willSet) => {
          const fullPath = [id];
          fullPath.push(...to2.split(this.context.options.keySeparator));
          return checkIfSetter(fullPath, willSet);
        };
        const getPathArray = (latest) => {
          const path = [id];
          const topPath = [];
          if (this.rootPath)
            topPath.push(...this.rootPath.split(this.context.options.keySeparator));
          topPath.push(...latest.split(this.context.options.keySeparator));
          path.push(...topPath);
          return path;
        };
        if (typeof target === "boolean") {
          if (!isValue)
            transform(true);
          else
            console.error(`Cannot use a boolean for ${specialKeys.listeners.value}...`);
        } else if (type === "string") {
          const path = getPathArray(ogValue);
          checkIfSetter(path, true);
          if (isValue) {
            parent[to2] = { [ogValue]: parent[to2] };
            to2 = ogValue;
          }
        } else if (target && type === "object") {
          const isConfig = isConfigObject(ogValue);
          if (isConfig) {
            if ("value" in ogValue) {
              if (isValue) {
                target = parent[to2] = ogValue.value;
              } else {
                target = parent[to2].value = ogValue.value;
              }
            } else
              transform(true);
            if (ogValue) {
              if (ogValue)
                config = ogValue;
            }
            Object.defineProperty(parent[to2], configKey, { value: config });
          }
        }
        let isValidInput = true;
        if (config) {
          const bindKey = specialKeys.listeners.value;
          if (bindKey in config) {
            const path = getPathArray(config[bindKey].original ?? config[bindKey]);
            if (typeof config[bindKey] === "string") {
              const res = this.context.monitor.get(path);
              if (!res)
                target = `because ${path.slice(1).join(this.context.options.keySeparator)} does not point correctly to an existing component.`;
              else {
                config[bindKey] = {
                  value: res,
                  original: config[bindKey]
                };
              }
            } else if (!config[bindKey].value.__parent) {
              target = `because ${config[bindKey].original ?? id.toString()} has become unparented.`;
            }
          } else {
            const branchKey = specialKeys.listeners.branch;
            const formatKey = specialKeys.listeners.format;
            if (branchKey in config) {
              const isValid = config[branchKey].find((o) => {
                let localValid = [];
                if ("if" in o)
                  localValid.push(o.if(update));
                if ("is" in o)
                  localValid.push(o.is === update);
                const isValidLocal = localValid.length > 0 && localValid.reduce((a, b) => a && b, true);
                if (isValidLocal) {
                  if ("value" in o)
                    update = o.value;
                }
                return isValidLocal;
              });
              if (!isValid)
                isValidInput = false;
            }
            if (formatKey in config) {
              try {
                update = config[formatKey](update);
                if (update === void 0)
                  isValidInput = false;
              } catch (e) {
                console.error("Failed to format arguments", e);
              }
            }
          }
        }
        if (isValidInput && update !== void 0) {
          const arrayUpdate = Array.isArray(update) ? update : [update];
          if (target === toSet) {
            const parentPath = [id];
            parentPath.push(...to2.split(this.context.options.keySeparator));
            const idx = parentPath.pop();
            const info3 = this.context.monitor.get(parentPath, "info");
            info3.value[idx] = update;
          } else if (target?.default)
            target.default.call(target, ...arrayUpdate);
          else if (typeof target === "function") {
            const noContext = parent[to2][listenerObject];
            if (noContext)
              target.call(config?.[specialKeys.listeners.bind]?.value ?? this.context.instance, ...arrayUpdate);
            else
              target(...arrayUpdate);
          } else {
            let baseMessage = to2 ? `listener: ${from2} \u2014> ${to2}` : `listener from ${from2}`;
            if (parent) {
              console.warn(`Deleting ${baseMessage}`, target);
              delete parent[to2];
            } else
              console.error(`Failed to add ${baseMessage}`, target);
          }
        }
      };
      this.context = context;
      this.rootPath = root;
      this.original = listeners2;
      const globals = [{ name: "active", ref: globalActive }, { name: "from", ref: globalFrom }, { name: "to", ref: globalTo }];
      globals.forEach((o) => {
        if (!o.ref[this.context.id])
          o.ref[this.context.id] = {};
        this.globals[o.name] = o.ref[this.context.id];
      });
      this.#toResolveWith = this.getManager();
      this.runEachListener(listeners2, this.addToGlobalLog);
    }
    #triggers;
    #queue;
    #toResolveWith;
    #initialize;
    #getAbsolutePath;
    #getPathInfo;
  };
  var edgelord_default = Edgelord;

  // ../../libraries/escompose/src/create/helpers/compile.ts
  var catchError = (o, e) => {
    if (o[specialKeys.reference]) {
      console.warn("[escompose]: Falling back to ES Component reference...", e);
      return o[specialKeys.reference];
    } else
      return createErrorComponent(e.message);
  };
  var genericErrorMessage = `Cannot transform ${specialKeys.compose} string without a compose utility function`;
  function compile(o, opts) {
    let uri = typeof o === "string" ? o : o[specialKeys.uri];
    if (uri && opts.utilities) {
      const bundleOpts = opts.utilities.bundle;
      const gotBundleOpts = bundleOpts && typeof bundleOpts.function === "function";
      const compileOpts = opts.utilities.compile;
      const gotCompileOpts = compileOpts && typeof compileOpts.function === "function";
      if (!gotBundleOpts && !gotCompileOpts)
        o = catchError(o, new Error(genericErrorMessage));
      else {
        return new Promise(async (resolve3) => {
          try {
            if (gotBundleOpts) {
              const options = bundleOpts.options ?? {};
              if (!options.bundler)
                options.bundler = "datauri";
              if (!options.bundle)
                options.collection = "global";
              const bundle = bundleOpts.function(uri, options);
              await bundle.compile();
              o = Object.assign({}, bundle.result);
            } else if (gotCompileOpts) {
              const resolved = await compileOpts.function(o, compileOpts.options);
              o = resolved;
            } else {
              throw new Error(genericErrorMessage);
            }
          } catch (e) {
            o = catchError(o, e);
          }
          resolve3(deep(o));
        });
      }
    }
    return deep(o);
  }
  function createErrorComponent(message) {
    return {
      [specialKeys.element]: "p",
      [specialKeys.hierarchy]: {
        b: {
          [specialKeys.element]: "b",
          [specialKeys.attributes]: {
            innerText: "Error: "
          }
        },
        span: {
          [specialKeys.element]: "span",
          [specialKeys.attributes]: {
            innerText: message
          }
        }
      }
    };
  }

  // ../../libraries/escompose/src/create/helpers/merge.ts
  function merge2(base, __compose = {}, path = [], opts = {}) {
    if (!Array.isArray(__compose))
      __compose = [__compose];
    let promise = resolve(__compose.map((o) => {
      const compiled = compile(o, opts);
      const checkAndPushTo = (target, acc = [], forcePush = true) => {
        if (Array.isArray(target))
          target.forEach((o2) => checkAndPushTo(o2, acc), true);
        else if (target[specialKeys.compose]) {
          acc.push(target);
          const val = target[specialKeys.compose];
          delete target[specialKeys.compose];
          const newTarget = resolve(compile(val, opts));
          checkAndPushTo(newTarget, acc);
        } else if (forcePush)
          acc.push(target);
        return acc;
      };
      return resolve(compiled, (compiled2) => checkAndPushTo(compiled2));
    }));
    return resolve(promise, (clonedEsCompose) => {
      const flat = clonedEsCompose.flat();
      let merged = Object.assign({}, base);
      flat.forEach((toCompose) => {
        merged = merge(toCompose, merged, path);
      });
      return merged;
    });
  }

  // ../../libraries/escompose/src/create/element.ts
  var boundEditorKey = `__bound${specialKeys.editor}s`;
  function checkESCompose(__compose) {
    if (!__compose)
      return false;
    const isArr = Array.isArray(__compose);
    return isArr ? !__compose.reduce((a, b) => a * (checkForInternalElements(b) ? 0 : 1), true) : checkForInternalElements(__compose);
  }
  function checkForInternalElements(node) {
    if (node.__element || checkESCompose(node.__compose))
      return true;
    else if (node.__children)
      return check(node.__children);
  }
  function check(target) {
    for (let key in target) {
      const node = target[key];
      let res = checkForInternalElements(node);
      if (res)
        return true;
    }
  }
  function create(id, esm2, parent, states, utilities = {}) {
    let element = esm2[specialKeys.element];
    const attributes = esm2[specialKeys.attributes];
    let info2;
    if (!(element instanceof Element)) {
      const mustShow = attributes && Object.keys(attributes).length || checkForInternalElements(esm2);
      const defaultTagName = mustShow ? "div" : "link";
      if (element === void 0)
        element = defaultTagName;
      else if (Array.isArray(element))
        element = document.createElement(...element);
      else if (typeof element === "object") {
        info2 = element;
        if (info2.selectors)
          element = document.querySelector(info2.selectors);
        else if (info2.id)
          element = document.getElementById(info2.id);
        else
          element = defaultTagName;
      }
      if (typeof element === "string")
        element = document.createElement(element);
      const noInput = Symbol("no input to the default function");
      if (!esm2.hasOwnProperty("default")) {
        esm2.default = function(input = noInput) {
          if (input !== noInput)
            this[specialKeys.element].innerText = input;
          return this[specialKeys.element];
        };
      }
    }
    if (!(element instanceof Element))
      console.warn("Element not found for", id);
    let intermediateStates = states || {};
    intermediateStates.element = element, intermediateStates.attributes = attributes, intermediateStates.parentNode = esm2[specialKeys.parent] ?? (parent?.[specialKeys.element] instanceof Element ? parent[specialKeys.element] : void 0), intermediateStates.onresize = esm2[specialKeys.resize], intermediateStates.onresizeEventCallback = void 0;
    const finalStates = intermediateStates;
    if (element instanceof Element) {
      if (typeof id !== "string")
        id = `${element.tagName ?? "element"}${Math.floor(Math.random() * 1e15)}`;
      if (!element.id)
        element.id = id;
    }
    let isReady;
    Object.defineProperty(esm2, `${specialKeys.connected}`, {
      value: new Promise((resolve3) => isReady = async () => {
        resolve3(true);
      }),
      writable: false,
      enumerable: false
    });
    Object.defineProperty(esm2, `__${specialKeys.connected}`, { value: isReady, writable: false, enumerable: false });
    const isEventListener = (key, value2) => key.slice(0, 2) === "on" && typeof value2 === "function";
    const handleAttribute = (key, value2, context) => {
      if (!isEventListener(key, value2) && typeof value2 === "function")
        return value2.call(context);
      else
        return value2;
    };
    const setAttributes = (attributes2) => {
      if (esm2[specialKeys.element] instanceof Element) {
        for (let key in attributes2) {
          if (key === "style") {
            for (let styleKey in attributes2.style)
              esm2[specialKeys.element].style[styleKey] = handleAttribute(key, attributes2.style[styleKey], esm2);
          } else {
            const value2 = attributes2[key];
            if (isEventListener(key, value2)) {
              const func = value2;
              esm2[specialKeys.element][key] = (...args) => {
                const context = esm2[specialKeys.proxy] ?? esm2;
                return func.call(context ?? esm2, ...args);
              };
            } else
              esm2[specialKeys.element][key] = handleAttribute(key, value2, esm2);
          }
        }
      }
    };
    Object.defineProperty(esm2, specialKeys.attributes, {
      get: () => states.attributes,
      set: (value2) => {
        states.attributes = value2;
        if (states.attributes)
          setAttributes(states.attributes);
      }
    });
    Object.defineProperty(esm2, specialKeys.element, {
      get: function() {
        if (states.element instanceof Element)
          return states.element;
      },
      set: function(v) {
        if (v instanceof Element) {
          if (states.element !== v) {
            states.element.insertAdjacentElement("afterend", v);
            states.element.remove();
          }
          states.element = v;
          if (esm2[specialKeys.path] !== void 0) {
            for (let name2 in esm2[specialKeys.hierarchy]) {
              const component = esm2[specialKeys.hierarchy][name2];
              resolve(component, (res) => {
                res[specialKeys.parent] = v;
              });
            }
          }
          setAttributes(states.attributes);
        }
      },
      enumerable: true,
      configurable: false
    });
    Object.defineProperty(esm2, specialKeys.parent, {
      get: function() {
        if (esm2[specialKeys.element] instanceof Element)
          return esm2[specialKeys.element].parentNode;
      },
      set: (v) => {
        if (typeof v === "string") {
          const newValue = document.querySelector(v);
          if (newValue)
            v = newValue;
          else
            v = document.getElementById(v);
        }
        if (v?.[specialKeys.element] instanceof Element)
          v = v[specialKeys.element];
        if (esm2[specialKeys.element] instanceof Element) {
          if (esm2[specialKeys.element].parentNode)
            esm2[specialKeys.element].remove();
          if (v instanceof Element) {
            const desiredPosition = esm2[specialKeys.childPosition];
            const nextPosition = v.children.length;
            let ref = esm2[specialKeys.element];
            const __editor = esm2[`__${specialKeys.editor}`];
            if (__editor)
              ref = __editor;
            if (desiredPosition !== void 0 && desiredPosition < nextPosition)
              v.children[desiredPosition].insertAdjacentElement("beforebegin", ref);
            else
              v.appendChild(ref);
            if (__editor)
              __editor.setComponent(esm2);
          }
        } else {
          console.error("No element was created for this Component...", esm2);
        }
        if (v instanceof HTMLElement) {
          esm2[`__${specialKeys.connected}`]();
        }
      },
      enumerable: true
    });
    let onresize = esm2[specialKeys.resize];
    Object.defineProperty(esm2, specialKeys.resize, {
      get: function() {
        return onresize;
      },
      set: function(foo) {
        states.onresize = foo;
        if (states.onresizeEventCallback)
          window.removeEventListener("resize", states.onresizeEventCallback);
        if (states.onresize) {
          states.onresizeEventCallback = (ev) => {
            if (states.onresize && esm2[specialKeys.element] instanceof Element) {
              const context = esm2[specialKeys.proxy] ?? esm2;
              return foo.call(context, ev);
            }
          };
          window.addEventListener("resize", states.onresizeEventCallback);
        }
      },
      enumerable: true
    });
    if (esm2[specialKeys.editor]) {
      let config = esm2[specialKeys.editor];
      let cls = utilities.code?.class;
      if (!cls) {
        if (typeof config === "function")
          cls = config;
        else
          console.error("Editor class not provided in options.utilities.code");
      }
      if (cls) {
        let options = utilities.code?.options ?? {};
        options = typeof config === "boolean" ? options : { ...options, ...config };
        const bound = options.bind;
        const __editor = new cls(options);
        __editor.start();
        Object.defineProperty(esm2, `__${specialKeys.editor}`, { value: __editor });
        if (bound !== void 0) {
          let boundESM = esm2;
          bound.split("/").forEach((str) => {
            if (str === "..")
              boundESM = boundESM[specialKeys.states].parentNode[specialKeys.component];
            else if (str === ".")
              return;
            else
              boundESM = boundESM[specialKeys.hierarchy][str];
          });
          const key = boundEditorKey;
          if (!boundESM[key])
            Object.defineProperty(boundESM, key, { value: [__editor] });
          else
            boundESM[key].push(__editor);
        }
      }
    }
    if (esm2.__element instanceof Element) {
      esm2[specialKeys.element][specialKeys.component] = esm2;
      esm2[specialKeys.element].setAttribute(specialKeys.attribute, "");
    }
    if (!states) {
      esm2[specialKeys.resize] = finalStates.onresize;
      if (finalStates.parentNode)
        esm2.__parent = finalStates.parentNode;
    }
    return element;
  }

  // ../../libraries/escompose/src/create/component.ts
  var registry = {};
  var ogCreateElement = document.createElement;
  document.createElement = function(name2, options) {
    const info2 = registry[name2];
    const created = info2 && !info2.autonomous ? ogCreateElement.call(this, info2.tag, { is: name2 }) : ogCreateElement.call(this, name2, options);
    return created;
  };
  var tagToClassMap = {
    li: "LI"
  };
  var isAutonomous = false;
  var define = (config, esm2) => {
    esm2 = Object.assign({}, esm2);
    if (!registry[config.name]) {
      const clsName = isAutonomous ? "" : tagToClassMap[config.extends] ?? config.extends[0].toUpperCase() + config.extends.slice(1);
      const BaseClass = new Function(`

        class ESComponentBase extends HTML${clsName}Element { 
            #properties;
            constructor(properties={}){
                super()
               this.#properties = properties
            }
        }
        return ESComponentBase;

        `)();
      class ESComponent extends BaseClass {
        constructor(properties) {
          super(properties);
          resolve(src_default2(esm2), (res) => {
            res.__element = this;
            this.__component = res;
          });
        }
        connectedCallback() {
          console.log("Custom element added to page.");
          this.__component.____ready();
        }
        disconnectedCallback() {
          console.log("Custom element removed from page.");
        }
        adoptedCallback() {
          console.log("Custom element moved to new page.");
        }
        attributeChangedCallback(name2, oldValue, newValue) {
          console.log("Custom element attributes changed.", name2, oldValue, newValue);
        }
      }
      registry[config.name] = {
        class: ESComponent,
        autonomous: isAutonomous,
        tag: config.extends
      };
      const cls = registry[config.name].class;
      if (isAutonomous)
        customElements.define(config.name, cls);
      else
        customElements.define(config.name, cls, { extends: config.extends });
    } else {
      console.log("Already created component...");
    }
  };

  // ../../libraries/escompose/src/create/define.ts
  var value = (name2, value2, object) => {
    Object.defineProperty(object, name2, {
      value: value2,
      writable: false,
      configurable: false,
      enumerable: false
    });
  };

  // ../../libraries/escompose/src/create/helpers/start.ts
  function start_default(keys, callbacks, asyncCallback) {
    if (this[keys.options].await) {
      return asyncConnect.call(this, keys, async () => {
        if (asyncCallback)
          await asyncCallback();
        connect.call(this, keys, callbacks);
      });
    } else {
      asyncConnect.call(this, keys, asyncCallback);
      return connect.call(this, keys);
    }
  }
  async function asyncConnect(keys, onReadyCallback) {
    await this[keys.connected];
    this[keys.states].connected = true;
    const boundEditorsKey = `__bound${keys.editor}s`;
    const boundEditors = this[boundEditorsKey];
    if (boundEditors)
      boundEditors.forEach((editor) => editor.setComponent(this));
    for (let name2 in this[keys.hierarchy]) {
      let component = this[keys.hierarchy][name2];
      const promise = component[keys.promise];
      if (promise && typeof promise.then === "function")
        component = this[keys.hierarchy][name2] = await promise;
      const init = component[keys.start];
      if (typeof init === "function")
        await init();
      else
        console.error(`Could not start component ${name2} because it does not have a __connected function`);
    }
    if (onReadyCallback)
      await onReadyCallback();
    return this;
  }
  function connect(keys, callbacks = []) {
    const privateEditorKey = `__${keys.editor}`;
    const __editor = this[keys.parent]?.[keys.component]?.[privateEditorKey];
    if (__editor)
      value(privateEditorKey, __editor, this);
    let source = this[esSourceKey];
    if (source) {
      if (typeof source === "function")
        source = this[keys.source] = source();
      delete this[esSourceKey];
      const path = this[keys.path];
      if (this[privateEditorKey])
        this[privateEditorKey].addFile(path, source);
    }
    const context = this[keys.proxy] ?? this;
    if (this[keys.states].initial.start)
      this[keys.states].initial.start.call(context);
    callbacks.forEach((f) => f.call(this));
    return this;
  }

  // ../../libraries/escompose/src/create/helpers/stop.ts
  function stop_default(keys) {
    if (this[keys.animate] && typeof this[keys.animate].stop === "function")
      this[keys.animate].stop();
    this[keys.flow].clear();
    let target = this;
    while (target[keys.parent].hasAttribute(keys.attribute)) {
      const res = target[keys.element][keys.parent]?.[keys.component];
      if (res) {
        target = res;
        if (target && target[keys.flow])
          target[keys.flow].clear(this[keys.path]);
      } else
        break;
    }
    if (this[keys.hierarchy]) {
      for (let name2 in this[keys.hierarchy]) {
        const component = this[keys.hierarchy][name2];
        if (typeof component[keys.stop] === "function")
          component[keys.stop]();
        else
          console.warn("Could not disconnect component because it does not have an __disconnected function", name2, this.__children);
      }
    }
    if (this[keys.element] instanceof Element) {
      this[keys.element].remove();
      if (this[keys.remove]) {
        const context2 = this[keys.proxy] ?? this;
        this[keys.remove].call(context2);
      }
    }
    const privateEditorKey = `__${keys.editor}`;
    if (this[privateEditorKey])
      this[privateEditorKey].remove();
    const context = this[keys.proxy] ?? this;
    const ogStop = this[keys.states].initial.stop;
    if (ogStop)
      ogStop.call(context);
    this[keys.start] = this[keys.states].initial.start;
    this[keys.stop] = ogStop;
    return this;
  }

  // ../../libraries/escompose/src/create/helpers/animate.ts
  var animations = {};
  function animate(keys) {
    const key = keys.animate ?? "animate";
    if (this[key]) {
      let original = this[key];
      const id = Math.random();
      const interval = typeof original === "number" ? original : "global";
      if (!animations[interval]) {
        const info2 = animations[interval] = { objects: { [id]: this } };
        const objects2 = info2.objects;
        const runFuncs = () => {
          for (let key2 in objects2)
            objects2[key2].default();
        };
        if (interval === "global") {
          const callback = () => {
            runFuncs();
            info2.id = window.requestAnimationFrame(callback);
          };
          callback();
          animations[interval].stop = () => {
            window.cancelAnimationFrame(info2.id);
            info2.cancel = true;
          };
        } else {
          runFuncs();
          info2.id = setInterval(() => runFuncs(), 1e3 / interval);
          animations[interval].stop = () => clearInterval(info2.id);
        }
      } else {
        this.default();
        animations[interval].objects[id] = this;
      }
      this[key] = {
        id,
        original,
        stop: () => {
          delete animations[interval].objects[id];
          this[key] = original;
          if (Object.keys(animations[interval].objects).length === 0) {
            animations[interval].stop();
            delete animations[interval];
          }
        }
      };
    }
  }

  // ../../libraries/escompose/src/create/helpers/index.ts
  function start(keys) {
    return start_default.call(this, keys, [
      function() {
        animate.call(this, keys);
      }
    ]);
  }

  // ../../libraries/escompose/src/create/index.ts
  var create_default = (id, esm2, parent, opts = {}) => {
    const states = {
      connected: false,
      initial: {
        start: esm2[specialKeys.start],
        stop: esm2[specialKeys.stop]
      }
    };
    value(specialKeys.states, states, esm2);
    value(specialKeys.options, opts, esm2);
    const copy = deep(esm2);
    try {
      const hierarchyKey = specialKeys.hierarchy;
      for (let name2 in esm2[hierarchyKey]) {
        const value2 = esm2[hierarchyKey][name2];
        const isUndefined = value2 == void 0;
        const type = isUndefined ? JSON.stringify(value2) : typeof value2;
        if (type != "object") {
          console.error(`Removing ${name2} ${hierarchyKey} field that which is not an ES Component object. Got ${isUndefined ? type : `a ${type}`} instead.`);
          delete esm2[hierarchyKey][name2];
        }
      }
      let registry2 = esm2[specialKeys.webcomponents] ?? {};
      for (let key in registry2) {
        const esm3 = registry2[key];
        const info2 = esm3[specialKeys.element];
        if (info2.name && info2.extends)
          define(info2, esm3);
      }
      let el = create(id, esm2, parent, states, opts.utilities);
      const finalStates = states;
      esm2[specialKeys.element] = el;
      esm2[specialKeys.start] = () => start.call(esm2, specialKeys);
      esm2[specialKeys.stop] = () => stop_default.call(esm2, specialKeys);
      for (let key in esm2) {
        if (isPrivate(key))
          continue;
        if (typeof esm2[key] === "function") {
          const desc = Object.getOwnPropertyDescriptor(esm2, key);
          if (desc && desc.get && !desc.set)
            esm2 = Object.assign({}, esm2);
          const og = esm2[key];
          esm2[key] = (...args) => {
            const context = esm2[specialKeys.proxy] ?? esm2;
            return og.call(context, ...args);
          };
        }
      }
      const isESC = { value: "", enumerable: false };
      if (typeof id === "string") {
        const path = parent[specialKeys.path];
        if (path)
          isESC.value = [path, id];
        else
          isESC.value = [id];
        isESC.value = isESC.value.join(keySeparator);
      }
      Object.defineProperty(esm2, specialKeys.path, isESC);
      Object.defineProperty(esm2, specialKeys.original, { value: copy, enumerable: false });
      esm2[specialKeys.resize] = finalStates.onresize;
      esm2[specialKeys.parent] = finalStates.parentNode;
      return esm2;
    } catch (e) {
      console.error(`Failed to create an ES Component (${typeof id === "string" ? id : id.toString()}):`, e);
      return copy;
    }
  };

  // ../../libraries/escompose/src/create/helpers/hierarchy.ts
  function hierarchy(o, id, toMerge = {}, parent, directParent, opts = {}, callbacks = {}, waitForChildren = false) {
    const parentId = parent?.[specialKeys.path];
    const path = parentId ? [parentId, id] : typeof id === "string" ? [id] : [];
    const firstMerge = merge(toMerge, o, path);
    const merged = merge2(firstMerge, o[specialKeys.compose], path, opts);
    const res = resolve(merged, (merged2) => {
      const instance = create_default(id, merged2, parent, opts);
      const absolutePath = path.join(opts.keySeparator ?? keySeparator);
      if (directParent)
        directParent[id] = instance;
      if (callbacks[id])
        callbacks[id](instance);
      if (callbacks.onInstanceCreated)
        callbacks.onInstanceCreated(absolutePath, instance);
      const isReady = () => {
        if (callbacks.onInstanceReady)
          callbacks.onInstanceReady(absolutePath, instance);
      };
      if (instance[specialKeys.hierarchy]) {
        let positions = /* @__PURE__ */ new Set();
        let position = 0;
        const promises = Object.entries(instance[specialKeys.hierarchy]).map(async ([name2, base], i) => {
          base = Object.assign({}, base);
          const pos = base[specialKeys.childPosition];
          if (pos !== void 0) {
            if (positions.has(pos))
              console.warn(`[escompose]: Duplicate ${specialKeys.childPosition} value of ${pos} found in ${name2} of ${instance[specialKeys.path]}`);
            else
              positions.add(pos);
          } else {
            while (positions.has(position))
              position++;
            base[specialKeys.childPosition] = position;
            positions.add(position);
          }
          const promise = hierarchy(base, name2, void 0, instance, instance[specialKeys.hierarchy], opts, callbacks, true);
          Object.defineProperty(instance[specialKeys.hierarchy][name2], specialKeys.promise, {
            value: promise,
            writable: false
          });
          return resolve(promise);
        });
        const res2 = resolve(promises, (resolved) => {
          isReady();
          return resolved;
        });
        if (waitForChildren)
          return resolve(res2, () => instance);
      } else
        isReady();
      return instance;
    });
    return res;
  }

  // ../../libraries/escompose/src/index.ts
  var create2 = (config, toMerge = {}, options = {}) => {
    options = deep(options);
    let monitor;
    if (options.monitor instanceof src_default) {
      monitor = options.monitor;
      options.keySeparator = monitor.options.keySeparator;
    } else {
      if (!options.monitor)
        options.monitor = {};
      if (!options.monitor.keySeparator) {
        if (!options.keySeparator)
          options.keySeparator = keySeparator;
        options.monitor.keySeparator = options.keySeparator;
      }
      options.monitor = new src_default(options.monitor);
    }
    if (options.clone)
      config = deep(config);
    options.monitor.options.fallbacks = [specialKeys.hierarchy];
    const fullOptions = options;
    let instancePromiseOrObject;
    const onConnected = (instance) => {
      const noParent = !instance[specialKeys.parent];
      if (noParent)
        return instance;
      else
        return resolve(instance[specialKeys.start](), resolve2);
    };
    if (options.nested?.parent && options.nested?.name) {
      instancePromiseOrObject = hierarchy(config, options.nested.name, toMerge, options.nested.parent, void 0, fullOptions);
    } else {
      const id = Symbol("root");
      let listeners2 = {};
      instancePromiseOrObject = hierarchy(config, id, toMerge, void 0, void 0, fullOptions, {
        [id]: (instance) => {
          options.monitor.set(id, instance, fullOptions.listeners);
        },
        onInstanceCreated: (absolutePath, instance) => {
          if (fullOptions.listen !== false) {
            const to2 = instance[specialKeys.listeners.value] ?? {};
            const manager = listeners2[absolutePath] = new edgelord_default(to2, absolutePath, {
              id,
              instance,
              monitor: fullOptions.monitor,
              options: fullOptions
            });
            instance[specialKeys.listeners.value] = to2;
            Object.defineProperty(instance, specialKeys.flow, {
              value: manager,
              enumerable: false,
              writable: false
            });
            if (specialKeys.trigger in instance) {
              if (!Array.isArray(instance[specialKeys.trigger]))
                instance[specialKeys.trigger] = [];
              const args = instance[specialKeys.trigger];
              manager.onStart(() => instance.default(...args));
              delete instance[specialKeys.trigger];
            }
          }
        },
        onInstanceReady: (absolutePath) => {
          listeners2[absolutePath].start();
        }
      });
    }
    return resolve(instancePromiseOrObject, onConnected);
  };
  var src_default2 = create2;
  var resolve2 = resolve;

  // ../../libraries/escomposer/src/schema/graphscript.ts
  var from = (gs) => {
    let globalListeners = { [""]: {} };
    const drill = (target, acc = {}, path = []) => {
      const nodeInfo = target._node;
      delete target._node;
      acc = Object.assign(acc, target);
      if (typeof target === "function" && path.length) {
        acc.default = target;
      } else if (nodeInfo) {
        if (nodeInfo.children) {
          acc.__children = {};
          for (let key in nodeInfo.children) {
            const child = nodeInfo.children[key];
            acc.__children[key] = drill(child, {}, [...path, key]);
          }
        }
        if (nodeInfo.listeners) {
          for (let key in nodeInfo.listeners) {
            globalListeners[""][key] = {
              value: nodeInfo.listeners[key],
              __bind: path.join(".")
            };
          }
        }
        if (nodeInfo.operator && !acc.default)
          acc.default = nodeInfo.operator;
        if (nodeInfo.loop)
          acc.__animate = nodeInfo.loop / 1e3;
      }
      return acc;
    };
    if (!("_node" in gs))
      gs = {
        _node: {
          children: gs
        }
      };
    const esc = drill(gs);
    esc.__listeners = globalListeners;
    return esc;
  };
  var to = (esc) => {
    let listeners2 = {};
    const drill = (target, acc = {}, prevKey = "") => {
      if (target.__listeners) {
        Object.keys(target.__listeners).forEach((str) => {
          Object.keys(target.__listeners[str]).forEach((key) => {
            const listener = target.__listeners[str][key];
            const targetStr = listener.__bind.split(".").slice(-1)[0] ?? key;
            if (!listeners2[targetStr])
              listeners2[targetStr] = {};
            listeners2[targetStr][key] = listener.value ?? listener;
          });
        });
      }
      if (target.__children) {
        if (!acc._node)
          acc._node = {};
        if (!acc._node.children)
          acc._node.children = {};
        drill(target.__children, acc._node.children, "__children");
      }
      Object.keys(target).forEach((key) => {
        if (prevKey === "__children") {
          if (!acc[key])
            acc[key] = target[key];
          acc[key]._node = {};
          if (listeners2[key]) {
            acc[key]._node.listeners = {
              ...acc[key]._node.listeners,
              ...listeners2[key]
            };
            delete listeners2[key];
          }
          drill(target[key], acc[key], key);
        }
        if (key === "default") {
          acc._node.operator = target[key];
          delete target[key];
        }
        if (key === "__animate")
          acc._node.loop = target[key] * 1e3;
      });
      return acc;
    };
    const component = create2(esc, void 0, { listen: false, await: false });
    const tree2 = drill({ __children: { component } })._node.children.component._node.children;
    tree2._node = { listeners: listeners2[""] };
    return tree2;
  };

  // index.js
  var divs = {};
  var toGS = "escXgs";
  var toESC = "gsXesc";
  var trees = [
    { id: "tree", value: tree_default },
    { id: "esc", value: index_esc_exports }
  ];
  var readouts = document.getElementById("readouts");
  for (let i in trees) {
    const o = trees[i];
    console.log(`------------------------ Loading ${o.id} ------------------------`);
    let tree2 = o.value;
    if (!divs[o.id]) {
      divs[o.id] = document.createElement("ol");
      divs[o.id].id = o.id;
      readouts.appendChild(divs[o.id]);
      divs[o.id].innerHTML = `<h1>${o.id}</h1>`;
    }
    const transformToESC = o.id == toESC;
    if (transformToESC)
      tree2 = graphscript_exports.from(tree2);
    if (o.id === "esc" || transformToESC) {
      const onConnected = (tree3) => {
        tree3.__children.nodeB.x += 1;
        tree3.__children.nodeB.__children.nodeC.default(4);
        tree3.__children.nodeA.jump();
        const popped2 = tree3.__children.nodeB.__disconnected();
        divs[o.id].innerHTML += "<li><b>nodeB removed!</b></li>";
        popped2.x += 1;
        tree3.__children.nodeA.jump();
        setTimeout(() => {
          tree3.__children.nodeE.__disconnected();
          divs[o.id].innerHTML += "<li><b>nodeE removed!</b></li>";
        }, 5500);
      };
      create2(tree2, { __parent: divs[o.id] }, { listen: true, clone: true, await: true }).then(onConnected);
      continue;
    } else if (o.id === toGS) {
      tree2 = graphscript_exports.to(tree2);
      console.log("Got", tree2);
    }
    let graph = new Graph({
      tree: tree2,
      loaders: {
        "looper": (props, parent, graph3) => {
          let oncreate = () => {
          };
          if (props.__loop && typeof props.__loop === "number") {
            oncreate = (node) => {
              if (node.__loop && typeof node.__loop === "number") {
                node.__isLooping = true;
                if (!node.__looper) {
                  node.__looper = () => {
                    if (node.__isLooping) {
                      node.__operator();
                      setTimeout(node.__looper, node.__loop);
                    }
                  };
                  node.__looper();
                }
              }
            };
          }
          if (typeof props.__onconnected === "undefined")
            props.__onconnected = [oncreate];
          else if (typeof props.__onconnected === "function")
            props.__onconnected = [oncreate, props.__onconnected];
          else if (Array.isArray(props.__onconnected))
            props.__onconnected.unshift(oncreate);
          let ondelete = (node) => {
            if (node.__isLooping)
              node.__isLooping = false;
          };
          if (typeof props.__ondisconnected === "undefined")
            props.__ondisconnected = [ondelete];
          else if (typeof props.__ondisconnected === "function")
            props.__ondisconnected = [ondelete, props.__ondisconnected];
          else if (Array.isArray(props.__ondisconnected))
            props.__ondisconnected.unshift(ondelete);
        }
      }
    });
    graph.get("nodeB").x += 1;
    graph.run("nodeB.nodeC", 4);
    graph.get("nodeA").jump();
    let tree22 = {
      graph
    };
    let graph2 = new Graph({ tree: tree22 });
    let popped = graph.remove("nodeB");
    divs[o.id].innerHTML += "<li><b>nodeB removed!</b></li>";
    graph2.add(popped);
    popped.x += 1;
    popped.__children.nodeC.__operator(1);
    graph.get("nodeA").jump();
    setTimeout(() => {
      graph.remove("nodeE");
      divs[o.id].innerHTML += "<li><b>nodeE removed!</b></li>";
    }, 5500);
  }
})();
