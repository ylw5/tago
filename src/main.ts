import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createSSRApp } from 'vue'
import App from './App.vue'
import './styles/theme.scss'

function loadHandwritingFont() {
  if (typeof window === 'undefined') return

  const load = () => {
    import('lxgw-wenkai-screen-webfont/lxgwwenkaiscreen.css')
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(load, { timeout: 1800 })
    return
  }

  setTimeout(load, 600)
}

export function createApp() {
  loadHandwritingFont()
  const app = createSSRApp(App)
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app.use(pinia)
  return {
    app,
  }
}
