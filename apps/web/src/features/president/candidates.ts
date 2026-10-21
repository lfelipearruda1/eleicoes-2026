import type { ResultSnapshot } from '@eleicoes/validation'

import { formatCount, formatPercentage } from './format.ts'

export type CandidateTone = 'candidate1' | 'candidate2' | 'other'

export interface CandidateRow {
  candidateId: string
  ballotName: string
  tone: CandidateTone
  percentage: string
  votes: string
  isAhead: boolean
}

export interface BarSegment {
  key: string
  tone: CandidateTone
  start: string
  width: string
  dim: boolean
}

export interface CandidateSummary {
  rows: CandidateRow[]
  segments: BarSegment[]
  note: string
}

type AvailableSnapshot = Extract<ResultSnapshot, { availability: 'available' }>
type VoteDestination = NonNullable<
  AvailableSnapshot['candidates'][number]['voteDestination']
>

const VOTES_LABEL: Record<VoteDestination, string> = {
  valid: 'votos válidos',
  valid_party: 'votos válidos (legenda)',
  annulled: 'votos anulados',
  annulled_sub_judice: 'votos anulados sub judice',
}

const isAnnulled = (destination: VoteDestination | undefined) =>
  destination === 'annulled' || destination === 'annulled_sub_judice'

interface VotedCandidate {
  candidateId: string
  votes: string
  contestantVotesPercentage: string
  voteDestination?: VoteDestination
}

export const toneAt = (index: number): CandidateTone =>
  index === 0 ? 'candidate1' : index === 1 ? 'candidate2' : 'other'

const toHundredths = (value: string) => Number(value.replace('.', ''))
const fromHundredths = (value: number) => (value / 100).toFixed(2)

export function leadingCandidateId(candidates: VotedCandidate[]) {
  const ordered = candidates
    .filter((candidate) => !isAnnulled(candidate.voteDestination))
    .toSorted((a, b) =>
      BigInt(b.votes) > BigInt(a.votes)
        ? 1
        : BigInt(b.votes) < BigInt(a.votes)
          ? -1
          : 0,
    )
  const [first, second] = ordered
  if (!first || BigInt(first.votes) === 0n) return undefined
  if (second && BigInt(second.votes) === BigInt(first.votes)) return undefined
  return first.candidateId
}

export function summarizeCandidates(
  snapshot: ResultSnapshot,
): CandidateSummary {
  if (snapshot.availability === 'pending') {
    const share = snapshot.candidates.length
      ? Math.floor(10000 / snapshot.candidates.length)
      : 0
    return {
      rows: snapshot.candidates.map((candidate, index) => ({
        candidateId: candidate.candidateId,
        ballotName: candidate.ballotName,
        tone: toneAt(index),
        percentage: '—',
        votes: 'Aguardando votos',
        isAhead: false,
      })),
      segments: snapshot.candidates.map((candidate, index) => ({
        key: candidate.candidateId,
        tone: toneAt(index),
        start: fromHundredths(share * index),
        width: fromHundredths(share),
        dim: true,
      })),
      note: 'Os percentuais aparecem quando houver votos apurados.',
    }
  }

  const ahead = leadingCandidateId(snapshot.candidates)
  return {
    rows: snapshot.candidates.map((candidate, index) => ({
      candidateId: candidate.candidateId,
      ballotName: candidate.ballotName,
      tone: toneAt(index),
      percentage: formatPercentage(candidate.contestantVotesPercentage),
      votes: `${formatCount(candidate.votes)} ${
        candidate.voteDestination
          ? VOTES_LABEL[candidate.voteDestination]
          : 'votos'
      }`,
      isAhead: candidate.candidateId === ahead,
    })),
    segments: percentageSegments(snapshot.candidates),
    note: differenceNote(snapshot.candidates),
  }
}

export function percentageSegments(candidates: VotedCandidate[]): BarSegment[] {
  let offset = 0
  return candidates.map((candidate, index) => {
    const width = toHundredths(candidate.contestantVotesPercentage)
    const segment = {
      key: candidate.candidateId,
      tone: toneAt(index),
      start: fromHundredths(offset),
      width: fromHundredths(width),
      dim: false,
    }
    offset += width
    return segment
  })
}

const PERCENTAGE_BASE =
  'Percentuais sobre os votos a candidaturas concorrentes.'

function differenceNote(
  candidates: { contestantVotesPercentage: string }[],
): string {
  if (candidates.length !== 2) return PERCENTAGE_BASE
  const [a, b] = candidates.map((c) =>
    toHundredths(c.contestantVotesPercentage),
  )
  if (a === b) return `${PERCENTAGE_BASE} Empate nos números apresentados.`
  const difference = formatPercentage(fromHundredths(Math.abs(a - b))).slice(
    0,
    -1,
  )
  return `${PERCENTAGE_BASE} Diferença de ${difference} p.p.`
}
