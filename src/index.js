import React from './core'

// 可以通过添加注释的形式，告诉 babel 转译我们指定的函数，来使用 JSX 语法
/** @jsx React.createElement */
const element = <div>
  <h1>demo</h1>
  <p>for sample <b>react</b></p>
  <a href="https://github.com/hk4114/myreact">repo</a> <br/>
  <input type="text" />
</div>

React.render(element, document.getElementById('root'))