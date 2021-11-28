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

## step2 可中断渲染 fiber
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

## step3 渲染提交阶段

渲染过程是可中断的，为了不给用户呈现未完成渲染的ui,需要进行优化：
1. 把 performUnitOfWork 中关于把子节点添加至父节点的逻辑删除，新增一个根节点变量，存储 fiber 根节点，当所有 fiber 都工作完成时，nextUnitOfWork 为 undefined，这时再渲染真实 DOM。
2. 新增 commitRoot 函数，执行渲染真实 DOM 操作，递归将 fiber tree 渲染为真实 DOM；

```js
function performUnitOfWork(fiber) {
    // 把这段删了
    if (fiber.parent) {
       fiber.parent.dom.appendChild(fiber.dom)
    }
}

let wipRoot = null;

function render(vdom, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom]
    }
  }
  // 下一个工作单元是根节点
  nextUnitOfWork = wipRoot
}

function workloop(deadline) {
  // ...code
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  // ...code
}

// 全部工作单元完成后，将fiber-tree渲染为真实dom
function commitRoot() {
  commitWork(wipRoot.child);
  // 需要设置null,避免workloop不断执行
  wipRoot = null;
}

/**
 * performUnitOfWork 处理工作单元
 * @param {fiber} fiber
 */
function commitWork(fiber) {
  if(!fiber) return;
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  // 渲染子节点
  commitWork(fiber.child)
  // 渲染兄弟节点
  commitWork(fiber.sibling)
}
```

## step4 协调 diff
```js
import React from './core'
const container = document.getElementById("root")
const rerender = value => {
  const element = (
      <div>
          <input onInput={updateValue} value={value} />
          <h2>Hello {value}</h2>
      </div>
  )
  React.render(element, container)
}
const updateValue = e => {
  rerender(e.target.value)
}
rerender("World")
```
通过对fiber的比较，判断是否要更新dom，目的：减少对真实 DOM 的操作次数。
1. 新增全局变量 currenRoot，保存根节点更新前的fiber tree
2. fiber 新增 alternate 属性，保存 fiber 更新前的 fiber tree

```js
// 保存根节点更新前的 fiber tree
let currentRoot = null;

function render(vdom, container) {
  wipRoot = {
    // ...code
    alternate: currentRoot
  }
  nextUnitOfWork = wipRoot
}

function commitRoot() {
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}
```
3. 将 performUnitOfWork 中关于新建 fiber 的逻辑抽离，新建函数 reconcileChildren
```js
function performUnitOfWork(fiber) {
  // ...code
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements)
  // ...code
}
/**
 * 协调子节点
 * @param {fiber} fibercurrentRoot
 * @param {elements} fiber 的 子节点
 */
function reconcileChildren(wipFiber, elements) {
  let prevSibling = null;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    let newFiber = {
      type: element.type,
      props: element.props,
      parent: wipFiber,
      dom: null
    }
    if (i === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
  }
}
```
4. 在 reconcileChildren 中对比新旧 fiber 
```js
function reconcileChildren(wipFiber, elements) {
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
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
    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }
    // ...code
  }
}
```
5. 删除fiber节点: 新建 deletions 数组存储需删除的 fiber 节点，渲染 DOM 时，遍历 deletions 删除旧 fiber；
```js
// 储存删除的 fiber，渲染 DOM 时，遍历 deletions 删除旧 fiber；
let deletions = null;
function render(vdom, container) {
  // ...code
  deletions = [];
}

function reconcileChildren (wipFiber, elements) {
  // code
  // 类型不同，有旧元素：删除旧节点，effectTag DELETION
  if(!sameType && oldFiber) {
    oldFiber.effectTag = 'DELETION';
    deletions.push(oldFiber)
  }
  // code
}
```

## step5 函数式组件
```js
import React from './core';
const App = props => <h1>hello {props.name}</h1>
const element = (
  <App name='function component' />
)
React.render(element, document.getElementById("root"))
```
函数式组件与html标签组件相比
- 函数组件的fiber没有dom节点
- 函数组件的children需要运行函数得到

为了解决这两个问题
1. 修改 performUnitOfWork，根据 fiber 类型，执行 fiber 工作单元
```js
function performUnitOfWork(fiber) {
    // 是否是函数类型组件
  const isFnCmp = fiber.type instanceof Function;
  if (isFnCmp) {
    updateFnCmp(fiber)
  } else {
    updateHostCmp(fiber)
  }
  // code
}
// 非函数组件
function updateHostCmp(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

// 函数组件,通过执行函数获取fiber.props.children
function updateFnCmp(fiber) {
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children)
}
```
2. commitWork 执行渲染，由于函数组件没有dom，所以需要兼容父节点的获取逻辑
```js
function commitWork(fiber) {
  // 修改 domParent 获取逻辑,如果不存在dom则向上遍历父节点
  // const domParent = fiber.parent.dom
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;
}
```
1. 删除节点，通过递归寻找有dom节点的 child fiber
```js
function commitWork(fiber) {
  // code
  // domParent.removeChild(fiber.dom)
  commitDeletion(fiber.dom, domParent)
}
/**
 * commitDeletion 删除节点
 * @param {fiber} fiber
 * @param {domParent} dom
 */ 
function commitDeletion(fiber, domParent) {
  // fiber 存在 dom 则直接删除
  if(fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    // 没有 dom 节点，则继续找它的子节点进行删除
    commitDeletion(fiber.child, domParent)
  }
}
```
