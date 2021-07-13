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

// 下一个单元任务 render 会初始化第一个任务
let nextUnitOfwork = null;

// 调度diff任务或者渲染任务
function workloop(deadline) {
  // 存在下一个任务 且当前帧未结束
  while(nextUnitOfwork && deadline.timeRemaining() > 1) {
    nextUnitOfwork = perfromUnitOfWork(nextUnitOfwork)
  }
  requestIdleCallback(workloop)
}
// 启动空闲时间处理
requestIdleCallback(workloop)

// 获取下一个任务
function perfromUnitOfWork(fiber) {
  // 根据当前任务获取下一个任务

}

export {
  createElement,
  render
}