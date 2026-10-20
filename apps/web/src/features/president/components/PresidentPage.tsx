import { useUfRoute } from '../../map/hooks/useUfRoute.ts'
import { MapSection } from '../../map/components/MapSection.tsx'
import { findUf } from '../../map/ufs.ts'
import { summarizeCandidates } from '../candidates.ts'
import { formatClockTime } from '../format.ts'
import { usePublication } from '../hooks/usePublication.ts'
import {
  describeHeaderStatus,
  PROVENANCE,
  ROUND_LABEL,
  SOURCE_LABEL,
} from '../status.ts'
import styles from './PresidentPage.module.css'
import { ResultsPanel } from './ResultsPanel.tsx'
import { SectionsProgress } from './SectionsProgress.tsx'
import { SiteFooter } from './SiteFooter.tsx'
import { SiteHeader } from './SiteHeader.tsx'
import { StatusIndicator } from './StatusIndicator.tsx'

export function PresidentPage({ fetcher }: { fetcher?: typeof fetch }) {
  const { accepted, isChecking, failure, lastReadAt, refresh } = usePublication(
    { fetcher },
  )
  const { selected, select } = useUfRoute()
  const snapshot = accepted?.snapshot
  const uf = findUf(selected)
  const summary = snapshot && summarizeCandidates(snapshot)
  const status = describeHeaderStatus({
    snapshot,
    ufName: uf?.name,
    isChecking,
    hasFailure: failure !== undefined,
  })

  return (
    <div className={styles.root}>
      <SiteHeader
        roundLabel={snapshot && ROUND_LABEL[snapshot.round]}
        selectedUf={selected}
        onSelectUf={select}
        progress={
          <SectionsProgress
            percentage={status.percentage}
            display={status.display}
            label={status.label}
            status={<StatusIndicator icon={status.icon} text={status.text} />}
          />
        }
      />
      <main className={styles.main}>
        <MapSection
          candidates={summary?.rows ?? []}
          selectedUf={selected}
          onSelectUf={select}
        />
        <ResultsPanel
          uf={uf}
          summary={summary}
          hasFailure={failure !== undefined}
          onRetry={refresh}
        />
      </main>
      <SiteFooter
        provenance={snapshot && PROVENANCE[snapshot.sourceEnvironment]}
        source={snapshot && SOURCE_LABEL[snapshot.sourceEnvironment]}
        lastCheck={lastReadAt && formatClockTime(lastReadAt)}
      />
    </div>
  )
}
