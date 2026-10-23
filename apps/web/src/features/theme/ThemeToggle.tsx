import { Lightbulb, LightbulbOff } from 'lucide-react'
import { useState } from 'react'

import { applyTheme, storedTheme } from './theme.ts'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const [theme, setTheme] = useState(storedTheme)
  const isDark = theme === 'dark'
  const toggle = () => {
    const next = isDark ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }
  const Icon = isDark ? LightbulbOff : Lightbulb
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-pressed={isDark}
      className={styles.toggle}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
    </button>
  )
}
