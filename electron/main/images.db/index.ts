import fs from 'fs'
import path from 'path'
import { CosConfig, CosManager } from '../cloud.conf'
import COS from 'cos-nodejs-sdk-v5'
import { ImagesDB } from './Instance'
import { app } from 'electron'

const fileName = () => {
    // const resources = path.resolve(ROOT_PATH.public, '../..')
    // return path.resolve(resources, 'images.db')
    // return path.resolve(ROOT_PATH.public, 'images.db')
    return path.resolve(app.getPath('userData'), 'images.db')
}

export async function createImagesDB() {
    return new Promise(async (resolve, reject) => {
        try {
            fs.writeFileSync(fileName(), '', { flag: 'w' })
            const imagesDB = ImagesDB.Instance()
            imagesDB!.open(fileName())
            const createImagesTable = "CREATE TABLE IF NOT EXISTS imsheet(" +
                "`id` INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "`image_name` TEXT NOT NULL, " +
                "`image_location` TEXT NOT NULL, " +
                "`image_path` TEXT NOT NULL UNIQUE, " +
                "`image_size` INTEGER NOT NULL, " +
                "`image_state` INTEGER NOT NULL, " +
                "`create_time` INTEGER NOT NULL " +
                ")"
            const createStatisticalTable = "CREATE TABLE IF NOT EXISTS imsheet_statistical(" +
                "`id` INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "`size` INTEGER NOT NULL, " +
                "`quantity` INTEGER NOT NULL, " +
                "`last_hash` VARCHAR(255) NOT NULL " +
                ")"
            await imagesDB!.run(createImagesTable)
            await imagesDB!.run(createStatisticalTable)
            await imagesDB!.run("insert into imsheet_statistical (size, quantity, last_hash) values (0, 0, 'null')")
            lastModifyHash(imagesDB)
            resolve('createImagesDB success!')
        } catch (err) { reject(err) }
    })
}

export async function checkImagesDB(config: CosConfig) {
    CosManager.Instance().config = config
    return new Promise((resolve, reject) => {
        pullImagesDB().then(async () => {
            const db = ImagesDB!.Instance()!.open(fileName())
            db!.all('select * from imsheet_statistical').then((rows: any) => {
                lastModifyHash(db)
                resolve(rows)
            })
                .catch(() => createImagesDB().then(res => resolve(res)).catch(e => reject(e)))
        }).catch(err => reject(err))
    })
}

export async function pullImagesDB() {
    return new Promise((resolve, reject) => {
        CosManager.Instance().pull('images.db').then(res => {
            const data = res as COS.GetObjectResult
            fs.writeFile(fileName(), data.Body, { flag: 'w' }, (err) => {
                if (err) return console.error(err)
                resolve('success')
            })
        }).catch((err: any) => {
            reject(err)
        })
    })
}

export async function cosWriteImages(param: { name: string, local: string, path: string, size: number, state: number, time: number }) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = ImagesDB!.Instance()!.open(fileName())
            const cloudDBhash = await queryCloudDBhash('images.db')
            const localDBhash = await queryLocalDBHash(db)
            const value = 'image_name, image_location, image_path, image_size, image_state, create_time',
                fromValue = Object.entries(param).map(v => typeof v[1] === 'string' ? v[1].replace(/([\S\s]+)/, `'$1'`) : v[1]).join()
            if (cloudDBhash != localDBhash) await pullImagesDB()
            db!.run(`insert into imsheet (${value}) values (${fromValue})`)!.then(() => {
                updateImagesDB(param.size).then(() => {
                    lastModifyHash(db).then(() => resolve('send success'))
                })
            }).catch(err => reject(err))
        } catch (err) { console.log(err) }
    })
}

export async function queryLocalDBMsg() {
    return new Promise((resolve, reject) => {
        let db = ImagesDB.Instance()!.open(fileName())
        db!.all("select * from imsheet_statistical where id = 1;").then((rows: any) => {
            const size = fs.statSync(fileName()).size
            resolve({ rows, size })
        }).catch((err: any) => reject(err))
    })
}

