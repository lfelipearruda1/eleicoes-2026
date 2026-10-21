import styles from './UpdateNotice.module.css'

export function FreshnessNotice({ message }: { message: string }) {
  return (
    <div role="status" className={styles.notice}>
      <span className={styles.text}>{message}</span>
    </div>
  )
}
