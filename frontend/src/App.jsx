import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import flaskLogo from './assets/flask.svg'
import './App.css'
import axios from 'axios'

function App() {
  const [count, setCount] = useState(0)
  const [strategies, setStrategies] = useState([])

  // Flask API 요청
  useEffect(() => {
    axios.get('http://localhost:5000/api/strategies')
      .then((res) => {
        setStrategies(res.data)
      })
      .catch((err) => {
        console.error('Flask API 연결 실패:', err)
      })
  }, [])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://flask.palletsprojects.com" target="_blank">
          <img src={flaskLogo} className="logo flask" alt="Flask logo" />
        </a>
      </div>
      <h1>Vite + React + Flask</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Flask에서 받은 전략 목록:
        </p>
        <ul>
          {strategies.map((strategy, idx) => (
            <li key={idx}>
              {strategy.name || '이름 없는 전략'}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default App
