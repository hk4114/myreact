// 创建 vdom
function createElement(type, props, ...children) {
  delete props.__source
  return {
    type,
    props: {
      ...props,
      children: children.map(child => {
        return typeof child === 'object' ? child : createTextElement(child)
      })
    }
  }
}

// 创建文本类型element
function createTextElement(text) {
  return {
    type: 'TEXT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

// 渲染vdom
function render(vdom, container) {
  const dom = vdom.type === 'TEXT' ? document.createTextNode('')
    : document.createElement(vdom.type);

  Object.keys(vdom.props).filter(key => key !== 'children').forEach(item => {
    // todo 合成事件 属性兼容
    dom[item] = vdom.props[item]
  })    
  vdom.props.children.forEach(child => {
    render(child, dom)
  })
  container.appendChild(dom)
}

export {
  createElement,
  render
}