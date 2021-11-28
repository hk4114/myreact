## step 1
jsx 解析 以及 vdom-tree 渲染
```js
// index.js
import React from './core'

const element = <div>
  <h1>demo</h1>
  <p>for sample <b>react</b></p>
  <a href="https://github.com/hk4114/myreact">repo</a>
</div>

React.render(element, document.getElementById('root'))

// core.js
function createElement(type, props, ...children) {
  delete props.__source
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === 'object' ? child : createTextElement(child))
    }
  }
}

function createTextElement(nodeValue) {
  return {
    type: 'TEXT',
    props: {
      children: [],
      nodeValue
    }
  }
}

function render(vdom, container) {
  const dom = vdom.type === 'TEXT' ? document.createTextNode('') : document.createElement(vdom.type);
  Object.keys(vdom.props).forEach(name => {
    if(name !== 'children') {
      dom[name] = vdom.props[name]
    }
  })
  vdom.props.children.forEach(child => render(child, dom))
  container.appendChild(dom)
}

export default {
  createElement,
  render
}
```

## step2 vdom-tree -> fiber
