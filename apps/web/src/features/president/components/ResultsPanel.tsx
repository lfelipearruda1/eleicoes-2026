import { REGIONS, type Scope } from '../../map/ufs.ts'
import type { PublicationView } from '../publicationView.ts'
import { LoadingState } from './LoadingState.tsx'
import { PresidentCard } from './PresidentCard.tsx'
import styles from './ResultsPanel.module.css'
import { UpdateNotice } from './UpdateNotice.tsx'

interface ResultsPanelProps {
  scope: Scope
  view: PublicationView
  onRetry: () => void
}

type ReadyView = Extract<PublicationView, { status: 'ready' }>

function ReadyResults({ scope, view }: { scope: Scope; view: ReadyView }) {
  if (scope.kind === 'national') {
    return <PresidentCard summary={view.summary} />
  }
  return (
    <>
      <PresidentCard summary={view.summary} />
      {view.governorSummary && (
        <PresidentCard
          separated
          summary={view.governorSummary}
          title="Governador"
        />
      )}
    </>
  )
}

export function ResultsPanel({ scope, view, onRetry }: ResultsPanelProps) {
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
      </div>

      {view.status === 'failed' && <UpdateNotice onRetry={onRetry} />}

      {view.status === 'loading' && <LoadingState />}

      {view.status === 'ready' && <ReadyResults scope={scope} view={view} />}
    </section>
  )
}
