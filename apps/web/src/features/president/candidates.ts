import type { PresidentialSnapshot } from '@eleicoes/validation'

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
  note: string | undefined
}

const toneAt = (index: number): CandidateTone =>
  index === 0 ? 'candidate1' : index === 1 ? 'candidate2' : 'other'

const toHundredths = (value: string) => Number(value.replace('.', ''))
const fromHundredths = (value: number) => (value / 100).toFixed(2)

function aheadId(
  snapshot: Extract<PresidentialSnapshot, { availability: 'available' }>,
) {
  const ordered = snapshot.candidates.toSorted((a, b) =>
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
  snapshot: PresidentialSnapshot,
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

  const ahead = aheadId(snapshot)
  let offset = 0
  const segments = snapshot.candidates.map((candidate, index) => {
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
  return {
    rows: snapshot.candidates.map((candidate, index) => ({
      candidateId: candidate.candidateId,
      ballotName: candidate.ballotName,
      tone: toneAt(index),
      percentage: formatPercentage(candidate.contestantVotesPercentage),
      votes: `${formatCount(candidate.votes)} votos`,
      isAhead: candidate.candidateId === ahead,
    })),
    segments,
    note: differenceNote(snapshot.candidates),
  }
}

function differenceNote(
  candidates: { contestantVotesPercentage: string }[],
): string | undefined {
  if (candidates.length !== 2) return undefined
  const [a, b] = candidates.map((c) =>
    toHundredths(c.contestantVotesPercentage),
  )
  if (a === b) return 'Empate nos números apresentados.'
  const difference = formatPercentage(fromHundredths(Math.abs(a - b))).slice(
    0,
    -1,
  )
  return `Diferença de ${difference} p.p. nos votos a candidaturas concorrentes.`
}
