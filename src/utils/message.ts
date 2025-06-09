import { MessageApi } from 'naive-ui';

// 成功类消息
export function uploadFinish(message: MessageApi) {
  message.success('上传完成，已复制链接')
}

export function saveExgFinish(message: MessageApi) {
  message.success('保存成功')
}

export function addExgFinish(message: MessageApi) {
  message.success('添加成功')
}

// 错误类消息
export function uploadFail(message: MessageApi) {
  message.error('上传失败')
}

export function uploadTypeError(message: MessageApi) {
  message.error('仅支持图片文件 (jpg, png, gif, webp, bmp)')
}

export function uploadSizeError(message: MessageApi) {
  message.error('WebP转换模式下，图片大小不能超过32MB')
}

export function addExgError(message: MessageApi) {
  message.error('格式名称不能为空')
}

export function addExgLong(message: MessageApi) {
  message.error('格式名称不能超过20个字符')
}

export function exgExistErroe(message: MessageApi) {
  message.error('格式内容必须包含 %url 占位符')
}

// 进行中消息
export function uploading(message: MessageApi) {
  message.loading('正在上传...')
}

// 菜单操作提示
export function handleMenuOp(message: MessageApi, type: string = '默认'): string {
  message.success(`已复制为${type}格式`)
  return 'copy'
}