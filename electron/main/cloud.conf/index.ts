import fs from 'fs'
import path from 'path'
import COS from 'cos-nodejs-sdk-v5'
import { app } from 'electron'
import { store } from '../store/index'
import { getImageBuffer } from '../utils/tools'

function toCosKey(key: string) {
    if (!key) return 'ImSheet/'
    return key.replace(/[\\\/]?([^\\\/]+)[\\\/]?/g, `$1/`)
}

export function getCosConfig(): CosConfig {
    const fileName = path.resolve(app.getPath('userData'), 'images.db')
    const exist = fs.existsSync(fileName)
    const conf = store.get('CosConfig') as CosConfig || { exist }
    conf.exist = exist
    return conf
}

export function SetCosConfig(c: CosConfig) {
    CosManager.Instance().config = c
    store.set('CosConfig', c)
}

type CosConfMust = Record<'APPID' | 'SecretId' | 'SecretKey' | 'Bucket' | 'Region', string>
type CosConfPar = Partial<Record<'Domain' | 'Dir', string>>
type ImagesDB = Record<'fromName' | 'path', string>

export type CosHeaderOptions = { type: string, key?: string, quality?: number }

export interface CosConfig {
    exist: Boolean,
    c?: CosConfMust & CosConfPar,
    ImagesDB?: ImagesDB,
    user?: any
}

export class CosManager {
    cos: COS | undefined
    private _CONFIG: CosConfig | undefined
    private static instance: CosManager | undefined
    private constructor(c: CosConfig) {
        this.config = c
    }

    static Instance(c?: CosConfig): CosManager | undefined {
        if (!CosManager.instance && c) {
            CosManager.instance = new CosManager(c!)
        }
        return CosManager.instance
    }

    get config() {
        return this._CONFIG!
    }

    set config(c: CosConfig) {
        this._CONFIG = c
        if (!(c && c.c)) return
        this.cos = new COS({
            SecretId: c.c.SecretId,
            SecretKey: c.c.SecretKey
        })
    }

    head(key: string) {
        return new Promise((resolve, reject) => {
            if (!this.cos) return reject('cos is not instantiated yet')
            this.cos!.headObject({
                Bucket: this.config.c.Bucket,
                Region: this.config.c.Region,
                Key: this.config.c.Dir ?
                    (toCosKey(this.config.c.Dir) + key) :
                    'ImSheet/' + key,
            }, function (err, data) {
                if (!err) resolve(data)
                reject(err)
            })
        })
    }

    query(Prefix: string) {
        return new Promise((resolve, reject) => {
            if (!this.cos) return reject('cos is not instantiated yet')
            this.cos!.getBucket({
                Bucket: this.config.c.Bucket,
                Region: this.config.c.Region,
                Prefix: Prefix
            }, function (err, data) {
                if (!err) resolve(data)
                reject(err)
            })
        })
    }

    pull(key: string) {
        return new Promise((resolve, reject) => {
            if (!this.cos) return reject('cos is not instantiated yet')
            this.cos.getObject({
                Bucket: this.config.c.Bucket,
                Region: this.config.c.Region,
                Key: this.config.c.Dir ?
                    (toCosKey(this.config.c.Dir) + key) :
                    'ImSheet/' + key,
            }, function (err, data) {
                if (!err) resolve(data)
                reject(err)
            })
        })
    }

    push(filePath: string, key: string, options?: { cb?: Function, headers?: CosHeaderOptions }): Promise<unknown> {
        return new Promise(async (resolve, reject) => {
            if (!this.cos) return reject('cos is not instantiated yet')
            const rekey = options && options.headers && options.headers.key
            const body = await getImageBuffer(filePath)
            this.cos.putObject({
                Bucket: this.config.c.Bucket,
                Region: this.config.c.Region,
                Key: this.config.c.Dir ?
                    (toCosKey(this.config.c.Dir) + (rekey || key)) :
                    'ImSheet/' + (rekey || key),
                Body: body as Buffer,
                ContentLength: (body as Buffer)?.length,
                onProgress: function (progressData) {
                    const percent = progressData.percent
                    options && options.cb && options.cb({ percent, key })
                },
                Headers: options && options.headers ? this.Headers(options.headers) : {}
            }, function (err, data) {
                if (!err) resolve(data)
                reject(err)
            })
        })
    }

    delete(path: { Key: string }[]) {
        return new Promise((resolve, reject) => {
            if (!this.cos) return reject('cos is not instantiated yet')
            this.cos.deleteMultipleObject({
                Bucket: this.config.c.Bucket,
                Region: this.config.c.Region,
                Objects: path
            }, function (err, data) {
                if (!err) resolve(data)
                reject(err)
            })
        })
    }

    Headers(head: CosHeaderOptions): COS.Headers {
        const setHeaders = {}
        if (head.key && head.quality && head.type == 'toWebp') {
            let key = encodeURI(head.key)
            setHeaders['Pic-Operations'] = `{"is_pic_info": 0, "rules": [{"fileid": "${key}", "rule": "imageMogr2/format/webp/quality/${head.quality}!"}]}`
        }
        return setHeaders
    }
}

export const queryCosDB = (c: CosConfig) => {
    return new Promise((resolve, reject) => {
        const cos = new COS({
            SecretId: c.c.SecretId,
            SecretKey: c.c.SecretKey,
        });

        cos.getBucket({
            Bucket: c.c.Bucket,
            Region: c.c.Region,
            Prefix: c.c.Dir ?
                toCosKey(c.c.Dir) + 'images.db' :
                'ImSheet/images.db',  /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
        }, function (err, data) {
            if (!err) resolve(data.Contents.length)
            reject(err)
        });
    })
}
