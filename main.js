const { app, BrowserWindow } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 개발 환경
  if (isDev) {
    console.log('Development Mode')
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
    // Hot Reload 설정
    win.webContents.on('did-fail-load', () => {
      console.log('Failed to load')
      setTimeout(() => {
        win.loadURL('http://localhost:5173')
      }, 1000)
    })
  } else {
    // 프로덕션 환경
    win.loadFile(path.join(__dirname, 'frontend/dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})