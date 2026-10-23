import { nameWithParty } from '../../president/candidates.ts'
import { SegmentBar } from '../../president/components/SegmentBar.tsx'
import type { UfMapResult } from '../ufResults.ts'
import { isSelectedUf, UFS, type Scope } from '../ufs.ts'
import styles from './UfList.module.css'

interface UfListProps {
  candidateNames: {
    candidateId: string
    ballotName: string
    party?: string
  }[]
  results: Record<string, UfMapResult>
  scope: Scope
  onSelectUf: (code: string) => void
}

export function UfList({
  candidateNames,
  results,
  scope,
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
            className={styles.candidateName}
          >
            {nameWithParty(candidate)}
          </span>
        ))}
      </div>
      {UFS.map((uf) => (
        <button
          key={uf.code}
          type="button"
          role="row"
          aria-label={`${uf.name}: ${results[uf.code]?.description ?? 'dados indisponíveis'}`}
          onClick={() => onSelectUf(uf.code)}
          className={`${styles.row} ${isSelectedUf(scope, uf.code) ? styles.rowSelected : ''}`}
        >
          <span className={styles.code}>{uf.code}</span>
          <span className={styles.name}>{uf.name}</span>
          <span className={styles.barCell}>
            <SegmentBar
              size="thin"
              segments={results[uf.code]?.segments ?? []}
            />
          </span>
          {candidateNames.map((candidate) => (
            <span key={candidate.candidateId} className={styles.value}>
              {results[uf.code]?.values[candidate.candidateId] ?? 'Indisp.'}
            </span>
          ))}
        </button>
      ))}
    </div>
  )
}
