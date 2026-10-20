import type { ReactNode } from 'react'

import styles from './SiteHeader.module.css'
import { UfSelect } from './UfSelect.tsx'

interface SiteHeaderProps {
  roundLabel: string | undefined
  selectedUf: string | undefined
  onSelectUf: (code: string | undefined) => void
  progress: ReactNode
}

export function SiteHeader({
  roundLabel,
  selectedUf,
  onSelectUf,
  progress,
}: SiteHeaderProps) {
  const isBrasil = selectedUf === undefined
  return (
    <header className={styles.header}>
      <nav aria-label="Principal" className={styles.nav}>
        <a href="#/" className={styles.brand}>
          <span className={styles.brandName}>Eleições 2026</span>
          {roundLabel && (
            <span className={styles.brandRound}>{roundLabel}</span>
          )}
        </a>
        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => onSelectUf(undefined)}
            aria-current={isBrasil ? 'page' : 'false'}
            className={`${styles.brasil} ${isBrasil ? styles.brasilCurrent : ''}`}
          >
            Visão Brasil
          </button>
          <div className={styles.selectSlot}>
            <UfSelect selectedUf={selectedUf} onSelectUf={onSelectUf} />
          </div>
        </div>
      </nav>
      {progress}
    </header>
  )
}
