import { ipcMain, shell } from 'electron'
import { win } from '../index'
import { getCosConfig, SetCosConfig, queryCosDB, CosManager, CosHeaderOptions } from '../cloud.conf'
import type { CosConfig } from '../cloud.conf'
import { toCosKey } from '../utils/tools'

import {
    changeImagesState,
    checkImagesDB,
    cosWriteImages,
    createImagesDB,
    deleteImages,
    pullImagesDB,
    queryImagesCount,
    queryImagesList,
    queryLocalDBMsg
} from '../images.db'

export async function ipcChannel(): Promise<void> {
    ipcMain.handle('getCosConfig', () => {
        return new Promise((resolve) => {
            resolve(getCosConfig())
        })
    })

    ipcMain.handle('setCosConfig', (e, conf: CosConfig) => {
        SetCosConfig(conf)
        return true
    })

    ipcMain.handle('queryCosDB', (e, c: CosConfig) => {
        return queryCosDB(c)
    })

    ipcMain.handle('cosPush', (e, fileSize, filePath, key, options?: { cb?: boolean, headers?: CosHeaderOptions }) => {
        return new Promise(async (resolve, reject) => {
            try {
                const cb = options.cb && ((data: any) => e.sender.send('cosProgress', data))
                const Option = options.cb ? { cb, headers: options.headers || null } :
                    { headers: options.headers || null }
                const res: any = await CosManager.Instance().push(filePath, key, Option)
                const c: CosConfig = await getCosConfig()
                const Key = toCosKey(c.c.Dir) + key
                const resKey = res.UploadResult?.ProcessResults?.Object?.Key
                const resSize = res.UploadResult?.ProcessResults?.Object?.Size
                const param = {
                    name: Key,
                    local: res.Location,
                    path: resKey || Key,
                    size: resSize || fileSize, state: 1,
                    time: new Date().getTime()
                }
                await cosWriteImages(param)
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    })

    ipcMain.handle('checkImagesDB', (e, c: CosConfig) => {
        return checkImagesDB(c)
    })

    ipcMain.handle('createImagesDB', () => {
        return createImagesDB()
    })

    ipcMain.handle('pullImagesDB', () => {
        return pullImagesDB()
    })

    ipcMain.handle('queryLocalDBMsg', () => {
        return queryLocalDBMsg()
    })

    ipcMain.handle('queryImagesList', (e, num, page, state, between) => {
        return queryImagesList(num, page, state, between)
    })
    ipcMain.handle('queryImagesCount', (e, state, between) => {
        return queryImagesCount(state, between)
    })
    ipcMain.handle('changeImagesState', (e, state, key) => {
        return changeImagesState(state, key)
    })
    ipcMain.handle('deleteImages', () => {
        return deleteImages()
    })

    ipcMain.handle('changeWin', (e, is: boolean) => {
        is ? win.maximize() : win.restore()
    })
    ipcMain.on('onpushpin', (e, is: boolean) => {
        win.setAlwaysOnTop(is)
    })
    ipcMain.on('minimize', () => win.minimize())
    ipcMain.on('close', () => win.close())
    ipcMain.on('openNewPages', (e, url) => {
        e.preventDefault();
        shell.openExternal(url)
    })
    ipcMain.on('setWinSize', (e, w, h) => win.setSize(w, h, true))
    ipcMain.handle('getWinSize', () => win.getSize())
}
