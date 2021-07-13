// 下一个单元任务 render 会初始化第一个任务
let nextUnitOfwork = null;
// 保存全局根节点
let wipRoot = null;

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

// 抽离 dom 相关代码
function createDom(vdom) {
  const dom = vdom.type === 'TEXT' ? document.createTextNode('')
    : document.createElement(vdom.type);
  Object.keys(vdom.props).filter(key => key !== 'children').forEach(item => {
    // todo 合成事件 属性兼容
    dom[item] = vdom.props[item]
  })
  return dom
}

// 渲染vdom
function render(vdom, container) {
  // 原先 递归 的做法不再适用，而是应该使用 fiber和requestIdleCallback
  // vdom.props.children.forEach(child => {
  //   render(child, dom)
  // })
  // container.appendChild(dom)
  wipRoot = {
    dom: container,
    props: {
      children: [vdom] // 初始化第一个任务
    }
  }
  nextUnitOfwork = wipRoot;
}

function commitRoot() {
  commitWorker(wipRoot.child)
  wipRoot = null
}

function commitWorker(fiber) {
  if (!fiber) {
    return
  }
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom
  domParent.appendChild(fiber.dom)
  commitWorker(fiber.child)
  commitWorker(fiber.sibling)
}

// 调度diff任务或者渲染任务
function workloop(deadline) {
  // 存在下一个任务 且当前帧未结束
  while (nextUnitOfwork && deadline.timeRemaining() > 1) {
    nextUnitOfwork = perfromUnitOfWork(nextUnitOfwork)
  }
  // 无后续任务 且 根节点存在
  if (!nextUnitOfwork && wipRoot) {
    commitRoot()
  }
  requestIdleCallback(workloop)
}
// 启动空闲时间处理
requestIdleCallback(workloop)

// 获取下一个任务
function perfromUnitOfWork(fiber) {
  // 根据当前任务获取下一个任务
  if (!fiber.dom) {
    // 不是入口
    fiber.dom = createDom(fiber)
  }
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }
  const elements = fiber.props.children;
  // 构建fiber结构
  // ? 这里不用for的原因是后面会用到这个index -> 插入排序
  let index = 0;
  let prevSlibling = null;
  while (index < elements.length) {
    let element = elements[index];
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }
    if (index === 0) {
      // 第一个元素，是父fiber的child属性
      fiber.child = newFiber
    } else {
      // 其他
      prevSlibling.slibling = newFiber
    }
    prevSlibling = fiber
    index++
    // fiber 基本结构构建完毕
  }
  // 找下一个任务
  // 先找子元素元素
  if (fiber.child) {
    return fiber.child
  }
  // 没有子元素 找兄弟元素
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

export {
  createElement,
  render
}