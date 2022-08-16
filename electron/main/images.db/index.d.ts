declare const sqlite3

declare function fileName():string
export function createImagesDB(): Promise<void>
export function pushImagesDB(): Promise<void>
export function syncImagesDB(): Promise<void>