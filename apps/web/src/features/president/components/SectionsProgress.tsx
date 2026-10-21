import type { ReactNode } from 'react'

import type { HeaderStatus } from '../status.ts'
import styles from './SectionsProgress.module.css'

interface SectionsProgressProps {
  progress: Pick<HeaderStatus, 'percentage' | 'display' | 'label'>
  status: ReactNode
}

export function SectionsProgress({ progress, status }: SectionsProgressProps) {
  const { percentage, display, label } = progress
  return (
    <div role="region" aria-label="Seções apuradas" className={styles.region}>
      <div className={styles.row}>
        <div className={styles.summary}>
          <span className={styles.percentage}>{display}</span>
          <span className={styles.label}>{label}</span>
        </div>
        {status}
      </div>
      <svg
        role="progressbar"
        aria-label={percentage ? `Seções apuradas: ${display}` : label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage ? Number(percentage) : 0}
        className={styles.track}
        preserveAspectRatio="none"
      >
        <rect
          className={styles.fill}
          height="100%"
          width={`${percentage ?? 0}%`}
        />
      </svg>
    </div>
  )
}
