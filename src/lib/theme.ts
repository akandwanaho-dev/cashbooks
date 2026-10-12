export type Theme = 'light' | 'dark' | 'system'
const THEME_KEY = 'cashbook.theme'
export const THEME_EVENT = 'cashbook-theme-change'

export function getTheme(): Theme {
  try {
    return (localStorage.getItem(THEME_KEY) as Theme | null) || 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* Theme still applies when storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }))
}
