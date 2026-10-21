import { describe, expect, it } from 'vitest'

import { summarizeCandidates } from '../../src/features/president/candidates.ts'
import { availableSnapshot, pendingSnapshot } from './fixtures.ts'

const twoCandidates = (a: [string, string], b: [string, string]) =>
  availableSnapshot({
    candidates: [
      {
        candidateId: '1',
        number: '91',
        ballotName: 'A',
        votes: a[0],
        contestantVotesPercentage: a[1],
      },
      {
        candidateId: '2',
        number: '92',
        ballotName: 'B',
        votes: b[0],
        contestantVotesPercentage: b[1],
      },
    ],
  })

describe('summarizeCandidates', () => {
  it('deve mostrar pending sem votos nem percentuais inventados', () => {
    const summary = summarizeCandidates(pendingSnapshot())

    expect(summary.rows.map((row) => [row.percentage, row.votes])).toEqual([
      ['—', 'Aguardando votos'],
      ['—', 'Aguardando votos'],
    ])
  })

  it('deve desenhar a barra de pending só em tons apagados', () => {
    const summary = summarizeCandidates(pendingSnapshot())

    expect(summary.segments.every((segment) => segment.dim)).toBe(true)
    expect(summary.note).toBe(
      'Os percentuais aparecem quando houver votos apurados.',
    )
  })

  it('deve renderizar todas as candidaturas na ordem do contrato', () => {
    const summary = summarizeCandidates(availableSnapshot())

    expect(summary.rows.map((row) => row.ballotName)).toEqual([
      'CANDIDATURA SINTÉTICA A',
      'CANDIDATURA SINTÉTICA B',
      'CANDIDATURA SINTÉTICA C',
    ])
  })

  it('deve usar as cores do protótipo pela posição e neutro nas demais', () => {
    const summary = summarizeCandidates(availableSnapshot())

    expect(summary.rows.map((row) => row.tone)).toEqual([
      'candidate1',
      'candidate2',
      'other',
    ])
  })

  it('deve usar o percentual publicado sem recalcular', () => {
    const snapshot = twoCandidates(['1', '33.33'], ['2', '66.67'])

    const summary = summarizeCandidates(snapshot)

    expect(summary.rows.map((row) => row.percentage)).toEqual([
      '33,33%',
      '66,67%',
    ])
    expect(summary.segments.map((s) => [s.start, s.width])).toEqual([
      ['0.00', '33.33'],
      ['33.33', '66.67'],
    ])
  })

  it('deve formatar contagens grandes sem perda de precisão', () => {
    const snapshot = twoCandidates(
      ['9007199254740993', '50.00'],
      ['1', '50.00'],
    )

    const summary = summarizeCandidates(snapshot)

    expect(summary.rows[0].votes).toBe('9.007.199.254.740.993 votos')
  })

  it('deve indicar a diferença sobre a base de candidaturas concorrentes', () => {
    const snapshot = twoCandidates(['4953', '49.53'], ['5047', '50.47'])

    const summary = summarizeCandidates(snapshot)

    expect(summary.note).toBe(
      'Percentuais sobre os votos a candidaturas concorrentes. Diferença de 0,94 p.p.',
    )
  })

  it('deve indicar empate quando os percentuais publicados são iguais', () => {
    const snapshot = twoCandidates(['5', '50.00'], ['5', '50.00'])

    const summary = summarizeCandidates(snapshot)

    expect(summary.note).toBe(
      'Percentuais sobre os votos a candidaturas concorrentes. Empate nos números apresentados.',
    )
    expect(summary.rows.some((row) => row.isAhead)).toBe(false)
  })

  it('deve marcar como à frente só quem tem mais votos', () => {
    const snapshot = twoCandidates(['4', '40.00'], ['6', '60.00'])

    const summary = summarizeCandidates(snapshot)

    expect(summary.rows.map((row) => row.isAhead)).toEqual([false, true])
  })

  it('deve trocar a diferença pela base do percentual com mais de duas candidaturas', () => {
    const summary = summarizeCandidates(availableSnapshot())

    expect(summary.note).toBe(
      'Percentuais sobre os votos a candidaturas concorrentes.',
    )
  })
})
