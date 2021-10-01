let nextUnitOfWork = null;
let wipRoot = null;

function workloop(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() >= 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  if(!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  requestIdleCallback(workloop)
}
requestIdleCallback(workloop)

function performUnitOfWork(fiber) {
  if(!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  
  const elements = fiber.props.children;
  let prevSibling = null;
  for(let i = 0; i < elements.length; i++) {
    const element = elements[i];
    
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }

    if(i===0) {
      fiber.child = newFiber
    }else if(element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber
  }

  if(fiber.child) {
    return fiber.child
  }

  let nextFiber = fiber;
  while(nextFiber) {
    if(nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

function commitRoot() {
  commitWork(wipRoot.child);
  wipRoot = null
}

function commitWork(fiber) {
  if(!fiber) return;
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child)
  commitWork(fiber.sibling)
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
  Object.keys(vdom.props).forEach(prop => {
    if (prop !== 'children') {
      dom[prop] = vdom.props[prop]
    }
  })
  return dom
}

function render(vdom, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom]
    }
  }
  nextUnitOfWork = wipRoot
}

export default {
  createElement,
  render
}