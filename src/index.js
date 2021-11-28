import React from './core';
class Demo extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      count: 1
    }
  }
  handleClick = () => {
    this.setState(v => {
      v.count += 1;
      return v
    })
  }
  render() {
    return <div>
      <h2 onClick={this.handleClick}>{this.state.count}</h2>
    </div>
  }
}
Demo = React.transfer(Demo)

function App(props) {
  const [count, setCount] = React.useState(1)
  return <div id="container" className="red">
    <h1>{props.title}, {count}</h1>
    <button onClick={() => setCount(c => c + 1)}>+1</button>
    <hr />
    <Demo></Demo>
  </div>
}
let element = <App title="huakang" />

React.render(element, document.getElementById('root'))
// function Counter() {
//   const [state, setState] = React.useState(1);
//   const [name, setName] = React.useState('hi~')
//   return (
//     <h1>
//       <span onClick={() => setState(c => c + 1)}>
//         Count:</span> {state} <br />
//       <input type="text" value={name} onBlur={(v) => setName(() => v.target.value)} />
//       {name}
//     </h1>
//   )
// }
// const element = <Counter />
// React.render(element, document.getElementById("root"))

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
