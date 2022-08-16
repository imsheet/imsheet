const sqlite3 = require('sqlite3').verbose()

export class ImagesDB {
    private static db: any | undefined
    private static instance: ImagesDB | undefined
    private constructor() { }

    static Instance() {
        if (!ImagesDB.instance) {
            this.instance = new ImagesDB()
        }
        return this.instance
    }

    open(fileName: string) {
        if (!ImagesDB.db) {
            this.setFilePath(fileName)
        }
        return ImagesDB.instance
    }

    setFilePath(fileName: string) {
        try {
            ImagesDB.db = new sqlite3.Database(fileName)
            return ImagesDB.instance
        } catch (e) { return e }
    }

    run(sql: string) {
        if (ImagesDB.db) return new Promise((resolve, reject) => {
            ImagesDB.db.run(sql, (err:any) => {
                err ? reject(err) : resolve('success')
            })
        })
    }

    all(sql: string): any {
        if (ImagesDB.db) return new Promise((resolve, reject) => {
            ImagesDB.db.all(sql, (err:any, rows:any) => {
                err ? reject(err) : resolve(rows)
            })
        })
    }
}