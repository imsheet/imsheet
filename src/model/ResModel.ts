import { DialogApiInjection } from "naive-ui/es/dialog/src/DialogProvider"
import { MessageApiInjection } from "naive-ui/es/message/src/MessageProvider"

export const confirmSave = (message: MessageApiInjection, dialog: DialogApiInjection) => {
    return new Promise<{ reply: Boolean, m: Function }>((resolve) => {
        const success = () => message.success('保存配置')
        const cancel = () => message.success('操作取消')
        dialog.info({
            title: '提示',
            content: '该路径已经存在数据种子，是否拉取？',
            negativeText: '不了',
            positiveText: '保存',
            maskClosable: false,
            onNegativeClick: () => {
                resolve({ reply: false, m: cancel })
            },
            onPositiveClick: () => {
                resolve({ reply: true, m: success })
            },
            onClose: () => {
                resolve({ reply: false, m: cancel })
            }
        })
    })
}

export const ErrorConfig = (message: MessageApiInjection) => {
    return message.info('配置有误，连接失败')
}

export const SaveConfig = (message: MessageApiInjection) => {
    return message.success('配置生效')
}

export const uploadFinish = (message: MessageApiInjection) => {
    return message.success('上传完成')
}

export const uploadFail = (message: MessageApiInjection) => {
    return message.warning('上传失败')
}

export const uploading = (message: MessageApiInjection) => {
    return message.info('上传中...')
}

export const uploadTypeError = (message: MessageApiInjection) => {
    return message.warning('格式不支持')
}

export const uploadSizeError = (message: MessageApiInjection) => {
    return message.warning('转化图片过大，限制小于32MB')
}

export const saveExgFinish = (message: MessageApiInjection) => {
    return message.success('已保存')
}

export const addExgFinish = (message: MessageApiInjection) => {
    return message.success('已添加')
}

export const imageRemoveFinish = (message: MessageApiInjection) => {
    return message.success('已清理')
}

export const networkError = (message: MessageApiInjection) => {
    return message.error('网络错误')
}

export const addExgError = (message: MessageApiInjection) => {
    return message.warning('请填写别名')
}

export const addExgLong = (message: MessageApiInjection) => {
    return message.warning('别名超出20个字符限制')
}

export const exgExistErroe = (message: MessageApiInjection) => {
    return message.warning('未填入占位符 %url')
}

export const handleMenuOp = (message: MessageApiInjection, label?: string) => {
    if (label === '回收') {
        message.info('已收回')
        return 'remove'
    } else if (label === '恢复') {
        message.info('已恢复 ')
        return 'recover'
    } else {
        message.success('已复制 ' + (label || ''))
        return 'copy'
    }
}