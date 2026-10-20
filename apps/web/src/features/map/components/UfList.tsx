import { SegmentBar } from '../../president/components/SegmentBar.tsx'
import { UFS } from '../ufs.ts'
import styles from './UfList.module.css'

interface UfListProps {
  candidateNames: { candidateId: string; ballotName: string }[]
  selectedUf: string | undefined
  onSelectUf: (code: string) => void
}

export function UfList({
  candidateNames,
  selectedUf,
  onSelectUf,
}: UfListProps) {
  return (
    <div
      role="table"
      aria-label="Resultado presidencial por UF"
      className={styles.table}
    >
      <div role="row" className={styles.header}>
        <span role="columnheader">UF</span>
        <span role="columnheader" />
        <span role="columnheader" className={styles.barCell} />
        {candidateNames.map((candidate) => (
          <span
            key={candidate.candidateId}
            role="columnheader"
            className={styles.value}
          >
            {candidate.ballotName}
          </span>
        ))}
      </div>
      {UFS.map((uf) => (
        <button
          key={uf.code}
          type="button"
          role="row"
          aria-label={`${uf.name}: dados indisponíveis`}
          onClick={() => onSelectUf(uf.code)}
          className={`${styles.row} ${uf.code === selectedUf ? styles.rowSelected : ''}`}
        >
          <span className={styles.code}>{uf.code}</span>
          <span className={styles.name}>{uf.name}</span>
          <span className={styles.barCell}>
            <SegmentBar size="thin" segments={[]} />
          </span>
          {candidateNames.map((candidate) => (
            <span key={candidate.candidateId} className={styles.value}>
              Indisp.
            </span>
          ))}
        </button>
      ))}
    </div>
  )
}
