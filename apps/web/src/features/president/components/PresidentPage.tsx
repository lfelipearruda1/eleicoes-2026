import { useUfRoute } from '../../map/hooks/useUfRoute.ts'
import { MapSection } from '../../map/components/MapSection.tsx'
import { findUf } from '../../map/ufs.ts'
import { summarizeCandidates } from '../candidates.ts'
import { formatClockTime, formatInstant } from '../format.ts'
import { describeFreshness } from '../freshness.ts'
import { usePublication } from '../hooks/usePublication.ts'
import type { ResultsEndpoint } from '../resultsConfig.ts'
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

interface PresidentPageProps {
  endpoint: ResultsEndpoint
  staleAfterMs: number
  fetcher?: typeof fetch
}

export function PresidentPage({
  endpoint,
  staleAfterMs,
  fetcher,
}: PresidentPageProps) {
  const { accepted, freshness, isChecking, failure, lastReadAt, refresh } =
    usePublication({ endpoint, staleAfterMs, fetcher })
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
          provenance={snapshot && PROVENANCE[snapshot.sourceEnvironment]}
          hasFailure={failure !== undefined}
          freshnessNotice={describeFreshness(freshness, staleAfterMs)}
          onRetry={refresh}
        />
      </main>
      <SiteFooter
        provenance={snapshot && PROVENANCE[snapshot.sourceEnvironment]}
        source={snapshot && SOURCE_LABEL[snapshot.sourceEnvironment]}
        publishedAt={
          accepted && formatInstant(accepted.manifest.current.publishedAt)
        }
        collectedAt={snapshot && formatInstant(snapshot.collectedAt)}
        checkedAt={
          accepted?.manifest.checkedAt &&
          formatInstant(accepted.manifest.checkedAt)
        }
        lastCheck={lastReadAt && formatClockTime(lastReadAt)}
      />
    </div>
  )
}
