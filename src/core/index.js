function createElement(type, props, ...children) {
  delete props.__source
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === 'object' ? child : craeteTextElement(child))
    }
  }
}

function craeteTextElement(nodeValue) {
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
  Object.keys(vdom.props).forEach(prop => {
    if (prop !== 'children') {
      dom[prop] = vdom.props[prop]
    }
  })
  vdom.props.children.forEach(child => {
    render(child, dom)
  })
  container.appendChild(dom)
}

export default {
  createElement,
  render
}