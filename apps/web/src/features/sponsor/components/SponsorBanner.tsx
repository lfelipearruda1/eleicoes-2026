import '@fontsource/cormorant-garamond/latin-400.css'
import { ArrowUpRight } from 'lucide-react'

import logo from '../assets/casa-sarto-logo.png'
import styles from './SponsorBanner.module.css'

const CASA_SARTO_INSTAGRAM = 'https://www.instagram.com/casasarto.co/'

export function SponsorBanner() {
  return (
    <aside aria-label="Publicidade" className={styles.slot}>
      <div className={styles.banner}>
        <img
          src={logo}
          alt="Casa Sarto Perfumaria"
          width={150}
          height={59}
          className={styles.logo}
        />
        <span className={styles.tagline}>
          Um perfume com alma brasileira e elegância italiana.
        </span>
        <a
          href={CASA_SARTO_INSTAGRAM}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label="Clique aqui: Instagram da Casa Sarto (abre em nova aba)"
          className={styles.cta}
        >
          Clique aqui
          <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2.2} />
        </a>
      </div>
    </aside>
  )
}
