import { describeFreshness, type Freshness } from '../freshness.ts'
import styles from './UpdateNotice.module.css'

export function FreshnessNotice({
  freshness,
  staleAfterMs,
}: {
  freshness: Freshness
  staleAfterMs: number
}) {
  if (freshness.state === 'recent') return null
  return (
    <div role="status" className={styles.notice}>
      <span className={styles.text}>
        {describeFreshness(freshness, staleAfterMs)}
      </span>
    </div>
  )
}
