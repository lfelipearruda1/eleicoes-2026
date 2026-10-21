import { readUfSummarySchema } from '@eleicoes/validation'
import { useMemo } from 'react'

import { useUfRoute } from '../../map/hooks/useUfRoute.ts'
import { MapSection } from '../../map/components/MapSection.tsx'
import { describeUfResults } from '../../map/ufResults.ts'
import { findUf } from '../../map/ufs.ts'
import { summarizeCandidates } from '../candidates.ts'
import { formatClockTime, formatInstant } from '../format.ts'
import { describeFreshness } from '../freshness.ts'
import { usePublication } from '../hooks/usePublication.ts'
import {
  channelSource,
  summarySource,
  type ResultsEndpoint,
} from '../resultsConfig.ts'
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
  pollIntervalMs?: number
  fetcher?: typeof fetch
}

export function PresidentPage({
  endpoint,
  staleAfterMs,
  pollIntervalMs,
  fetcher,
}: PresidentPageProps) {
  const { selected, select } = useUfRoute()
  const uf = findUf(selected)
  const sources = useMemo(() => {
    const code = findUf(selected)?.code
    return {
      national: channelSource(endpoint, 'president', 'BR'),
      summary: summarySource(endpoint),
      president: code && channelSource(endpoint, 'president', code),
      governor: code && channelSource(endpoint, 'governor', code),
    }
  }, [endpoint, selected])
  const national = usePublication({
    source: sources.national,
    staleAfterMs,
    intervalMs: pollIntervalMs,
    fetcher,
  })
  const ufSummary = usePublication({
    source: sources.summary,
    staleAfterMs,
    intervalMs: pollIntervalMs,
    fetcher,
    schema: readUfSummarySchema,
  })
  const ufPresident = usePublication({
    source: sources.president || undefined,
    staleAfterMs,
    intervalMs: pollIntervalMs,
    fetcher,
  })
  const ufGovernor = usePublication({
    source: sources.governor || undefined,
    staleAfterMs,
    intervalMs: pollIntervalMs,
    fetcher,
    stopWhenMissing: true,
  })
  const active = uf ? ufPresident : national
  const { accepted, freshness, isChecking, failure, lastReadAt, refresh } =
    active
  const snapshot = accepted?.snapshot
  const summary = snapshot && summarizeCandidates(snapshot)
  const nationalSnapshot = national.accepted?.snapshot
  const nationalSummary =
    nationalSnapshot && summarizeCandidates(nationalSnapshot)
  const governorSnapshot = uf ? ufGovernor.accepted?.snapshot : undefined
  const status = describeHeaderStatus({
    snapshot,
    ufName: uf?.name,
    isChecking,
    hasFailure: failure !== undefined,
  })

  return (
    <div className={styles.root}>
      <SiteHeader
        roundLabel={nationalSnapshot && ROUND_LABEL[nationalSnapshot.round]}
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
          candidates={nationalSummary?.rows ?? []}
          ufResults={describeUfResults(
            ufSummary.accepted?.snapshot,
            nationalSummary?.rows ?? [],
          )}
          selectedUf={selected}
          onSelectUf={select}
        />
        <ResultsPanel
          uf={uf}
          summary={summary}
          governorSummary={
            governorSnapshot && summarizeCandidates(governorSnapshot)
          }
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
