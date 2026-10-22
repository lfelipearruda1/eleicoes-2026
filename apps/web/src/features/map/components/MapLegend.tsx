import {
  nameWithParty,
  type CandidateTone,
} from '../../president/candidates.ts'
import styles from './MapLegend.module.css'

export function MapLegend({
  candidates,
  showUndecided,
}: {
  candidates: {
    candidateId: string
    ballotName: string
    party?: string
    tone: CandidateTone
  }[]
  showUndecided: boolean
}) {
  return (
    <ul aria-label="Legenda" className={styles.legend}>
      {candidates.map((candidate) => (
        <li key={candidate.candidateId} className={styles.item}>
          <span
            aria-hidden="true"
            className={`${styles.swatch} ${styles[candidate.tone]}`}
          />
          {nameWithParty(candidate)}
        </li>
      ))}
      {showUndecided && (
        <li className={styles.item}>
          <span
            aria-hidden="true"
            className={`${styles.swatch} ${styles.undecided}`}
          />
          Sem candidatura à frente
        </li>
      )}
      <li className={styles.item}>
        <span
          aria-hidden="true"
          className={`${styles.swatch} ${styles.unavailable}`}
        />
        Indisponível
      </li>
    </ul>
  )
}
