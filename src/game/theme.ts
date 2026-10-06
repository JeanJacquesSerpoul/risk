import { useEffect, useState } from 'react'
import { type ThemeMode, useGame } from './store'

const query = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Resolved theme ('light' | 'dark'), following the OS when the setting is 'system'. */
export function useResolvedTheme(): 'light' | 'dark' {
  const mode: ThemeMode = useGame((s) => s.settings.theme ?? 'system')
  const [osDark, setOsDark] = useState(() => query().matches)
  useEffect(() => {
    const mq = query()
    const onChange = () => setOsDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mode === 'system' ? (osDark ? 'dark' : 'light') : mode
}

/** Applies the theme to <html data-theme> and the browser UI colour. */
export function useApplyTheme() {
  const theme = useResolvedTheme()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#050b16' : '#e8f0f8')
  }, [theme])
  return theme
}

export const THEME_LABEL: Record<ThemeMode, string> = { system: 'Auto', light: 'Clair', dark: 'Sombre' }
export const nextTheme = (m: ThemeMode): ThemeMode => (m === 'system' ? 'light' : m === 'light' ? 'dark' : 'system')
