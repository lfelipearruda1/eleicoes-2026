import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef } from 'react'

import logo from '../assets/casa-sarto-logo.png'
import { rememberDismissal, wasDismissedInSession } from '../dismissal.ts'
import styles from './SponsorModal.module.css'

const CASA_SARTO_INSTAGRAM = 'https://www.instagram.com/casasarto.co/'
function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SponsorModal() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open || wasDismissedInSession()) return
    dialog.showModal()
    dialog.focus()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="sponsor-modal-title"
      tabIndex={-1}
      className={styles.dialog}
      onClose={rememberDismissal}
    >
      <div className={styles.cover}>
        <span className={styles.fade} />
        <span className={styles.glow}>
          <img
            src={logo}
            alt="Casa Sarto Perfumaria"
            width={210}
            height={83}
            className={styles.logo}
          />
        </span>
      </div>
      <div className={styles.body}>
        <h2 id="sponsor-modal-title" className={styles.title}>
          Em breve
        </h2>
        <span aria-hidden="true" className={styles.rule} />
        <p className={styles.tagline}>
          Um perfume com alma brasileira e elegância italiana.
        </p>
        <a
          href={CASA_SARTO_INSTAGRAM}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={styles.cta}
        >
          <InstagramIcon />
          Siga nosso Instagram
          <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2.2} />
        </a>
      </div>
      <button
        type="button"
        aria-label="Fechar"
        className={styles.close}
        onClick={() => dialogRef.current?.close()}
      >
        ×
      </button>
    </dialog>
  )
}
