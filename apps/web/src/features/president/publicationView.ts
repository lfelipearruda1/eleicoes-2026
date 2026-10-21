import type { ResultSnapshot } from '@eleicoes/validation'

import { summarizeCandidates, type CandidateSummary } from './candidates.ts'
import { formatClockTime, formatInstant } from './format.ts'
import type { Freshness } from './freshness.ts'
import type { usePublication } from './hooks/usePublication.ts'
import type { AcceptedPublication } from './publication.ts'
import { PROVENANCE, SOURCE_LABEL } from './status.ts'

export interface PublishedDetails {
  provenance: string
  source: string
  publishedAt: string
  collectedAt: string
  checkedAt?: string
  lastCheck?: string
}

export type PublicationView =
  | { status: 'loading' }
  | { status: 'failed' }
  | {
      status: 'ready'
      summary: CandidateSummary
      governorSummary?: CandidateSummary
      freshness: Freshness
      hasFailure: boolean
      details: PublishedDetails
    }

type PublicationViewInput = Pick<
  ReturnType<typeof usePublication<ResultSnapshot>>,
  'accepted' | 'freshness' | 'failure' | 'lastReadAt'
> & { governor?: ResultSnapshot }

function describeDetails(
  { manifest, snapshot }: AcceptedPublication,
  lastReadAt: Date | undefined,
): PublishedDetails {
  return {
    provenance: PROVENANCE[snapshot.sourceEnvironment],
    source: SOURCE_LABEL[snapshot.sourceEnvironment],
    publishedAt: formatInstant(manifest.current.publishedAt),
    collectedAt: formatInstant(snapshot.collectedAt),
    ...(manifest.checkedAt && { checkedAt: formatInstant(manifest.checkedAt) }),
    ...(lastReadAt && { lastCheck: formatClockTime(lastReadAt) }),
  }
}

export function describePublication(
  input: PublicationViewInput,
): PublicationView {
  const { accepted, freshness } = input
  const hasFailure = input.failure !== undefined
  if (!accepted || !freshness) {
    return { status: hasFailure ? 'failed' : 'loading' }
  }
  return {
    status: 'ready',
    summary: summarizeCandidates(accepted.snapshot),
    ...(input.governor && {
      governorSummary: summarizeCandidates(input.governor),
    }),
    freshness,
    hasFailure,
    details: describeDetails(accepted, input.lastReadAt),
  }
}
