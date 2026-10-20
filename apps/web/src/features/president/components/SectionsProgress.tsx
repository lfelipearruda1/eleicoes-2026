import type { ReactNode } from 'react'

import styles from './SectionsProgress.module.css'

interface SectionsProgressProps {
  percentage: string | undefined
  display: string
  label: string
  status: ReactNode
}

export function SectionsProgress({
  percentage,
  display,
  label,
  status,
}: SectionsProgressProps) {
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
