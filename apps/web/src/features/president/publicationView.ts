import type { ResultSnapshot } from '@eleicoes/validation'

import { summarizeCandidates, type CandidateSummary } from './candidates.ts'
import { formatClockTime, formatInstant } from './format.ts'
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
      details: PublishedDetails
    }

type PublicationRead = ReturnType<typeof usePublication<ResultSnapshot>>

type PublicationViewInput = Pick<
  PublicationRead,
  'accepted' | 'failure' | 'lastReadAt'
> & { governor?: Pick<PublicationRead, 'accepted'>; photoRoot?: URL }

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
  const { accepted } = input
  const governor = input.governor?.accepted?.snapshot
  if (!accepted) {
    return { status: input.failure === undefined ? 'loading' : 'failed' }
  }
  return {
    status: 'ready',
    summary: summarizeCandidates(accepted.snapshot, input.photoRoot),
    ...(governor && {
      governorSummary: summarizeCandidates(governor, input.photoRoot),
    }),
    details: describeDetails(accepted, input.lastReadAt),
  }
}
