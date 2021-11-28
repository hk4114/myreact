import React from './core';
const App = props => <h1>hello {props.name}</h1>
const element = (
  <App name='function component' />
)
React.render(element, document.getElementById("root"))

// const rerender = value => {
//   const element = (
//       <div>
//           <input onInput={updateValue} value={value} />
//           <h2>Hello {value}</h2>
//       </div>
//   )
//   React.render(element, container)
// }

// const updateValue = e => {
//   rerender(e.target.value)
// }

// rerender("World")

// const element = <div>
//   <h1>demo</h1>
//   <p>for sample <b>react</b></p>
//   <a href="https://github.com/hk4114/myreact">repo</a>
// </div>

// React.render(element, document.getElementById('root'))
