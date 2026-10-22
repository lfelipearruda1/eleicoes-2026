import type { ResultSnapshot } from '@eleicoes/validation'

import { summarizeCandidates, type CandidateSummary } from './candidates.ts'
import type { usePublication } from './hooks/usePublication.ts'
import type { AcceptedPublication } from './publication.ts'
import { RESULT_SOURCES, type ResultSource } from './status.ts'

export interface PublishedDetails {
  source: ResultSource
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

type PublicationViewInput = Pick<PublicationRead, 'accepted' | 'failure'> & {
  governor?: Pick<PublicationRead, 'accepted'>
  photoRoot?: URL
}

function describeDetails({ snapshot }: AcceptedPublication): PublishedDetails {
  return { source: RESULT_SOURCES[snapshot.sourceEnvironment] }
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
    details: describeDetails(accepted),
  }
}
