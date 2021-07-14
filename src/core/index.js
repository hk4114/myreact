let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null
let deletions = null
let wipFiber = null
let hookIndex = null

/*---------------------- jsx start --------------------------*/
// create virtual dom
function createElement(type, props, ...children) {
  delete props.__source
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === "object" ? child : createTextElement(child)),
    },
  }
}

// create text virtual dom
function createTextElement(text) {
  return {
    type: "TEXT",
    props: {
      nodeValue: text,
      children: [],
    }
  }
}

// init begin render -> linklist head
function render(vdom, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom],
    },
    base: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

// create dom
function createDom(vdom) {
  const dom = vdom.type === "TEXT" ? document.createTextNode("") : document.createElement(vdom.type);
  updateDom(dom, {}, vdom.props)
  return dom
}

// update dom
function updateDom(dom, prevProps, nextProps) {
  // clear oldProps and add newProps
  Object.keys(prevProps).forEach(name => {
    // remove EventListener
    if (name !== "children" && !(name in nextProps)) {
      if (name.slice(0, 2) === 'on') {
        dom.removeEventListener(name.slice(2).toLowerCase(), prevProps[name], false)
      } else {
        dom[name] = ''
      }
    }
  })
  Object.keys(nextProps).forEach(name => {
    // add EventListener
    if (name !== "children") {
      if (name.slice(0, 2) === 'on') {
        dom.addEventListener(name.slice(2).toLowerCase(), nextProps[name], false)
      } else {
        dom[name] = nextProps[name]
      }
    }
  })
}
/*---------------------- jsx end --------------------------*/

/*---------------------- commit start --------------------------*/
function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  // cancel wip
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) {
    return
  }
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.base.props, fiber.props)
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

// 任务调度
function workLoop(deadline) {
  // 有任务，并且当前帧还没结束
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    // 获取下一个任务单元
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  // 没有下个任务了 提交修改
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }
  // fiber遍历顺序 child => child.sibling => finish or no => parent
  if (fiber.child) {
    return fiber.child
  }

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

function reconcileChildren(wipNode, elements) {
  let index = 0
  let oldFiber = wipNode.base && wipNode.base.child
  let prevSibling = null
  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber = null
    // 对比
    const sameType = oldFiber && element && element.type === oldFiber.type

    if (sameType) {
      // update the node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipNode,
        base: oldFiber,
        effectTag: "UPDATE",
      }
    }
    if (element && !sameType) {
      // add this node
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipNode,
        base: null,
        effectTag: "PLACEMENT",
      }
    }
    if (oldFiber && !sameType) {
      // delete the oldFiber's node
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }
    if (index === 0) {
      wipNode.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
    index++
  }
}

/*----------- useState start ----------------*/
function useState(init) {
  const oldHook = wipFiber.base && wipFiber.base.hooks && wipFiber.base.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : init,
    queue: [],
  }
  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => { hook.state = action })

  const setState = action => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      base: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }
  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}
/*----------- useState start ----------------*/

/*----------- component transfer start ----------------*/
class Component {
  constructor(props) {
    this.props = props
  }
}

function transfer(Component) {
  return function (props) {
    const component = new Component(props)
    let initState = useState
    let [state, setState] = initState(component.state)
    component.props = props
    component.state = state
    component.setState = setState
    return component.render()
  }
}
/*----------- component transfer end ----------------*/

export default {
  createElement,
  render,
  useState,
  Component,
  transfer
}