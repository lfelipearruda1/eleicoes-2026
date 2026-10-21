import styles from './UpdateNotice.module.css'

export function UpdateNotice({
  hasAccepted,
  onRetry,
}: {
  hasAccepted: boolean
  onRetry: () => void
}) {
  return (
    <div role="alert" className={styles.notice}>
      <span className={styles.text}>
        {hasAccepted
          ? 'Não foi possível consultar os resultados. Exibindo a última versão válida.'
          : 'Não foi possível carregar os resultados.'}
      </span>
      <button type="button" onClick={onRetry} className={styles.retry}>
        Tentar novamente
      </button>
    </div>
  )
}
