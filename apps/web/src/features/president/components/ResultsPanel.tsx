import { REGIONS, type Uf } from '../../map/ufs.ts'
import type { CandidateSummary } from '../candidates.ts'
import { FreshnessNotice } from './FreshnessNotice.tsx'
import { LoadingState } from './LoadingState.tsx'
import { PresidentCard } from './PresidentCard.tsx'
import styles from './ResultsPanel.module.css'
import { UpdateNotice } from './UpdateNotice.tsx'

interface ResultsPanelProps {
  uf: Uf | undefined
  summary: CandidateSummary | undefined
  governorSummary: CandidateSummary | undefined
  provenance: string | undefined
  hasFailure: boolean
  freshnessNotice: string | undefined
  onRetry: () => void
}

export function ResultsPanel({
  uf,
  summary,
  governorSummary,
  provenance,
  hasFailure,
  freshnessNotice,
  onRetry,
}: ResultsPanelProps) {
  return (
    <section aria-labelledby="ctx-title" className={styles.panel}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>
          {uf ? `${REGIONS[uf.region]} · ${uf.code}` : 'Resultado nacional'}
        </span>
        <h1 id="ctx-title" className={styles.title}>
          {uf ? uf.name : 'Brasil'}
        </h1>
        {provenance && <p className={styles.provenance}>{provenance}</p>}
      </div>

      {hasFailure && (
        <UpdateNotice hasAccepted={summary !== undefined} onRetry={onRetry} />
      )}

      {summary && freshnessNotice && (
        <FreshnessNotice message={freshnessNotice} />
      )}

      {!summary && !hasFailure && <LoadingState />}

      {summary && uf && (
        <>
          <PresidentCard summary={summary} title={`Presidente em ${uf.name}`} />
          {governorSummary && (
            <PresidentCard
              separated
              summary={governorSummary}
              title={`Governador em ${uf.name}`}
            />
          )}
        </>
      )}

      {summary && !uf && (
        <>
          <PresidentCard summary={summary} />
          <p className={styles.hint}>
            Selecione uma UF no mapa, na lista ou no seletor para ver o
            resultado local e, quando houver, o 2º turno para governador.
          </p>
        </>
      )}
    </section>
  )
}
