import { readUfSummarySchema } from '@eleicoes/validation'
import { useMemo } from 'react'

import { useUfRoute } from '../../map/hooks/useUfRoute.ts'
import { MapSection } from '../../map/components/MapSection.tsx'
import { describeUfResults } from '../../map/ufResults.ts'
import { scopeName } from '../../map/ufs.ts'
import { summarizeCandidates } from '../candidates.ts'
import { usePublication } from '../hooks/usePublication.ts'
import {
  channelSource,
  summarySource,
  type ResultsEndpoint,
} from '../resultsConfig.ts'
import { describePublication } from '../publicationView.ts'
import { describeHeaderStatus, ROUND_LABEL } from '../status.ts'
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
  const polling = {
    staleAfterMs,
    ...(pollIntervalMs !== undefined && { intervalMs: pollIntervalMs }),
    ...(fetcher && { fetcher }),
  }
  const { scope, showNational, showUf } = useUfRoute()
  const uf = scope.kind === 'uf' ? scope.uf : undefined
  const sources = useMemo(
    () => ({
      national: channelSource(endpoint, 'president', 'BR'),
      summary: summarySource(endpoint),
      president: uf && channelSource(endpoint, 'president', uf.code),
      governor: uf && channelSource(endpoint, 'governor', uf.code),
    }),
    [endpoint, uf],
  )
  const national = usePublication({
    source: sources.national,
    ...polling,
  })
  const ufSummary = usePublication({
    source: sources.summary,
    ...polling,
    schema: readUfSummarySchema,
  })
  const ufPresident = usePublication({
    source: sources.president,
    ...polling,
  })
  const ufGovernor = usePublication({
    source: sources.governor,
    ...polling,
    stopWhenMissing: true,
  })
  const active = uf ? ufPresident : national
  const snapshot = active.accepted?.snapshot
  const nationalSnapshot = national.accepted?.snapshot
  const nationalSummary =
    nationalSnapshot && summarizeCandidates(nationalSnapshot)
  const governor = uf && ufGovernor.accepted?.snapshot
  const view = describePublication({
    ...active,
    ...(governor && { governor }),
  })
  const status = describeHeaderStatus({
    snapshot,
    scopeName: scopeName(scope),
    isChecking: active.isChecking,
    hasFailure: active.failure !== undefined,
  })

  return (
    <div className={styles.root}>
      <SiteHeader
        roundLabel={nationalSnapshot && ROUND_LABEL[nationalSnapshot.round]}
        scope={scope}
        onShowNational={showNational}
        onShowUf={showUf}
        progress={
          <SectionsProgress
            progress={status}
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
          scope={scope}
          onSelectUf={showUf}
        />
        <ResultsPanel
          scope={scope}
          view={view}
          staleAfterMs={staleAfterMs}
          onRetry={active.refresh}
        />
      </main>
      <SiteFooter view={view} />
    </div>
  )
}
