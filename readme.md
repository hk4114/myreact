## step 1
jsx 解析 以及 vdom-tree 渲染
```js
// index.js
import React from './core'

const element = <div>
  <h1>demo</h1>
  <p>for sample <b>react</b></p>
  <a href="https://github.com/hk4114/myreact">repo</a>
</div>

React.render(element, document.getElementById('root'))

// core.js
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

function render(vdom, container) {
  const dom = vdom.type === 'TEXT' ? document.createTextNode('') : document.createElement(vdom.type);
  Object.keys(vdom.props).forEach(name => {
    if(name !== 'children') {
      dom[name] = vdom.props[name]
    }
  })
  vdom.props.children.forEach(child => render(child, dom))
  container.appendChild(dom)
}

export default {
  createElement,
  render
}
```

## step2
`vdom.props.children.forEach(child => render(child, dom))` 通过递归渲染ui不可中断，页面卡顿。
如何解决页面元素复杂繁多造成页面卡顿呢？
1. requestIdleCallback 利用浏览器空闲时间进行渲染，如果有优先任务则先处理优先级更高的任务。
2. 将渲染工作分解成一个个小单元

```js
/**
 * workLoop 工作循环函数
 * @param {deadline} 截止时间
 */
let nextUnitOfWork = null;
function workloop(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() >= 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  // 通知浏览器，空闲时间应该执行 workLoop
  requestIdleCallback(workloop)
}
requestIdleCallback(workloop)

/**
 * performUnitOfWork 处理工作单元
 * @param {fiber} fiber
 * @return {nextUnitOfWork} 下一个工作单元
 */
function performUnitOfWork(fiber) {
  // 1.添加 dom 节点
  // 2.新建 filber
  // 3.返回下一个工作单元（fiber）
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom) // -> vdom.props.children.forEach(child => render(child, dom))
  }

  let prevSibling = null;
  const elements = fiber.props.children;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    let newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }
    // 第一个子节点是fiber的child,其余都是该节点的sibling
    if(i === 0) {
      fiber.child = newFiber
    }else if(element) {
      prevSibling.sibling = newFiber
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

/**
 * createDom 创建 DOM 节点
 * @param {fiber} fiber 节点
 * @return {dom} dom 节点
 */
function createDom(vdom) {
  const dom = vdom.type === 'TEXT' ? document.createTextNode('') : document.createElement(vdom.type);
  Object.keys(vdom.props).forEach(name => {
    if (name !== 'children') {
      dom[name] = vdom.props[name]
    }
  })
  return dom
}

/**
 * 将 fiber 添加至真实 DOM
 * @param {element} fiber
 * @param {container} 真实 DOM
 */
function render(vdom, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [vdom]
    }
  }
}
```
