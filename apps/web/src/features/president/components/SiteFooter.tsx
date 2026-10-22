import { ArrowUpRight } from 'lucide-react'

import type { PublicationView } from '../publicationView.ts'
import styles from './SiteFooter.module.css'

export function SiteFooter({ view }: { view: PublicationView }) {
  if (view.status !== 'ready') return <footer className={styles.footer} />
  const { description, site } = view.details.source
  return (
    <footer className={styles.footer}>
      <p className={styles.source}>
        <span className={styles.label}>Fonte:</span> {description}
        {site && (
          <>
            {' · '}
            <a
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {new URL(site).host}
              <ArrowUpRight aria-hidden="true" size={12} strokeWidth={2.2} />
            </a>
          </>
        )}
      </p>
    </footer>
  )
}
