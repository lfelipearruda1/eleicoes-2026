import type { BarSegment } from '../candidates.ts'
import styles from './SegmentBar.module.css'

interface SegmentBarProps {
  segments: BarSegment[]
  size?: 'regular' | 'thin'
  midline?: boolean
}

export function SegmentBar({
  segments,
  size = 'regular',
  midline = false,
}: SegmentBarProps) {
  return (
    <svg
      aria-hidden="true"
      className={`${styles.bar} ${styles[size]}`}
      preserveAspectRatio="none"
    >
      {segments.map((segment) => (
        <rect
          key={segment.key}
          className={`${styles[segment.tone]} ${segment.dim ? styles.dim : ''}`}
          x={`${segment.start}%`}
          width={`${segment.width}%`}
          height="100%"
        />
      ))}
      {midline && (
        <line className={styles.midline} x1="50%" x2="50%" y1="0" y2="100%" />
      )}
    </svg>
  )
}
