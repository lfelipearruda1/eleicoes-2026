import { describe, expect, it } from 'vitest'

import {
  assessFreshness,
  nextFreshnessChangeAt,
} from '../../src/features/president/freshness.ts'
import type { AcceptedPublication } from '../../src/features/president/publication.ts'
import { availableSnapshot, manifestFor } from './fixtures.ts'

const LIMIT = 120_000
const COLLECTED_AT = '2026-10-25T21:00:05Z'
const COLLECTED_MS = Date.parse(COLLECTED_AT)

function publication(
  manifestOverrides: Record<string, unknown> = {},
): AcceptedPublication {
  const snapshot = availableSnapshot({ collectedAt: COLLECTED_AT })
  return { manifest: manifestFor(snapshot, 1, manifestOverrides), snapshot }
}

describe('assessFreshness', () => {
  it('deve considerar recente a coleta abaixo do limiar', () => {
    const input = publication()

    const freshness = assessFreshness(input, COLLECTED_MS + 1_000, LIMIT)

    expect(freshness).toEqual({
      reference: 'collectedAt',
      referenceAt: COLLECTED_AT,
      ageMs: 1_000,
      state: 'recent',
    })
  })

  it('deve avisar exatamente no limiar', () => {
    const input = publication()

    const freshness = assessFreshness(input, COLLECTED_MS + LIMIT, LIMIT)

    expect(freshness.state).toBe('stale')
  })

  it('deve continuar recente um milissegundo antes do limiar', () => {
    const input = publication()

    const freshness = assessFreshness(input, COLLECTED_MS + LIMIT - 1, LIMIT)

    expect(freshness.state).toBe('recent')
  })

  it('deve avisar quando a coleta é antiga', () => {
    const input = publication()

    const freshness = assessFreshness(input, COLLECTED_MS + 3_600_000, LIMIT)

    expect(freshness).toMatchObject({
      reference: 'collectedAt',
      ageMs: 3_600_000,
      state: 'stale',
    })
  })

  it('deve usar checkedAt quando presente', () => {
    const checkedAt = '2026-10-25T22:00:00Z'
    const input = publication({ checkedAt })

    const freshness = assessFreshness(input, Date.parse(checkedAt) + 10, LIMIT)

    expect(freshness).toEqual({
      reference: 'checkedAt',
      referenceAt: checkedAt,
      ageMs: 10,
      state: 'recent',
    })
  })

  it('deve ignorar publishedAt recente quando a coleta é antiga', () => {
    const publishedAt = '2026-10-25T23:59:00Z'
    const snapshot = availableSnapshot({ collectedAt: COLLECTED_AT })
    const manifest = manifestFor(snapshot)
    const input = {
      manifest: { ...manifest, current: { ...manifest.current, publishedAt } },
      snapshot,
    }

    const freshness = assessFreshness(
      input,
      Date.parse(publishedAt) + 1_000,
      LIMIT,
    )

    expect(freshness).toMatchObject({
      reference: 'collectedAt',
      state: 'stale',
    })
  })

  it('deve declarar indeterminado quando a referência está no futuro', () => {
    const input = publication()

    const freshness = assessFreshness(input, COLLECTED_MS - 5_000, LIMIT)

    expect(freshness).toEqual({
      reference: 'collectedAt',
      referenceAt: COLLECTED_AT,
      state: 'undetermined',
      cause: 'reference-ahead',
    })
  })

  it('deve declarar indeterminado quando o relógio é inválido', () => {
    const input = publication()

    const freshness = assessFreshness(input, Number.NaN, LIMIT)

    expect(freshness).toMatchObject({
      state: 'undetermined',
      cause: 'invalid-clock',
    })
  })
})

describe('nextFreshnessChangeAt', () => {
  it('deve apontar o instante do limiar enquanto recente', () => {
    const freshness = assessFreshness(publication(), COLLECTED_MS, LIMIT)

    expect(nextFreshnessChangeAt(freshness, LIMIT)).toBe(COLLECTED_MS + LIMIT)
  })

  it('deve apontar a própria referência quando ela está no futuro', () => {
    const freshness = assessFreshness(publication(), COLLECTED_MS - 1, LIMIT)

    expect(nextFreshnessChangeAt(freshness, LIMIT)).toBe(COLLECTED_MS)
  })

  it('deve não agendar nada quando já passou do limiar', () => {
    const freshness = assessFreshness(
      publication(),
      COLLECTED_MS + LIMIT,
      LIMIT,
    )

    expect(nextFreshnessChangeAt(freshness, LIMIT)).toBeUndefined()
  })
})
