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
// --------------------- babel compolie jsx end---------------------------
let nextUnitOfWork = null;
let wipRoot = null;
// 保存根节点更新前的 fiber tree
let currentRoot = null;
// 储存删除的 fiber，渲染 DOM 时，遍历 deletions 删除旧 fiber；
let deletions = null;

/**
 * workLoop 工作循环函数
 * @param {deadline} 截止时间
 */
function workloop(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() >= 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  requestIdleCallback(workloop)
}
requestIdleCallback(workloop)

// 非函数组件
function updateHostCmp(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

// 函数组件,通过执行函数获取fiber.props.children
function updateFnCmp(fiber) {
  console.log('functional component fiber', fiber)
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children)
}

/**
 * performUnitOfWork 处理工作单元
 * @param {fiber} fiber
 * @return {nextUnitOfWork} 下一个工作单元
 */
function performUnitOfWork(fiber) {
  // 是否是函数类型组件
  const isFnCmp = fiber.type instanceof Function;
  if (isFnCmp) {
    updateFnCmp(fiber)
  } else {
    updateHostCmp(fiber)
  }

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

/**
 * 协调子节点
 * @param {fiber} fiber
 * @param {elements} fiber 的 子节点
 */
function reconcileChildren(wipFiber, elements) {
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null;

  for (let index = 0; index < elements.length || oldFiber != null; index++) {
    const element = elements[index]
    let newFiber = null;
    // 判断类型是否相同
    const sameType =
      oldFiber &&
      element &&
      element.type === oldFiber.type;
    // 类型相同：保留 dom，仅更新 props，effectTag 为 UPDATE
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      }
    }
    // 类型不同，有新元素：创建新节点，effectTag PLACEMENT
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }
    // 类型不同，有旧元素：删除旧节点，effectTag DELETION
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
  }
}

/**
 * createDom 创建 DOM 节点
 * @param {fiber} fiber 节点
 * @return {dom} dom 节点
 */
function createDom(vdom) {
  const dom = vdom.type === 'TEXT'
    ? document.createTextNode('')
    : document.createElement(vdom.type);
  updateDom(dom, {}, vdom.props)
  return dom
}

function updateDom(dom, prevProps, nextProps) {
  // clear oldProps and add newProps
  Object.keys(prevProps).forEach(name => {
    // remove EventListener
    if (name !== "children" && !(name in nextProps)) {
      if (name.slice(0, 2) === 'on') {
        dom.removeEventListener(
          name.slice(2).toLowerCase(),
          prevProps[name],
          false)
      } else {
        dom[name] = ''
      }
    }
  })
  Object.keys(nextProps).forEach(name => {
    // add EventListener
    if (name !== "children") {
      if (name.slice(0, 2) === 'on') {
        dom.addEventListener(
          name.slice(2).toLowerCase(),
          nextProps[name],
          false)
      } else {
        dom[name] = nextProps[name]
      }
    }
  })
}

/**
 * 将 fiber 添加至真实 DOM
 * @param {element} fiber
 * @param {container} 真实 DOM
 */
function render(vdom, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom]
    },
    alternate: currentRoot
  }
  nextUnitOfWork = wipRoot;
  // render 时，初始化 deletions 数组
  deletions = [];
}

// 全部工作单元完成后，将fiber-tree渲染为真实dom
function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * performUnitOfWork 处理工作单元
 * @param {fiber} fiber
 */
function commitWork(fiber) {
  if (!fiber) return;
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber.dom, domParent)
  } else if (fiber.effectTag === 'UPDATE') {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  }

  // 渲染子节点
  commitWork(fiber.child)
  // 渲染兄弟节点
  commitWork(fiber.sibling)
}

/**
 * commitDeletion 删除节点
 * @param {fiber} fiber
 * @param {domParent} dom
 */ 
function commitDeletion(fiber, domParent) {
  if(fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

export default {
  createElement,
  render
}