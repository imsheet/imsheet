import { win } from '..'
import { CosHeaderOptions, CosManager } from '../cloud.conf'
import { cosWriteImages } from '../images.db'
import { store } from '../store/index'
import { getImageBuffer, rename, toCosKey } from '../utils/tools'

interface ImagePack {
  path: string
  start: number
  end?: number
  url?: string
  source: string[]
}

export default class ComCourirer {
  state: string = 'free'
  packs: ImagePack[] = []
  constructor() {
    let packs = store.get('packs')
    packs && (this.packs = packs as ImagePack[])
  }

  // send if url, set end
  ready(commandLine) {
    const packs = parsePath(commandLine)
    const storePacks = store.get('packs') || []
    if ((storePacks as []).length) {
      let len = (storePacks as []).length
      for (let i = 0, j = 0; i < len; i++) {
        const url = storePacks[i].url
        const end = storePacks[i].end
        if (url && !end && ++j) {
          storePacks[i].end = new Date().getTime()
          console.log(storePacks[i].url)
          this.update(storePacks)
        }
        if (packs && len == j) return 'over'
      }
    }
  }

  // addPack put this store and local store, only one source.
  addPack(commandLine) {
    if (this.state !== 'free') return
    const packs = parsePath(commandLine)
    if (!packs) return
    this.update(this.packs = (packs as ImagePack[]))
    this.run()
  }

  update(packs) {
    store.set('packs', packs)
  }

  // run
  async run() {
    this.state = 'upload'
    const packs = this.packs.slice()
    for (let i = 0; i < packs.length; i++) {
      let url
      try {
        url = await this.transport(packs[i].path)
      } catch (e) { console.log(e) }
      this.packs[i].url = url as unknown as string
      if (url) win!.webContents.send('toRefresh', url)
      this.update(this.packs)
    }
    this.state = 'free'
  }
  
  async transport(path) {
    const c: any = store.get('CosConfig')
    const cToWebp = c?.user?.toWebp
    const cRename = c?.user?.rename

    let fileName, Suffix = '.webp'
    if (!/^http/i.test(path)) {
      fileName = path.replace(/.*[\/\\]/g, '')
      Suffix = fileName.match(/\.[^.]*$/)[0]
      fileName = cRename?.open && cRename?.active && (rename() + Suffix) || fileName
    } else {
      fileName = rename() + Suffix
    }
    
    const headers: CosHeaderOptions = {
      type: 'toWebp',
      key: fileName.replace(/\.[^.]*$/, '.webp'),
      quality: cToWebp?.quality
    }

    let url = await new Promise(async (resolve, reject) => {
      try {
        const Option = { cb: null, headers: cToWebp?.open && cToWebp?.active && headers }
        const res: any = await CosManager.Instance().push(path, fileName, Option)
        const Key = toCosKey(c?.c?.Dir) + fileName
        const resKey = res.UploadResult?.ProcessResults?.Object?.Key
        const resSize = res.UploadResult?.ProcessResults?.Object?.Size
        const param = {
          name: Key,
          local: res.Location,
          path: resKey || Key,
          size: resSize || (await getImageBuffer(path) as Buffer).length,
          state: 1,
          time: new Date().getTime()
        }
        await cosWriteImages(param)
        resolve(res.Location)
      } catch (err) {
        reject(err)
      }
    })

    if (typeof url === 'string') {
      const domain = c?.user?.domain || null
      url = domain ? (url as any).replace(/([^\/]+)/, domain) : url
      if (!(/^http/.test(url as any))) url = 'https://' + url
    }
    return typeof url === 'string' ? url : null
  }
}


function parsePath(commandLine): boolean | ImagePack[] {
  let isUpload = false
  const source: string[] = [], packs: ImagePack[] = []

  // check has --upload and parsePath
  commandLine && commandLine.forEach(key => {
    if (key === '--upload') isUpload = true
    if ((/(gif|jpg|jpeg|png|webp|bmp)/i.test(key))) {
      let path = !/^http/i.test(key) ?
        key.replace(/[\\\/]?([^\\\/]+)[\\\/]?/g, `$1/`) : key + 'p'
      source.push(path.slice(0, path.length - 1))
    }
  })

  // push in ImagePack
  isUpload && source.forEach(key => {
    const start = new Date().getTime()
    const pack: ImagePack = {
      path: key,
      start: start,
      source: source
    }
    packs.push(pack)
  })

  return isUpload && packs.length > 0 && packs
}
