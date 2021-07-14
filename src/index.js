import React from './core'

class Demo extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      count: 1
    }
  }
  handleClick = () => {
    this.setState({
      count: this.state.count + 1
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
    <button onClick={() => setCount(count + 1)}>??</button>
    <hr />
    <Demo></Demo>
  </div>
}
let element = <App title="huakang" />

React.render(element, document.getElementById('root'))