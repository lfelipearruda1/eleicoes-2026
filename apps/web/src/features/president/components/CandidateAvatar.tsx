import type { CandidateTone } from '../candidates.ts'
import styles from './CandidateAvatar.module.css'

export function CandidateAvatar({
  tone,
  isAhead,
}: {
  tone: CandidateTone
  isAhead: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.ring} ${styles[tone]} ${isAhead ? styles.ahead : ''}`}
    >
      {isAhead && <span className={styles.inner} />}
    </span>
  )
}
