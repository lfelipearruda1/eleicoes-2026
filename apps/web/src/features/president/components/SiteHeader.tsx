import type { ReactNode } from 'react'

import type { Scope } from '../../map/ufs.ts'
import styles from './SiteHeader.module.css'
import { UfSelect } from './UfSelect.tsx'

interface SiteHeaderProps {
  roundLabel: string | undefined
  scope: Scope
  onShowNational: () => void
  onShowUf: (code: string) => void
  progress: ReactNode
}

export function SiteHeader({
  roundLabel,
  scope,
  onShowNational,
  onShowUf,
  progress,
}: SiteHeaderProps) {
  const isBrasil = scope.kind === 'national'
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
            onClick={onShowNational}
            aria-current={isBrasil ? 'page' : 'false'}
            className={`${styles.brasil} ${isBrasil ? styles.brasilCurrent : ''}`}
          >
            Visão Brasil
          </button>
          <div className={styles.selectSlot}>
            <UfSelect
              scope={scope}
              onShowNational={onShowNational}
              onShowUf={onShowUf}
            />
          </div>
        </div>
      </nav>
      {progress}
    </header>
  )
}
