export function toExgText(exgText: string, key: string, domain?: string) {
    let url = domain ? key.replace(/^(?:https?:\/\/)?[^\/]+/, domain) : key
    if (!(/^http/.test(url))) url = 'https://' + url
    const value = exgText || '',
        exg = /([\S\s]*)%url([\S\s]*)/
    return value.replace(exg, `$1${url}$2`)
}

export function toCosKey(key?: string) {
    if (!key) return 'ImSheet/'
    return key.replace(/[\\\/]?([^\\\/]+)[\\\/]?/g, `$1/`)
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

export function bytesToSize(bytes: number | string) {
    bytes = Number(bytes)
    if (bytes === 0) return '0 B'
    const k = 1024,
        sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k))
    let size = (bytes / Math.pow(k, i)).toPrecision(3)
    if (/e/.test(size)) size =
        (Math.floor((bytes / Math.pow(k, i)) * 100) / 100).toString()
    return size + ' ' + sizes[i]
}

export function lastTime(create_time: number) {
    let timeDifference = new Date().getTime() - create_time;
    let second = Math.floor(timeDifference / 1000)
    if (second < 60) return "刚刚"
    let minute = Math.floor(second / 60)
    if (minute < 60) return minute + "分钟前"
    let hour = Math.floor(minute / 60)
    if (hour < 24) return hour + "时前"
    let day = Math.floor(hour / 24)
    if (day < 30) return day + "天前"
    let month = Math.floor(day / 30)
    if (month < 12) return month + "月前"
    let year = Math.floor(month / 12)
    return year + "年前"
}

export function throttle(fn: Function, delay: number) {
    let timer: NodeJS.Timeout | null = null
    return function (this: any, ...args: Array<number>) {
        if (timer) return
        timer = setTimeout(() => {
            fn.apply(this, args)
            timer = null
        }, delay);
    }
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

