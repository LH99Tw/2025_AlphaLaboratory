const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const isDev = process.env.NODE_ENV === 'development'
let flaskProcess = null

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  if (isDev) {
    console.log('Development Mode')
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
    win.webContents.on('did-fail-load', () => {
      console.log('Failed to load')
      setTimeout(() => {
        win.loadURL('http://localhost:5173')
      }, 1000)
    })
  } else {
    win.loadFile(path.join(__dirname, 'frontend/dist/index.html'))
  }
}

function startFlaskServer() {
  const scriptPath = path.join(__dirname, 'backend', 'flask_server.py')
  const pythonPath = path.join(__dirname, 'backend', 'venv', 'Scripts', 'python.exe')

  flaskProcess = spawn(pythonPath, [scriptPath], {
    cwd: path.join(__dirname, 'backend'),
    shell: true
  })

  flaskProcess.stdout.on('data', (data) => {
    console.log(`[Flask] ${data.toString()}`)
  })

  flaskProcess.stderr.on('data', (data) => {
    console.error(`[Flask Error] ${data.toString()}`)
  })

  flaskProcess.on('error', (err) => {
    console.error(`[Flask Error] Failed to start: ${err.message}`)
  })

  flaskProcess.on('close', (code) => {
    console.log(`[Flask] exited with code ${code}`)
  })
}

app.whenReady().then(() => {
  startFlaskServer()
  createWindow()
})

app.on('window-all-closed', () => {
  if (flaskProcess) flaskProcess.kill()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
