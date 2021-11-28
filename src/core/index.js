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
// --------------------- babel compolie jsx ---------------------------

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