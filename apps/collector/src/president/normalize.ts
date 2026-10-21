import type { ResultSnapshot } from '@eleicoes/validation'

import { CollectorError } from '../error.js'
import type { ResultSummary } from '../tse/ea20.js'

export interface NormalizationContext {
  dataVersion: string
  sourceEnvironment: 'official' | 'synthetic'
  collectedAt: string
  sourceFile: string
}

const toPercentage = (value: string) => value.replace(',', '.')

function checkContradictions(summary: ResultSummary): void {
  if (BigInt(summary.sections.totalized) > BigInt(summary.sections.total)) {
    throw new CollectorError('TSE_RESULT_CONTRADICTION', 's.st maior que s.ts')
  }
  if (
    summary.totalizationStatus === 'not_started' &&
    (summary.sections.totalized !== '0' || summary.votes.total !== '0')
  ) {
    throw new CollectorError(
      'TSE_RESULT_CONTRADICTION',
      'and "n" com seções totalizadas ou votos',
    )
  }
}

export function decidePendingReason(summary: ResultSummary) {
  if (!summary.votesReleased) return 'votes_not_released' as const
  if (summary.totalizationStatus === 'not_started') {
    return 'totalization_not_started' as const
  }
  return undefined
}

export function normalizeResult(
  summary: ResultSummary,
  context: NormalizationContext,
): ResultSnapshot {
  checkContradictions(summary)
  const candidates = summary.candidates.toSorted((a, b) =>
    a.candidateId < b.candidateId ? -1 : 1,
  )
  const common = {
    contractVersion: 1 as const,
    dataVersion: context.dataVersion,
    environment: 'local' as const,
    sourceEnvironment: context.sourceEnvironment,
    round: summary.round as 1 | 2,
    office: summary.office,
    scope: summary.scope.toUpperCase() as ResultSnapshot['scope'],
    collectedAt: context.collectedAt,
    source: { file: context.sourceFile },
    votesReleased: summary.votesReleased,
    totalization: {
      status: summary.totalizationStatus,
      finalIndicator: summary.finalIndicator,
    },
    sections: {
      total: summary.sections.total,
      totalized: summary.sections.totalized,
      totalizedPercentage: toPercentage(summary.sections.totalizedPercent),
    },
    origin: {
      electionCode: summary.election,
      generationId: summary.generation.id,
      generatedAt: {
        date: summary.generation.date,
        time: summary.generation.time,
      },
      ...(summary.totalizedAt && { totalizedAt: summary.totalizedAt }),
    },
  }
  const pendingReason = decidePendingReason(summary)
  if (pendingReason) {
    return {
      ...common,
      availability: 'pending',
      pendingReason,
      candidates: candidates.map(({ candidateId, number, ballotName }) => ({
        candidateId,
        number,
        ballotName,
      })),
    }
  }
  return {
    ...common,
    availability: 'available',
    votes: summary.votes,
    candidates: candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      number: candidate.number,
      ballotName: candidate.ballotName,
      votes: candidate.votes,
      contestantVotesPercentage: toPercentage(candidate.contestantVotesPercent),
      ...(candidate.voteDestination && {
        voteDestination: candidate.voteDestination,
      }),
    })),
  }
}
