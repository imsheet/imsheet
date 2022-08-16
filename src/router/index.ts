import { createRouter, createWebHashHistory } from "vue-router";
import UploadPage from '../components/upload/UploadPage.vue'
import SetCon from '../components/config/SetCon.vue'
import GalleryPage from '../components/gallery/GalleryPage.vue'
import RecyclePage from '../components/gallery/RecyclePage.vue'

const routes = [
    {
        path: '/',
        name: 'UploadPage',
        component: UploadPage
    },
    {
        path: '/SetCon',
        name: 'Config',
        component: SetCon
    },
    {
        path: '/GalleryPage',
        name: 'GalleryPage',
        component: GalleryPage
    },
    {
        path: '/RecyclePage',
        name: 'RecyclePage',
        component: RecyclePage
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router