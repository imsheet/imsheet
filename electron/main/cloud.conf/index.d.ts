import COS from 'cos-nodejs-sdk-v5'

export function getCosConfig(): CosConfig

export function SetCosConfig(c: CosConfig): void

type CosConfMust = Record<'APPID' | 'SecretId' | 'SecretKey' | 'Bucket' | 'Region', string>
type CosConfPar = Partial<Record<'Domain' | 'Dir', string>>
type ImagesDB = Record<'fromName' | 'path', string>

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
    private constructor(c: CosConfig)
    static Instance(c?: CosConfig): CosManager
    get config():CosConfig
    set config(c: CosConfig)
    head(key: string)
    query(Prefix: string)
    pull(key: string)
    push(filePath: string, key: string, cb?: Function)
    delete(path: { Key: string }[])
}

export function queryCosDB(c: CosConfig)