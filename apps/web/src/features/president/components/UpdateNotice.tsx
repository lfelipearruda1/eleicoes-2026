import styles from './UpdateNotice.module.css'

export function UpdateNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className={styles.notice}>
      <span className={styles.text}>
        Não foi possível carregar os resultados.
      </span>
      <button type="button" onClick={onRetry} className={styles.retry}>
        Tentar novamente
      </button>
    </div>
  )
}
