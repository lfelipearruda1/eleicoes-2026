import type { PublicationView } from '../publicationView.ts'
import styles from './SiteFooter.module.css'

export function SiteFooter({ view }: { view: PublicationView }) {
  if (view.status !== 'ready') return <footer className={styles.footer} />
  const { details } = view
  return (
    <footer className={styles.footer}>
      <span>{details.provenance}</span>
      <span>
        Publicação: {details.publishedAt} · Coleta: {details.collectedAt}
        {details.checkedAt && ` · Verificação da origem: ${details.checkedAt}`}
      </span>
      <span>
        Fonte: {details.source}
        {details.lastCheck &&
          ` · Última leitura pelo navegador: ${details.lastCheck}`}
      </span>
    </footer>
  )
}
