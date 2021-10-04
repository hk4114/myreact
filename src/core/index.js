let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let deletions = null;
let wipFiber = null;

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

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber && fiber.type && fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
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

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  wipFiber.hook = [];
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber = null

    const sameType =
      oldFiber &&
      element &&
      element.type === oldFiber.type

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
    index++
  }
}

function commitRoot() {
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  deletions.forEach(commitWork)
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) return;
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }

  const domParent = domParentFiber.dom

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber.dom, domParent)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
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

function useState(initial) {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hook;
  
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: []
  }
  const actions = oldHook ? oldHook.queue : [];
  
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = action => {
    hook.queue.push(action)
    // 更新页面操作
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot
    }
    nextUnitOfWork = wipRoot;
    deletions = []
  }
  wipFiber.hook = hook;
  return [hook.state, setState]
}

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

function createDom(vdom) {
  const dom = vdom.type === 'TEXT' ? document.createTextNode('') : document.createElement(vdom.type);
  updateDom(dom, {}, vdom.props)
  return dom
}

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

function render(vdom, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom],
    },
    alternate: currentRoot
  }
  deletions = [];
  nextUnitOfWork = wipRoot;
}

export default {
  createElement,
  render,
  useState
}