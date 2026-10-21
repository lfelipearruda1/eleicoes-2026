import type { Manifest } from '@eleicoes/validation'

import { formatDuration } from './format.ts'

export type FreshnessReference = 'checkedAt' | 'collectedAt'

export interface Freshness {
  reference: FreshnessReference
  referenceAt: string
  ageMs: number | undefined
  state: 'recent' | 'stale' | 'undetermined'
}

export function assessFreshness(
  publication: { manifest: Manifest; snapshot: { collectedAt: string } },
  nowMs: number,
  staleAfterMs: number,
): Freshness {
  const checkedAt = publication.manifest.checkedAt
  const reference = checkedAt === undefined ? 'collectedAt' : 'checkedAt'
  const referenceAt = checkedAt ?? publication.snapshot.collectedAt
  const ageMs = nowMs - Date.parse(referenceAt)
  if (!Number.isFinite(ageMs)) {
    return { reference, referenceAt, ageMs: undefined, state: 'undetermined' }
  }
  if (ageMs < 0) {
    return { reference, referenceAt, ageMs, state: 'undetermined' }
  }
  return {
    reference,
    referenceAt,
    ageMs,
    state: ageMs >= staleAfterMs ? 'stale' : 'recent',
  }
}

export function nextFreshnessChangeAt(
  freshness: Freshness,
  staleAfterMs: number,
): number | undefined {
  if (freshness.ageMs === undefined || freshness.state === 'stale') {
    return undefined
  }
  const referenceMs = Date.parse(freshness.referenceAt)
  return freshness.state === 'recent' ? referenceMs + staleAfterMs : referenceMs
}

export function describeFreshness(
  freshness: Freshness | undefined,
  staleAfterMs: number,
): string | undefined {
  if (!freshness || freshness.state === 'recent') return undefined
  if (freshness.state === 'undetermined') {
    return freshness.ageMs === undefined
      ? 'Não foi possível confirmar a atualidade dos dados.'
      : 'Não foi possível confirmar a atualidade dos dados: o horário de referência está à frente do relógio deste dispositivo.'
  }
  return freshness.reference === 'checkedAt'
    ? 'Sem verificação recente da origem. Exibindo o último resultado disponível.'
    : `A última coleta registrada ocorreu há mais de ${formatDuration(staleAfterMs)}. Não há confirmação de atualização posterior.`
}
