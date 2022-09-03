import { ipcRenderer } from 'electron'
import type { CosConfig } from 'src/cond/cloud.conf'

export async function getCosConfig() {
  return ipcRenderer.invoke('getCosConfig')
}

export async function setCosConfig(cond: CosConfig) {
  return ipcRenderer.invoke('setCosConfig', cond)
}

export async function queryCosDB(c: CosConfig) {
  return ipcRenderer.invoke('queryCosDB', c)
}

export async function createImagesDB() {
  return ipcRenderer.invoke('createImagesDB')
}

export async function checkImagesDB(c: CosConfig) {
  return ipcRenderer.invoke('checkImagesDB', c)
}

export async function pullImagesDB() {
  return ipcRenderer.invoke('pullImagesDB')
}

export async function queryLocalDBMsg() {
  return ipcRenderer.invoke('queryLocalDBMsg')
}

export async function queryImagesList(...args: [pageSize: number, page: number, state: number, range?: Array<number>]) {
  return ipcRenderer.invoke('queryImagesList', ...args)
}

export async function queryImagesCount(...args: [state: number, range?: Array<number>]) {
  return ipcRenderer.invoke('queryImagesCount', ...args)
}

export async function changeImagesState(state: number, key: string) {
  return ipcRenderer.invoke('changeImagesState', state, key)
}

export async function deleteImages() {
  return ipcRenderer.invoke('deleteImages')
}

export async function cosPush(fileSize: number, filePath: string, key: string, options: any) {
  return ipcRenderer.invoke('cosPush', fileSize, filePath, key, options)
}

export async function cosProgress(callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void) {
  return ipcRenderer.on('cosProgress', callback)
}

export async function removeAllListeners() {
  return ipcRenderer.removeAllListeners('cosProgress')
}


export async function changeWin(is: any) {
  return ipcRenderer.invoke('changeWin', is)
}

export async function changeSize(userStore: any) {
  return ipcRenderer.on('mainWin-max', (e, status) => {
    userStore.win.maxWin = status
  })
}
export async function minimize() {
  return ipcRenderer.send('minimize')
}
export async function close() {
  return ipcRenderer.send('close')
}
export async function onpushpin(is: any) {
  return ipcRenderer.send('onpushpin', is)
}

export async function openNewPages(url: any) {
  return ipcRenderer.send('openNewPages', url)
}

export async function getWinSize() {
  return ipcRenderer.invoke('getWinSize')
}
export async function setWinSize(w: any, h: any) {
  return ipcRenderer.send('setWinSize', w, h)
}
