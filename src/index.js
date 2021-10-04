import React from './core'

// const element = <div>
//   <h1>demo</h1>
//   <p>for sample <b>react</b></p>
//   <a href="https://github.com/hk4114/myreact">repo</a>
// </div>

// React.render(element, document.getElementById('root'))


const container = document.getElementById('root')

// const updateValue = e => {
//     rerender(e.target.value)
// }

// const rerender = value => {
//     const element = (
//         <div>
//             <input onInput={updateValue} value={value} />
//             <h2>Hello {value}</h2>
//         </div>
//     )
//     React.render(element, container)
// }

// rerender("World")

function App(props) {
  return (
    <h1>hi~ {props.name}</h1>
  )
}

const element = (
  <App name='foo' />
)

React.render(element, container)