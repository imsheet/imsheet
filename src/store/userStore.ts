import { defineStore } from "pinia"
import { toRaw } from "vue"
export const useUserStore = defineStore('userStore', {
    state: () => {
        return {
            win: {
                w: 1000,
                h: 600,
                top: false,
                maxWin: false,
                overSize: 30
            },
            toWebp: {
                open: false,
                active: false,
                quality: 15
            },
            rename: {
                open: true,
                active: true
            },
            format: {
                list: [
                    {
                        name: 'markdown',
                        exgText: '![](%url)'
                    },
                ],
                active: false,
                select: 0
            },
            domain: ''
        }
    },
    getters: {
        getState(state) {
            return {
                win: toRaw(state.win),
                toWebp: toRaw(state.toWebp),
                rename: toRaw(state.rename),
                format: toRaw(state.format),
                domain: state.domain
            }
        }
    }
})