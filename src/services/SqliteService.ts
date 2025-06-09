// 使用 Tauri SQL 插件实现 SQLite 服务
import Database from '@tauri-apps/plugin-sql';
import { mConsole } from '../main';
import { appDataDir } from '@tauri-apps/api/path';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';

export class SqliteService {
    private static instance: SqliteService;
    private db: Database | null = null;

    private constructor() {}

    public static getInstance(): SqliteService {
        if (!SqliteService.instance) {
            SqliteService.instance = new SqliteService();
        }
        return SqliteService.instance;
    }

    public get dbReady(): boolean {
        return this.db !== null;
    }

    public async init(): Promise<void> {
        if (this.db) return;

        try {
            // 使用 Tauri SQL 插件加载数据库
            this.db = await Database.load('sqlite:imsheet.db');
            
            // 创建表结构
            await this.createTables();
            mConsole.log('SQLite service initialized successfully with Tauri SQL plugin');
        } catch (error) {
            mConsole.error("Failed to initialize SQLite database:", error);
            throw error;
        }
    }

    private async createTables(): Promise<void> {
        if (!this.db) return;

        try {
            // 创建图片表
            await this.db.execute(`
                CREATE TABLE IF NOT EXISTS imsheet(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_name TEXT NOT NULL,
                    image_location TEXT NOT NULL,
                    image_path TEXT NOT NULL UNIQUE,
                    image_size INTEGER NOT NULL,
                    image_state INTEGER NOT NULL,
                    create_time INTEGER NOT NULL
                )
            `);

            // 创建统计表
            await this.db.execute(`
                CREATE TABLE IF NOT EXISTS imsheet_statistical(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    size INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    last_hash VARCHAR(255) NOT NULL
                )
            `);

            // 检查统计表中是否有数据，如果没有，初始化一条记录
            const stats = await this.db.select<Array<{ id: number }>>("SELECT * FROM imsheet_statistical");
            if (!stats.length) {
                await this.db.execute(`
                    INSERT INTO imsheet_statistical (size, quantity, last_hash)
                    VALUES (?, ?, ?)
                `, [0, 0, 'null']);
            }

            mConsole.log('Database tables created successfully');
        } catch (error) {
            mConsole.error('Error creating tables:', error);
            throw error;
        }
    }

    // 从二进制数据加载数据库（用于云端同步）
    public async loadFromBinary(data: Uint8Array): Promise<void> {
        try {
            // 在 Tauri 环境中，我们需要将二进制数据写入文件，然后重新加载数据库
            // 这里需要配合文件系统插件使用
            const appDir = await appDataDir();
            const dbPath = `${appDir}/imsheet.db`;
            
            // 写入二进制数据到文件
            await writeFile(dbPath, data);
            
            // 关闭当前数据库连接
            if (this.db) {
                await this.db.close();
            }
            
            // 重新加载数据库
            this.db = await Database.load('sqlite:imsheet.db');
            
            mConsole.log('Database loaded from binary data');
        } catch (error) {
            mConsole.error('Error loading database from binary:', error);
            throw error;
        }
    }

    // 导出数据库为二进制数据（用于云端同步）
    public async exportToUint8Array(): Promise<Uint8Array> {
        try {
            const appDir = await appDataDir();
            const dbPath = `${appDir}/imsheet.db`;
            
            // 读取数据库文件
            const data = await readFile(dbPath);
            return new Uint8Array(data);
        } catch (error) {
            mConsole.error('Error exporting database:', error);
            throw error;
        }
    }