export async function queryImagesList(num: number, page: number, state: number, between: Array<number>) {
    return new Promise((resolve, reject) => {
        if (!CosManager.Instance().cos) return reject('config undefind')
        const limit = `limit ${num} offset ${(page - 1) * num}`,
            b = between ? `and create_time between ${between[0]} and ${between[1]}` : null,
            sql = `select * from imsheet where image_state = ${state} ${b ? b : ''} order by create_time desc ${limit}`,
            db = ImagesDB.Instance()!.open(fileName())
        db!.all(sql).then((rows: any) => resolve(rows)).catch((err: any) => reject(err))
    })
}

export async function queryImagesCount(state: number, between: Array<number>) {
    return new Promise((resolve, reject) => {
        const b = between ? `and create_time between ${between[0]} and ${between[1]}` : null,
            sql = `select count(*) from imsheet where image_state = ${state} ${b ? b : ''}`,
            db = ImagesDB.Instance()!.open(fileName())
        db!.all(sql).then((rows: any) => resolve(rows)).catch((err: any) => reject(err))
    })
}

export async function changeImagesState(state: number, key: string) {
    return new Promise((resolve, reject) => {
        const db = ImagesDB.Instance()!.open(fileName()), t = new Date().getTime()
        db!.all(`update imsheet set image_state = ${state}, create_time = ${t} where image_location = '${key}'`)
            .then((rows: any) => resolve(rows)).catch((err: any) => reject(err))
    })
}

export async function deleteImages() {
    return new Promise(async (resolve, reject) => {
        const db = ImagesDB.Instance()!.open(fileName())
        try {
            const cloudDBhash = await queryCloudDBhash('images.db')
            const localDBhash = await queryLocalDBHash(db)
            if (cloudDBhash != localDBhash) await pullImagesDB()
        } catch (err) { console.log(err) }
        db!.all(`select * from imsheet where image_state = 0`)!
            .then((rows: any) => {
                if (!rows.length) return lastModifyHash(db).then(() => resolve('void'))
                let size = 0, q = rows.map((v: any) => {
                    return size = size + (v.image_size || 1)
                })
                const path = rows.map((v: any) => ({ Key: v.image_path }))
                CosManager.Instance()!.delete(path).then(async () => {
                    await db!.run('delete from imsheet where image_state = 0')
                    await db!.run('VACUUM')
                    await updateImagesDB(-size, -q.length)
                    lastModifyHash(db).then(() => resolve('send success'))
                })
            }).catch((err: any) => reject(err))
    })
}

function updateImagesDB(size_t: any, q?: number) {
    return new Promise(async (resolve, reject) => {
        let db = ImagesDB.Instance()!.open(fileName()), size, quantity, values
        db!.all('select * from imsheet_statistical where id = 1').then((rows: any) => {
            size = rows[0].size + Number(size_t)
            quantity = rows[0].quantity + (q || 1)
            values = `size = ${size}, quantity = ${quantity}`
            db!.run(`update imsheet_statistical set ${values} where id = 1`)!
                .then(res => resolve(res))
                .catch(err => reject(err))
        })
    })
}

function lastModifyHash(db: any) {
    return new Promise((resolve, reject) => {
        CosManager.Instance().push(fileName(), 'images.db').then(res => {
            const data = res as COS.HeadObjectResult
            const last_hash = data.ETag.replace(/"/g, '')
            db.run(`update imsheet_statistical set last_hash = "${last_hash}" where id = 1`)
                .catch((err: any) => reject(err))
            resolve(last_hash)
        })
    })
}

function queryCloudDBhash(Key: string) {
    return new Promise((resolve, reject) => {
        CosManager.Instance()!.head(Key).then(res => {
            const data = res as COS.HeadObjectResult
            resolve(data.ETag.replace(/"/g, ''))
        }).catch((err: any) => reject(err))
    })
}

function queryLocalDBHash(db: any) {
    return new Promise((resolve, reject) => {
        db.all("select last_hash from imsheet_statistical where id = 1;").then((rows: any) => {
            resolve(rows[0].last_hash)
        }).catch((err: any) => reject(err))
    })
}


