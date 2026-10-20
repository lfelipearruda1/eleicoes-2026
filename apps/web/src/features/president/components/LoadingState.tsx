import styles from './LoadingState.module.css'

export function LoadingState() {
  return (
    <div aria-busy="true" className={styles.loading}>
      <span className={styles.text}>Carregando resultados…</span>
      <div className={`${styles.pill} ${styles.wide}`} />
      <div className={`${styles.pill} ${styles.medium}`} />
      <div className={styles.bar} />
    </div>
  )
}
