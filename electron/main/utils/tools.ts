import crypto from 'crypto'

export function md5(data: Buffer): string {
    let hash = crypto.createHash('md5')
    return hash.update(data).digest('hex')
}

export function toCosKey(key?: string) {
    if (!key) return 'ImSheet/'
    return key.replace(/[\\\/]?([^\\\/]+)[\\\/]?/g, `$1/`)
}