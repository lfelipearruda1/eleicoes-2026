import type { MouseEvent, ReactNode } from 'react'

import styles from './SiteHeader.module.css'

interface SiteHeaderProps {
  roundLabel: string | undefined
  progress: ReactNode
  onShowNational: () => void
}

export function SiteHeader({
  roundLabel,
  progress,
  onShowNational,
}: SiteHeaderProps) {
  const showNational = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    onShowNational()
  }
  return (
    <>
      <header className={styles.header}>
        <nav aria-label="Principal" className={styles.nav}>
          <a href="/" onClick={showNational} className={styles.brand}>
            <span className={styles.brandName}>Eleições Brasil 2026</span>
            {roundLabel && (
              <span className={styles.brandRound}>{roundLabel}</span>
            )}
          </a>
        </nav>
      </header>
      <div className={styles.scrolling}>{progress}</div>
    </>
  )
}
