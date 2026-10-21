import { REGIONS, type Scope } from '../../map/ufs.ts'
import type { PublicationView } from '../publicationView.ts'
import { FreshnessNotice } from './FreshnessNotice.tsx'
import { LoadingState } from './LoadingState.tsx'
import { PresidentCard } from './PresidentCard.tsx'
import styles from './ResultsPanel.module.css'
import { UpdateNotice } from './UpdateNotice.tsx'

interface ResultsPanelProps {
  scope: Scope
  view: PublicationView
  staleAfterMs: number
  onRetry: () => void
}

type ReadyView = Extract<PublicationView, { status: 'ready' }>

function ReadyResults({ scope, view }: { scope: Scope; view: ReadyView }) {
  if (scope.kind === 'national') {
    return (
      <>
        <PresidentCard summary={view.summary} />
        <p className={styles.hint}>
          Selecione uma UF no mapa, na lista ou no seletor para ver o resultado
          local e, quando houver, o 2º turno para governador.
        </p>
      </>
    )
  }
  return (
    <>
      <PresidentCard
        summary={view.summary}
        title={`Presidente em ${scope.uf.name}`}
      />
      {view.governorSummary && (
        <PresidentCard
          separated
          summary={view.governorSummary}
          title={`Governador em ${scope.uf.name}`}
        />
      )}
    </>
  )
}

export function ResultsPanel({
  scope,
  view,
  staleAfterMs,
  onRetry,
}: ResultsPanelProps) {
  return (
    <section aria-labelledby="ctx-title" className={styles.panel}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>
          {scope.kind === 'uf'
            ? `${REGIONS[scope.uf.region]} · ${scope.uf.code}`
            : 'Resultado nacional'}
        </span>
        <h1 id="ctx-title" className={styles.title}>
          {scope.kind === 'uf' ? scope.uf.name : 'Brasil'}
        </h1>
        {view.status === 'ready' && (
          <p className={styles.provenance}>{view.details.provenance}</p>
        )}
      </div>

      {view.status === 'failed' && (
        <UpdateNotice hasAccepted={false} onRetry={onRetry} />
      )}

      {view.status === 'loading' && <LoadingState />}

      {view.status === 'ready' && (
        <>
          {view.hasFailure && (
            <UpdateNotice hasAccepted={true} onRetry={onRetry} />
          )}
          <FreshnessNotice
            freshness={view.freshness}
            staleAfterMs={staleAfterMs}
          />
          <ReadyResults scope={scope} view={view} />
        </>
      )}
    </section>
  )
}
