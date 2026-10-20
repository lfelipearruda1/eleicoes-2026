import { Circle, CircleDashed, LoaderCircle } from 'lucide-react'

import styles from './StatusIndicator.module.css'

export type StatusIcon = 'spin' | 'ring' | 'dash' | 'full'

const ICONS = {
  spin: LoaderCircle,
  ring: Circle,
  dash: CircleDashed,
  full: Circle,
} as const

export function StatusIndicator({
  icon,
  text,
}: {
  icon: StatusIcon
  text: string
}) {
  const Icon = ICONS[icon]
  const variant =
    icon === 'spin' ? styles.spin : icon === 'full' ? styles.full : ''
  return (
    <div role="status" aria-live="polite" className={styles.status}>
      <Icon
        aria-hidden="true"
        className={`${styles.icon} ${variant}`}
        strokeWidth={2.5}
      />
      <span>{text}</span>
    </div>
  )
}
