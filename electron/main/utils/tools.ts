import crypto from 'crypto'
import fs from 'fs'
const request = require('request')

export function md5(data: Buffer): string {
    let hash = crypto.createHash('md5')
    return hash.update(data).digest('hex')
}

export function toCosKey(key?: string) {
    if (!key) return 'ImSheet/'
    return key.replace(/[\\\/]?([^\\\/]+)[\\\/]?/g, `$1/`)
}

export async function getImageBuffer(filePath) {
    return new Promise((resolve, reject) => {
        if (!/^http/i.test(filePath)) return resolve(fs.readFileSync(filePath))
        request.get({
            url: filePath, encoding: null,
            Headers: { 'Referer': sp(filePath) }
        }, function (err, res, body) {
            if (err) reject(err)
            resolve(body)
        })
    })

    function sp(url) {
        return url.match(/https?:\/\/.+?(?=\/)/)[0]
    }
}

export function rename(role?: number): string {
    const date = new Date(),
        y = date.getFullYear(),
        m = date.getMonth(),
        d = date.getDate(),
        o = new Date(y, m, d).getTime(),
        c = new Date().getTime() - o,
        m1 = m > 10 ? m + 1 : '0' + (m + 1),
        now = y.toString() + m1 + (d > 10 ? d : '0' + d),
        r = Math.floor(Math.random() * (role || 56800235583)),
        toBaseC = toBase(c).toString(),
        toBaseR = toBase(r).toString()
    return `${toBaseC}-${toBaseR}-${now}`
}

function toBase(num: number, set?: number | undefined) {
    let symbols: string | Array<any> =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
        decimal = num, base = set || 62,
        conversion = ""
    if (base > symbols.length || base <= 1) return false
    while (decimal >= 1) {
        conversion = symbols[(decimal - (base * Math.floor(decimal / base)))] +
            conversion
        decimal = Math.floor(decimal / base)
    }
    return (base < 11) ? parseInt(conversion) : conversion
}