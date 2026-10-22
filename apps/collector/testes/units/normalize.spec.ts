import { readResultSnapshotSchema } from '@eleicoes/validation'
import { describe, expect, it } from 'vitest'

import { normalizeResult } from '../../src/president/normalize.js'
import { parseResult, type ResultSummary } from '../../src/tse/ea20.js'
import { thrownBy } from './failures.js'
import { itemAt } from './itemAt.js'
import { rawResult } from './presidentFixtures.js'

const DATA_VERSION = '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d'

const summaryOf = (overrides: Record<string, unknown> = {}) =>
  parseResult(rawResult(overrides))

const normalize = (summary: ResultSummary) =>
  normalizeResult(summary, {
    dataVersion: DATA_VERSION,
    sourceEnvironment: 'synthetic',
    collectedAt: '2026-10-25T21:00:05Z',
    sourceFile: 'sintetico/presidente-br.json',
  })

describe('normalizeResult', () => {
  it('deve levar a sigla do partido para a candidatura publicada', () => {
    const summary = summaryOf()
    const withParty = {
      ...summary,
      candidates: summary.candidates.map((candidate) => ({
        ...candidate,
        party: 'PT',
      })),
    }

    const snapshot = normalize(withParty)

    expect(snapshot.candidates.every((c) => c.party === 'PT')).toBe(true)
  })

  it('deve produzir pending sem votos quando a votação não foi liberada', () => {
    const summary = summaryOf({ dv: 'n' })

    const snapshot = normalize(summary)

    expect(snapshot).toMatchObject({
      availability: 'pending',
      pendingReason: 'votes_not_released',
      votesReleased: false,
    })
    expect(snapshot).not.toHaveProperty('votes')
    expect(snapshot.candidates[0]).toEqual({
      candidateId: '900000000001',
      number: '91',
      ballotName: 'CANDIDATURA SINTÉTICA 1',
    })
  })

  it('deve produzir pending com a totalização explicitamente não iniciada', () => {
    const summary = summaryOf({
      and: 'n',
      dt: '',
      ht: '',
      s: { ts: '400', st: '0', pst: '0,00' },
      v: { tv: '0', vvc: '0', vv: '0' },
    })

    const snapshot = normalize(summary)

    expect(snapshot).toMatchObject({
      availability: 'pending',
      pendingReason: 'totalization_not_started',
      totalization: { status: 'not_started' },
      sections: { total: '400', totalized: '0' },
    })
  })

  it('deve manter disponível o resultado parcial com zeros legítimos', () => {
    const summary = summaryOf()

    const snapshot = normalize(summary)

    expect(snapshot.availability).toBe('available')
    expect(snapshot.totalization).toEqual({
      status: 'in_progress',
      finalIndicator: false,
    })
    expect(snapshot.candidates[1]).toMatchObject({
      votes: '0',
      contestantVotesPercentage: '0.00',
    })
  })

  it('deve copiar o percentual da origem sem recalcular', () => {
    const summary = summaryOf()

    const snapshot = normalize(summary)

    expect(snapshot.candidates[0]).toMatchObject({
      votes: '6000',
      contestantVotesPercentage: '33.33',
    })
  })

  it('deve manter vvc e vv como categorias distintas', () => {
    const summary = summaryOf()

    const snapshot = normalize(summary)

    expect(snapshot.availability === 'available' && snapshot.votes).toEqual({
      total: '6100',
      valid: '6050',
      contestant: '6000',
    })
  })

  it('deve preservar contagens maiores que o inteiro seguro', () => {
    const big = '9007199254740993'
    const summary = summaryOf({ v: { tv: big, vvc: big, vv: big } })

    const snapshot = normalize(summary)

    expect(snapshot.availability === 'available' && snapshot.votes.total).toBe(
      big,
    )
  })

  it('deve deixar sourceTime e totalizedAt ausentes sem horário da origem', () => {
    const summary = summaryOf({ and: 'n', dt: '', ht: '', ...zeroed() })

    const snapshot = normalize(summary)

    expect(snapshot).not.toHaveProperty('sourceTime')
    expect(snapshot.origin).not.toHaveProperty('totalizedAt')
    expect(snapshot.origin.generatedAt).toEqual({
      date: '25/10/2026',
      time: '18:00:00',
    })
  })

  it('deve ser determinístico e independente da ordem das candidaturas', () => {
    const reordered = rawResult()
    itemAt(reordered.carg, 0).agr.reverse()

    const first = normalize(parseResult(reordered))

    expect(first).toEqual(normalize(summaryOf()))
  })

  it('deve recusar totalização não iniciada com seções totalizadas', () => {
    const summary = summaryOf({ and: 'n' })

    const error = thrownBy(() => normalize(summary))

    expect(error.code).toBe('TSE_RESULT_CONTRADICTION')
  })

  it('deve produzir um documento aceito pelo schema de leitura', () => {
    const summary = summaryOf()

    const snapshot = normalize(summary)

    expect(readResultSnapshotSchema.parse(snapshot)).toEqual(snapshot)
  })
})

function zeroed() {
  return {
    s: { ts: '400', st: '0', pst: '0,00' },
    v: { tv: '0', vvc: '0', vv: '0' },
  }
}

describe('EA20: indicadores de disponibilidade', () => {
  it.each([
    { field: 'and', value: 'x' },
    { field: 'dv', value: 'S' },
    { field: 'tf', value: '' },
  ])('deve recusar $field desconhecido "$value"', ({ field, value }) => {
    const document = rawResult({ [field]: value })

    const error = thrownBy(() => parseResult(document))

    expect(error.code).toBe('INVALID_TSE_RESULT')
  })
})
