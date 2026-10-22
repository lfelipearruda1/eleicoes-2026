import type { Manifest } from '@eleicoes/validation'

export type FreshnessReference = 'checkedAt' | 'collectedAt'

interface FreshnessReferencePoint {
  reference: FreshnessReference
  referenceAt: string
}

export type Freshness = FreshnessReferencePoint &
  (
    | { state: 'recent'; ageMs: number }
    | { state: 'stale'; ageMs: number }
    | { state: 'undetermined'; cause: 'reference-ahead' | 'invalid-clock' }
  )

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
    return {
      reference,
      referenceAt,
      state: 'undetermined',
      cause: 'invalid-clock',
    }
  }
  if (ageMs < 0) {
    return {
      reference,
      referenceAt,
      state: 'undetermined',
      cause: 'reference-ahead',
    }
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
  const referenceMs = Date.parse(freshness.referenceAt)
  if (freshness.state === 'recent') return referenceMs + staleAfterMs
  if (freshness.state === 'stale' || freshness.cause === 'invalid-clock') {
    return undefined
  }
  return referenceMs
}