    // 执行 SQL 查询并返回结果
    public async query(sql: string, params: any[] = []): Promise<any[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            return await this.db.select(sql, params);
        } catch (error) {
            mConsole.error('Execute SQL query failed:', error);
            throw error;
        }
    }

    // 执行不返回结果的 SQL 语句
    public async exec(sql: string, params: any[] = []): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            await this.db.execute(sql, params);
        } catch (error) {
            mConsole.error('Execute SQL statement failed:', error);
            throw error;
        }
    }

    // 获取单行数据 - 修复 sqliteService.get is not a function 错误
    public async get(sql: string, params: any[] = []): Promise<any> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const result = await this.db.select(sql, params) as any[];
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            mConsole.error('Get single record failed:', error);
            throw error;
        }
    }

    // 获取多行数据 - 修复 sqliteService.all is not a function 错误
    public async all(sql: string, params: any[] = []): Promise<any[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            return await this.db.select(sql, params) as any[];
        } catch (error) {
            mConsole.error('Get all records failed:', error);
            throw error;
        }
    }

    // 执行SQL语句 - 修复 sqliteService.run is not a function 错误
    public async run(sql: string, params: any[] = []): Promise<any> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            return await this.db.execute(sql, params);
        } catch (error) {
            mConsole.error('Run SQL statement failed:', error);
            throw error;
        }
    }

    // 获取数据库哈希值（用于同步检查）
    public async getDbHash(): Promise<string> {
        try {
            if (!this.dbReady) {
                await this.init();
            }
            
            const sql = 'SELECT last_hash FROM imsheet_statistical WHERE id = 1';
            const result = await this.query(sql);
            
            if (result.length > 0) {
                return (result[0] as any).last_hash || 'null';
            }
            
            return 'null';
        } catch (error) {
            mConsole.error('获取数据库哈希失败:', error);
            return 'null';
        }
    }

    // 更新数据库哈希值
    public async updateDbHash(hash: string): Promise<void> {
        try {
            if (!this.dbReady) {
                await this.init();
            }
            
            const sql = 'UPDATE imsheet_statistical SET last_hash = ? WHERE id = 1';
            await this.exec(sql, [hash]);
        } catch (error) {
            mConsole.error('更新数据库哈希失败:', error);
            throw error;
        }
    }

    // 图片相关操作
    public async insertImage(imageData: any): Promise<number> {
        if (!this.db) throw new Error("Database not initialized");

        try {
            const result = await this.db.execute(`
                INSERT INTO imsheet (image_name, image_location, image_path, image_size, image_state, create_time)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                imageData.image_name,
                imageData.image_location,
                imageData.image_path,
                imageData.image_size,
                imageData.image_state || 0,
                imageData.create_time || Date.now()
            ]);
            
            return result.lastInsertId as number;
        } catch (error) {
            mConsole.error('Insert image failed:', error);
            throw error;
        }
    }

    public async getImages(page: number = 1, limit: number = 20): Promise<any[]> {
        if (!this.db) return [];

        try {
            const offset = (page - 1) * limit;
            return await this.db.select(`
                SELECT * FROM imsheet 
                ORDER BY create_time DESC 
                LIMIT ? OFFSET ?
            `, [limit, offset]);
        } catch (error) {
            mConsole.error('Get images failed:', error);
            return [];
        }
    }

    public async deleteImage(id: number): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        try {
            await this.db.execute("DELETE FROM imsheet WHERE id = ?", [id]);
        } catch (error) {
            mConsole.error('Delete image failed:', error);
            throw error;
        }
    }

    // 创建全新的空数据库（用于初始化）
    public async createFreshDb(): Promise<void> {
        try {
            // 关闭当前数据库连接
            if (this.db) {
                await this.db.close();
                this.db = null;
            }
            
            // 创建新的数据库连接
            this.db = await Database.load('sqlite:imsheet.db');
            
            // 删除所有现有数据
            await this.db.execute('DROP TABLE IF EXISTS imsheet');
            await this.db.execute('DROP TABLE IF EXISTS imsheet_statistical');
            
            // 重新创建表结构
            await this.createTables();
            
            mConsole.log('✅ 全新数据库创建完成');
        } catch (error) {
            mConsole.error('创建全新数据库失败:', error);
            throw error;
        }
    }

    public async close(): Promise<void> {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
        
        mConsole.log("SQLite database connection closed");
    }
}

export const sqliteService = SqliteService.getInstance();