type CosConfMust = Record<'APPID' | 'SecretId' | 'SecretKey' | 'Bucket' | 'Region', string>
type CosConfPar = Partial<Record<'Domain' | 'Dir', string>>
type ImagesDB = Record<'fromName' | 'path', string>

export interface CosConfig { exist: Boolean, c: CosConfMust & CosConfPar, ImagesDB?: ImagesDB, user?: any }

