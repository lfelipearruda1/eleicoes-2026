import type { CandidateSummary } from '../candidates.ts'
import { CandidateAvatar } from './CandidateAvatar.tsx'
import styles from './ResultCard.module.css'
import { SegmentBar } from './SegmentBar.tsx'

export function PresidentCard({ summary }: { summary: CandidateSummary }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Presidente</h2>
      <ul className={styles.rows}>
        {summary.rows.map((row) => (
          <li key={row.candidateId} className={styles.row}>
            <CandidateAvatar tone={row.tone} isAhead={row.isAhead} />
            <div className={styles.info}>
              <span className={styles.name}>{row.ballotName}</span>
              <span className={styles.votes}>{row.votes}</span>
            </div>
            <span className={styles.percentage}>{row.percentage}</span>
          </li>
        ))}
      </ul>
      <SegmentBar
        segments={summary.segments}
        midline={summary.segments.length === 2}
      />
      {summary.note && <p className={styles.note}>{summary.note}</p>}
    </div>
  )
}
