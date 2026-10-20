import styles from './SiteFooter.module.css'

interface SiteFooterProps {
  provenance: string | undefined
  source: string | undefined
  lastCheck: string | undefined
}

export function SiteFooter({ provenance, source, lastCheck }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <span>{provenance}</span>
      {source && (
        <span>
          Fonte: {source}
          {lastCheck && ` · Última verificação: ${lastCheck}`}
        </span>
      )}
    </footer>
  )
}
