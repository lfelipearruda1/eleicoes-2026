export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'eleicoes:tema'

export function storedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    return
  }
}
