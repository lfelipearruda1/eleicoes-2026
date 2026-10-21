import type { UfSummarySnapshot } from '@eleicoes/validation'

import {
  leadingCandidateId,
  percentageSegments,
  toneAt,
  type BarSegment,
  type CandidateTone,
} from '../president/candidates.ts'
import { formatPercentage } from '../president/format.ts'

export interface UfMapResult {
  tone: CandidateTone | undefined
  undecided: boolean
  description: string
  tooltip: [string] | [string, string]
  values: Record<string, string>
  segments: BarSegment[]
}

type UfEntry = UfSummarySnapshot['ufs'][number]

function describeUf(
  uf: UfEntry,
  names: { candidateId: string; ballotName: string }[],
): UfMapResult {
  if (uf.availability === 'pending') {
    return {
      tone: undefined,
      undecided: false,
      description: 'aguardando votos',
      tooltip: ['Aguardando votos'],
      values: Object.fromEntries(
        uf.candidates.map((candidate) => [candidate.candidateId, '—']),
      ),
      segments: [],
    }
  }
  const leader = leadingCandidateId(uf.candidates)
  const index = uf.candidates.findIndex(
    (candidate) => candidate.candidateId === leader,
  )
  const leading = uf.candidates[index]
  const name = names.find(
    (candidate) => candidate.candidateId === leader,
  )?.ballotName
  const hasVotes = uf.candidates.some((candidate) => candidate.votes !== '0')
  const leadingText =
    leading &&
    `à frente com ${formatPercentage(leading.contestantVotesPercentage)}`
  const undecidedText = hasVotes ? 'empate' : 'sem votos apurados'
  return {
    tone: leading ? toneAt(index) : undefined,
    undecided: !leading,
    description: leading
      ? `${name ?? 'Candidatura'} ${leadingText}`
      : undecidedText,
    tooltip: leadingText
      ? [name ?? 'Candidatura', leadingText]
      : [hasVotes ? 'Empate' : 'Sem votos apurados'],
    values: Object.fromEntries(
      uf.candidates.map((candidate) => [
        candidate.candidateId,
        formatPercentage(candidate.contestantVotesPercentage),
      ]),
    ),
    segments: percentageSegments(uf.candidates),
  }
}

export function describeUfResults(
  summary: UfSummarySnapshot | undefined,
  names: { candidateId: string; ballotName: string }[],
): Record<string, UfMapResult> {
  return Object.fromEntries(
    (summary?.ufs ?? []).map((uf) => [uf.scope, describeUf(uf, names)]),
  )
}
