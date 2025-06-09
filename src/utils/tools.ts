/**
 * 将字节数转换为易读的大小格式
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的字符串
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化时间为"多久前"的形式
 * @param timestamp 时间戳
 * @returns 格式化后的字符串
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  
  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}分钟前`;
  }
  
  // 小于1天
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}小时前`;
  }
  
  // 小于1周
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}天前`;
  }
  
  // 超过1周，显示日期
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param delay 延迟时间(ms)
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 根据当前时间生成唯一文件名
 * @returns 时间戳格式的文件名
 */
export function generateFileName(): string {
  return `${Date.now()}`;
}

/**
 * 处理URL格式化
 * @param exgText 格式文本
 * @param url 图片URL
 * @param domain 可选域名
 * @returns 格式化后的文本
 */
export function formatUrl(exgText: string, url: string, domain?: string): string {
  const value = exgText || '%url';
  const fullUrl = domain ? `${domain}/${url}` : url;
  return value.replace(/%url/g, fullUrl);
}

export function toExgText(exgText: string, url: string): string {
    // 如果没有格式文本，直接返回URL
    if (!exgText) {
        return url
    }
    
    // 使用正则表达式替换 %url 占位符
    const result = exgText.replace(/%url/g, url)
    
    /* mConsole.log('🔄 格式化文本:', { 
        input: exgText, 
        url: url, 
        output: result 
    }) */
    
    return result
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
        m1 = m > 9 ? m + 1 : '0' + (m + 1),
        now = y.toString() + m1 + (d > 9 ? d : '0' + d),
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