import type { CandidateTone } from '../../president/candidates.ts'
import styles from './MapLegend.module.css'

export function MapLegend({
  candidates,
}: {
  candidates: { candidateId: string; ballotName: string; tone: CandidateTone }[]
}) {
  return (
    <ul aria-label="Legenda" className={styles.legend}>
      {candidates.map((candidate) => (
        <li key={candidate.candidateId} className={styles.item}>
          <span
            aria-hidden="true"
            className={`${styles.swatch} ${styles[candidate.tone]}`}
          />
          {candidate.ballotName}
        </li>
      ))}
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
