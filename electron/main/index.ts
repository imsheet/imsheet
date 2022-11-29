import { app, BrowserWindow, shell, ipcMain, Tray } from 'electron'
import { release } from 'os'
import { join } from 'path'
import { CosManager, getCosConfig } from './cloud.conf'
import { globalShortcut, Menu } from 'electron'
import { ipcChannel } from './ipc-channel'
import ComCourirer from './transport/ComCourirer'

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

export const ROOT_PATH = {
  // /dist
  dist: join(__dirname, '../..'),
  // /dist or /public
  public: join(__dirname, app.isPackaged ? '../..' : '../../../public'),
}

export let win: BrowserWindow | null = null, tray: any = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const url = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`
const indexHtml = join(ROOT_PATH.dist, 'index.html')

const courirer = new ComCourirer()

if (!app.requestSingleInstanceLock()) {
  setInterval(() => {
    const result = courirer.ready(process.argv)
    result === 'over' && (app.quit(), process.exit(0))
  }, 500)
  setTimeout(() => {
    console.log('upload err. find the bug imSheet shift+ctrl+i ')
    app.quit(), process.exit(0)
  }, 5000)
} else {
  async function createWindow() {
    win = new BrowserWindow({
      frame: false,
      title: 'Main window',
      icon: join(ROOT_PATH.public, 'im.png'),
      minWidth: 336,
      minHeight: 350,
      webPreferences: {
        preload,
        // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
        // Consider using contextBridge.exposeInMainWorld
        // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
        nodeIntegration: true,
        contextIsolation: false,
      },

    })!

    if (app.isPackaged) {
      win.loadFile(indexHtml)
    } else {
      win.loadURL(url)
      // win.webContents.openDevTools()
    }

    // Test actively push message to the Electron-Renderer
    win.webContents.on('did-finish-load', () => {
      win?.webContents.send('main-process-message', new Date().toLocaleString())
    })

    // Make all links open with the browser, not with the application
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:')) shell.openExternal(url)
      return { action: 'deny' }
    })


    win.on('closed', () => {
      win = null
    })

    win.on('close', (event) => {
      event.preventDefault()
      win!.hide()!
      win!.setSkipTaskbar(true)!
    })
    win.on('show', () => { })
    win.on('hide', () => { })

    tray = new Tray(join(ROOT_PATH.public, 'im.png'))
    tray.setToolTip('ImSheet Tray')
    const contextMenu = Menu.buildFromTemplate([{
      label: '显示',
      click: () => { win!.show() }
    },
    {
      label: '退出',
      click: () => { win!.destroy() }
    }
    ])
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => {
      win!.isVisible() ? win!.hide() : win!.show()
      win!.isVisible() ? win!.setSkipTaskbar(false) : win!.setSkipTaskbar(true)
    })
    win.on('maximize', () => {
      win!.webContents.send('mainWin-max', true)
    })
    win.on('unmaximize', () => {
      win!.webContents.send('mainWin-max', false)
    })
  }

  app.whenReady().then(createWindow)

  app.on('ready', async () => {
    ipcChannel()
    CosManager.Instance(getCosConfig())
    globalShortcut.register('CommandOrControl+Shift+i', function () {
      win!.webContents.openDevTools()
    })
    const template = [
      {
        label: '菜单',
        submenu: [
          {
            label: '控制台',
            accelerator: 'CommandOrControl+Shift+i',
            click: () => {
              win!.webContents.openDevTools()
            }
          }
        ]
      }
    ]

    const m = Menu.buildFromTemplate(template)
    // Menu.setApplicationMenu(m)
    Menu.setApplicationMenu(null)
  })

  app.on('window-all-closed', () => {
    win = null
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const l = commandLine
    const isUp = l && l[1]
    courirer.addPack(l)
    if (win && isUp != '--upload') {
      // Focus on the main window if the user tried to open another
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
      allWindows[0].focus()
    } else {
      createWindow()
    }
  })

  // new window example arg: new windows url
  ipcMain.handle('open-win', (event, arg) => {
    const childWindow = new BrowserWindow({
      webPreferences: {
        preload,
      },
    })

    if (app.isPackaged) {
      childWindow.loadFile(indexHtml, { hash: arg })
    } else {
      childWindow.loadURL(`${url}/#${arg}`)
      // childWindow.webContents.openDevTools({ mode: "undocked", activate: true })
    }
  })

}