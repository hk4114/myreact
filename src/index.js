import React from './core';
function Counter() {
  const [state, setState] = React.useState(1);
  const [name, setName] = React.useState('hi~')
  return (
    <h1>
      <span onClick={() => setState(c => c + 1)}>
        Count:</span> {state} <br />
      <input type="text" value={name} onBlur={(v) => setName(() => v.target.value)} />
      {name}
    </h1>
  )
}
const element = <Counter />
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
