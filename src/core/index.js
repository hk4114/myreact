// 下一个单元任务 render 会初始化第一个任务
let nextUnitOfwork = null;
// 保存全局根节点
let wipRoot = null;
// 当前中断的节点
let currentRoot = null;
// 删除的数据
let deletions = null

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
  updateDom(dom, {}, vdom.props)
  return dom
}

// 更新 dom 
function updateDom(dom, prevProps, nextProps) {
  // 1. 规避children
  // 2. 老的存在 取消
  // 3. 新的存在 新增
  // 没有新老diff
  Object.keys(prevProps)
    .filter(name => name !== "children")
    .filter(name => !(name in nextProps))
    .forEach(name => {
      // 删除
      if (name.slice(0, 2) === 'on') {
        dom.removeEventListener(name.slice(2).toLowerCase(), prevProps[name], false)
      } else {
        dom[name] = ''
      }
    })

  Object.keys(nextProps)
    .filter(name => name !== "children")
    .forEach(name => {
      // 删除
      if (name.slice(0, 2) === 'on') {
        dom.addEventListener(name.slice(2).toLowerCase(), nextProps[name], false)
      } else {
        dom[name] = nextProps[name]
      }
    })
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
    },
    base: currentRoot
  }
  deletions = [];
  nextUnitOfwork = wipRoot;
}

function commitRoot() {
  deletions.forEach(commitWorker)
  commitWorker(wipRoot.child)
  // 保存当前根节点
  currentRoot = wipRoot
  wipRoot = null
}

function commitWorker(fiber) {
  if (!fiber) {
    return
  }
  const domParent = fiber.parent.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom)
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.base.props, fiber.props)
  }
  // domParent.appendChild(fiber.dom)
  commitWorker(fiber.child)
  commitWorker(fiber.sibling)
}

// 调度diff任务或者渲染任务
function workloop(deadline) {
  // 存在下一个任务 且当前帧未结束
  while (nextUnitOfwork && deadline.timeRemaining() > 1) {
    nextUnitOfwork = performUnitOfWork(nextUnitOfwork)
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
function performUnitOfWork(fiber) {
  // 根据当前任务获取下一个任务
  if (!fiber.dom) {
    // 不是入口
    fiber.dom = createDom(fiber)
  }
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }
  const elements = fiber.props.children;

  reconcileChildren(fiber, elements)

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

// 调和元素
function reconcileChildren(wipFiber, elements) {
  // 构建fiber结构
  // ? 这里不用for的原因是后面会用到这个index -> 插入排序
  let index = 0;
  let prevSlibling = null;
  let oldFiber = wipFiber.base && wipFiber.base.child;
  while (index < elements.length && oldFiber != null) {
    // while (index < elements.length) {
    let element = elements[index];
    // const newFiber = {
    //   type: element.type,
    //   props: element.props,
    //   parent: wipFiber,
    //   dom: null
    // }
    let newFiber = null;
    // 对比 oldFiber 状态 与 当前 element
    // 比较类型 diff
    const sameType = oldFiber && element && oldFiber.type === element.type;
    if (sameType) {
      // 复用节点，更新
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        base: oldFiber,
        effectTag: 'UPDATE'
      }
    }
    if (!sameType && element) {
      // 替换
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        base: null,
        effectTag: 'PLACEMENT'
      }
    }
    if (!sameType && oldFiber) {
      // 删除
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber)
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }
    if (index === 0) {
      // 第一个元素，是父fiber的child属性
      wipFiber.child = newFiber
    } else {
      // 其他
      prevSlibling.slibling = newFiber
    }
    prevSlibling = wipFiber
    index++
    // fiber 基本结构构建完毕
  }
}

export {
  createElement,
  render
}