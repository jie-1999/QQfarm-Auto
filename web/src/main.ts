import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { useAppStore } from '@/stores/app'
import { useToastStore } from '@/stores/toast'
import App from './App.vue'
import router from './router'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Apply theme immediately before app mounts
const THEME_KEY = 'ui_theme'
const savedTheme = localStorage.getItem(THEME_KEY) || 'emerald'
const themeColors: Record<string, { isDark: boolean, accent: string, accentHover: string }> = {
  emerald: { isDark: true, accent: '#10b981', accentHover: '#34d399' },
  ocean: { isDark: true, accent: '#3b82f6', accentHover: '#60a5fa' },
  violet: { isDark: true, accent: '#8b5cf6', accentHover: '#a78bfa' },
  amber: { isDark: true, accent: '#f59e0b', accentHover: '#fbbf24' },
  rose: { isDark: true, accent: '#f43f5e', accentHover: '#fb7185' },
  slate: { isDark: false, accent: '#64748b', accentHover: '#94a3b8' },
}
const theme = themeColors[savedTheme] ?? themeColors.emerald!
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.style.setProperty('--accent', theme.accent)
  document.documentElement.style.setProperty('--accent-hover', theme.accentHover)
  document.documentElement.style.setProperty('--accent-muted', `${theme.accent}1a`)
  document.documentElement.style.setProperty('--accent-border', `${theme.accent}33`)
  document.documentElement.setAttribute('data-theme', theme.isDark ? 'dark' : 'light')
}

// Global Error Handling
const toast = useToastStore()

app.config.errorHandler = (err: any, _instance, info) => {
  console.error('Vue Error:', err, info)
  const message = err.message || String(err)
  if (message.includes('ResizeObserver loop'))
    return
  toast.error(`应用错误: ${message}`)
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  if (reason && typeof reason === 'object' && 'isAxiosError' in reason)
    return
  console.error('Unhandled Rejection:', reason)
  const message = reason?.message || String(reason)
  toast.error(`异步错误: ${message}`)
})

window.onerror = (message, _source, _lineno, _colno, error) => {
  console.error('Global Error:', message, error)
  if (String(message).includes('Script error'))
    return
  toast.error(`系统错误: ${message}`)
}

const appStore = useAppStore()
appStore.fetchTheme()

app.mount('#app')
