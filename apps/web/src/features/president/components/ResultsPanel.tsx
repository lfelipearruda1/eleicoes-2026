import { REGIONS, type Uf } from '../../map/ufs.ts'
import type { CandidateSummary } from '../candidates.ts'
import { FreshnessNotice } from './FreshnessNotice.tsx'
import { LoadingState } from './LoadingState.tsx'
import { PresidentCard } from './PresidentCard.tsx'
import styles from './ResultsPanel.module.css'
import { UnavailableCard } from './UnavailableCard.tsx'
import { UpdateNotice } from './UpdateNotice.tsx'

interface ResultsPanelProps {
  uf: Uf | undefined
  summary: CandidateSummary | undefined
  provenance: string | undefined
  hasFailure: boolean
  freshnessNotice: string | undefined
  onRetry: () => void
}

export function ResultsPanel({
  uf,
  summary,
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
          <UnavailableCard
            title={`Presidente em ${uf.name}`}
            message="Dados indisponíveis nesta demonstração."
          />
          <UnavailableCard
            separated
            title={`Governador em ${uf.name}`}
            message="Dados de governador indisponíveis nesta demonstração."
          />
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
