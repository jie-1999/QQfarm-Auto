import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import api from '@/api'

const THEME_KEY = 'ui_theme'

export type Theme = 'emerald' | 'ocean' | 'violet' | 'amber' | 'rose' | 'slate'

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(false)
  const currentTheme = ref<Theme>((localStorage.getItem(THEME_KEY) as Theme) || 'emerald')
  const showThemePanel = ref(false)

  const themes: Record<Theme, {
    name: string
    isDark: boolean
    icon: string
    accent: string
    accentHover: string
  }> = {
    emerald: {
      name: '翠绿',
      isDark: true,
      icon: 'i-carbon-leaf',
      accent: '#10b981',
      accentHover: '#34d399',
    },
    ocean: {
      name: '深海',
      isDark: true,
      icon: 'i-carbon-wave',
      accent: '#3b82f6',
      accentHover: '#60a5fa',
    },
    violet: {
      name: '紫罗兰',
      isDark: true,
      icon: 'i-carbon-crown',
      accent: '#8b5cf6',
      accentHover: '#a78bfa',
    },
    amber: {
      name: '暖阳',
      isDark: true,
      icon: 'i-carbon-sun',
      accent: '#f59e0b',
      accentHover: '#fbbf24',
    },
    rose: {
      name: '玫瑰',
      isDark: true,
      icon: 'i-carbon-favorite',
      accent: '#f43f5e',
      accentHover: '#fb7185',
    },
    slate: {
      name: '极简',
      isDark: false,
      icon: 'i-carbon-color-palette',
      accent: '#64748b',
      accentHover: '#94a3b8',
    },
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  function openSidebar() {
    sidebarOpen.value = true
  }

  async function fetchTheme() {
    try {
      const res = await api.get('/api/settings')
      if (res.data.ok && res.data.data.ui?.theme) {
        // Server theme preference (optional)
      }
    }
    catch {
      // Silently fail when not logged in
    }
  }

  function applyTheme(theme: Theme) {
    if (!themes[theme]) {
      theme = 'emerald'
    }

    const t = themes[theme]
    currentTheme.value = theme
    localStorage.setItem(THEME_KEY, theme)

    if (typeof document !== 'undefined' && document.documentElement) {
      const root = document.documentElement

      // Set accent colors
      root.style.setProperty('--accent', t.accent)
      root.style.setProperty('--accent-hover', t.accentHover)
      root.style.setProperty('--accent-muted', `${t.accent}1a`)
      root.style.setProperty('--accent-border', `${t.accent}33`)

      // Toggle data-theme for light/dark
      if (t.isDark) {
        root.setAttribute('data-theme', 'dark')
      }
      else {
        root.setAttribute('data-theme', 'light')
      }
    }
  }

  function toggleThemePanel() {
    showThemePanel.value = !showThemePanel.value
  }

  const isDark = computed(() => themes[currentTheme.value]?.isDark ?? true)

  watch(currentTheme, (val) => {
    applyTheme(val)
  })

  applyTheme(currentTheme.value)

  return {
    sidebarOpen,
    isDark,
    currentTheme,
    showThemePanel,
    themes,
    applyTheme,
    toggleThemePanel,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    fetchTheme,
  }
})
