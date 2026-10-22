import { useState } from 'react'

import styles from './CandidateAvatar.module.css'

export function CandidateAvatar({
  isAhead,
  photoUrl,
}: {
  isAhead: boolean
  photoUrl?: string
}) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const showsPhoto = photoUrl !== undefined && photoUrl !== failedUrl
  return (
    <span
      aria-hidden="true"
      className={`${styles.ring} ${isAhead ? styles.ahead : ''}`}
    >
      {isAhead && <span className={styles.inner} />}
      {showsPhoto && (
        <img
          src={photoUrl}
          alt=""
          decoding="async"
          className={styles.photo}
          onError={() => setFailedUrl(photoUrl)}
        />
      )}
    </span>
  )
}
