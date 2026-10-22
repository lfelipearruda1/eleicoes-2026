import { readUfSummarySchema } from '@eleicoes/validation'
import { useMemo, useState } from 'react'

import { useUfRoute } from '../../map/hooks/useUfRoute.ts'
import { MapSection } from '../../map/components/MapSection.tsx'
import { describeUfResults } from '../../map/ufResults.ts'
import { SponsorBanner } from '../../sponsor/components/SponsorBanner.tsx'
import { SponsorModal } from '../../sponsor/components/SponsorModal.tsx'
import { scopeName } from '../../map/ufs.ts'
import { summarizeCandidates } from '../candidates.ts'
import {
  MISSING_CHANNEL_POLL_INTERVAL_MS,
  usePublication,
} from '../hooks/usePublication.ts'
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
    missingIntervalMs: MISSING_CHANNEL_POLL_INTERVAL_MS,
  })
  const active = uf ? ufPresident : national
  const [lastAccepted, setLastAccepted] = useState(active.accepted)
  if (active.accepted && active.accepted !== lastAccepted) {
    setLastAccepted(active.accepted)
  }
  const accepted =
    active.accepted ?? (active.failure === undefined ? lastAccepted : undefined)
  const snapshot = accepted?.snapshot
  const nationalSnapshot = national.accepted?.snapshot
  const nationalSummary =
    nationalSnapshot && summarizeCandidates(nationalSnapshot)
  const isGovernorLoading =
    uf !== undefined && !ufGovernor.accepted && ufGovernor.failure === undefined
  const liveGovernor = uf && ufGovernor.accepted
  const [shownGovernor, setShownGovernor] = useState(liveGovernor)
  const governor =
    liveGovernor || (isGovernorLoading ? shownGovernor : undefined)
  if (governor !== shownGovernor) setShownGovernor(governor)
  const view = describePublication({
    ...active,
    accepted,
    photoRoot: endpoint.root,
    ...(governor && { governor: { accepted: governor } }),
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
        progress={
          <>
            <SponsorBanner />
            <SectionsProgress
              progress={status}
              status={
                <StatusIndicator
                  icon={status.icon}
                  text={status.text}
                  blinking={status.blinking}
                />
              }
            />
          </>
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
          onShowNational={showNational}
        />
        <ResultsPanel scope={scope} view={view} onRetry={active.refresh} />
      </main>
      <SiteFooter view={view} />
      <SponsorModal />
    </div>
  )
}
