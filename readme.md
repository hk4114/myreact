- JSX
- commit 
- useState
- class component


```js
// core.js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === 'object' ? child : createTextElement(child))
    }
  }
}

function createTextElement(text) {
  return {
    type: 'TEXT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

function render(vdom, container) {
  const dom = vdom.type === 'TEXT' ? document.createTextNode("") : document.createElement(vdom.type)
  Object.keys(vdom.props).forEach(name => {
    if (name !== 'children') {
      dom[name] = vdom.props[name]
    }
  })
  vdom.props.children.forEach(child => {
    render(child, dom)
  })
  container.appendChild(dom)
}

export default {
  render,
  createElement
}

// index.js
import React from './core'

let element = <div>
  <h1>kanelogger</h1>
  <p>info </p>
  <a href="https://www.yuque.com/">yuque</a>
</div>

React.render(element, document.getElementById('root'))
```

[demo](https://github.com/hk4114/myreact)

