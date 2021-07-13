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

function render(vdom, container) {
  container.innerHTML = `<pre>${JSON.stringify(vdom)}</pre>`
}

export {
  createElement,
  render
}