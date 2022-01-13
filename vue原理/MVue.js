const compileUtil = {
    getVal (expr, vm) {
        // [person,name]
        return expr.split('.').reduce((data, currentVal) => {
            return data[currentVal];
        }, vm.$data);
    },
    getContentVal (expr, vm) {
        return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            let t = args[1].trim()
            return this.getVal(t, vm)
        });
    },
    text (node, expr, vm) { // expr:msg 学习MVVM原理
        let value;
        if (expr.indexOf('{{') !== -1) {
            // {{a}} -- {{b}}
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                let t = args[1].trim()
                new Watcher(vm, t, (newVal) => {
                    this.updater.textUpdater(node, this.getContentVal(expr, vm));
                });
                return this.getVal(t, vm)
            })
        } else {
            value = this.getVal(expr, vm);
        }
        this.updater.textUpdater(node, value)
    },
    html (node, expr, vm) {
        const value = this.getVal(expr, vm);
        new Watcher(vm, expr, (newVal) => {
            this.updater.htmlUpdater(node, newVal)
        })
        this.updater.htmlUpdater(node, value);
    },
    model (node, expr, vm) {
        const value = this.getVal(expr, vm);
        this.updater.modelUpdater(node, value)
        new Watcher(vm, expr, (newVal) => {
            this.updater.modelUpdater(node, newVal)
        })
    },
    on (node,expr, vm, eventName) {
        let fn = vm.$options.methods && vm.$options.methods[expr];
        node.addEventListener(eventName, fn.bind(vm), false);
    },
    bind (node, expr, vm, attrName) {
        console.log('expr:', expr);
        const value = this.getVal(expr, vm);
        node.setAttribute(attrName, value);
    },
    updater: {
        modelUpdater (node, value) {
            node.value = value
        },
        textUpdater (node, value) {
            node.textContent = value
        },
        htmlUpdater (node, value) {
            node.innerHTML = value
        }
    }
}

class Compile {
    constructor (el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        // 1. 获取文档碎片对象 放入内存中会减少页面的回流和重绘
        const fragment = this.node2Fragment(this.el)
        // 2. 编译模板
        this.compile(fragment);
        // 3. 追加子元素到根元素
        this.el.appendChild(fragment)
    }
    compile (fragment) {
        // 1. 获取子节点
        const childNodes = fragment.childNodes;
        [...childNodes].forEach(child => {
            // console.log(child)
            if (this.isElementNode(child)) {
                // 是元素节点
                // 编译元素节点
                // console.log('元素节点', child)
                this.compileElement(child)
            } else {
                // 文本节点
                // 编译文本节点
                // console.log('文本节点:', child)
                this.compileText(child)
            }
            if (child.childNodes && child.childNodes.length) {
                this.compile(child);
            }
        })
    }
    compileElement (node) {
        // console.log(node)
        // <div v-text="msg"></div>
        const attributes = node.attributes;
        [...attributes].forEach(attr => {
            const {name, value} = attr
            if (this.isDirective(name)) { // 是一个指令 v-text v-html v-moel v-on:click
                const [,dirctive] = name.split('-'); // text html model on:clock
                const [dirName, eventName] = dirctive.split(':');
                compileUtil[dirName](node, value, this.vm, eventName)
                // 删除有指令的标签上的属性
                node.removeAttribute('v-' + dirctive)
            } else if (this.isEventName(name)) { // @click="h"
                let [, eventName] = name.split('@')
                compileUtil['on'](node, value, this.vm, eventName)
            }
        })
    }
    compileText (node) {
        // {{}}
        // console.log(node.textContent)
        const content = node.textContent
        if (/\{\{(.+?)\}\}/.test(content)) {
            compileUtil['text'](node, content, this.vm)
        }
    }
    isEventName (attrname) {
        return attrname.startsWith('@')
    }
    isDirective (name) {
        return name.startsWith('v-')
    }
    node2Fragment (el) {
        // 创建文档碎片
        const f = document.createDocumentFragment();
        let firstChild = null;
        while (firstChild = el.firstChild) {
            f.appendChild(firstChild);
        }
        return f;
    }
    isElementNode (node) {
        return node.nodeType === 1;
    }
}

class MVue {
    constructor (options) {
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if (this.$el) {
            // 1. 实现一个数据观察者
            // 2. 实现一个指令解析器
            new Observer(this.$data);
            new Compile(this.$el, this);
        }
    }
}