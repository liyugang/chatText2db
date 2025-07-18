import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import './assets/base.css'
import { useSettingsStore } from './stores/settings'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 应用主题和字体大小class
const settingsStore = useSettingsStore()
settingsStore.applyTheme()

app.mount('#app')
