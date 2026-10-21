import styles from './SiteFooter.module.css'

interface SiteFooterProps {
  provenance: string | undefined
  source: string | undefined
  publishedAt: string | undefined
  collectedAt: string | undefined
  checkedAt: string | undefined
  lastCheck: string | undefined
}

export function SiteFooter({
  provenance,
  source,
  publishedAt,
  collectedAt,
  checkedAt,
  lastCheck,
}: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <span>{provenance}</span>
      {publishedAt && collectedAt && (
        <span>
          Publicação: {publishedAt} · Coleta: {collectedAt}
          {checkedAt && ` · Verificação da origem: ${checkedAt}`}
        </span>
      )}
      {source && (
        <span>
          Fonte: {source}
          {lastCheck && ` · Última leitura pelo navegador: ${lastCheck}`}
        </span>
      )}
    </footer>
  )
}
