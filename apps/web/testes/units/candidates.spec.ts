import { describe, expect, it } from 'vitest'

import {
  nameWithParty,
  summarizeCandidates,
} from '../../src/features/president/candidates.ts'
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

    expect(summary.rows[0]?.votes).toBe('9.007.199.254.740.993 votos')
  })

  it('deve não marcar ninguém à frente quando os percentuais publicados são iguais', () => {
    const snapshot = twoCandidates(['5', '50.00'], ['5', '50.00'])

    const summary = summarizeCandidates(snapshot)

    expect(summary.rows.some((row) => row.isAhead)).toBe(false)
  })

  it('deve marcar como à frente só quem tem mais votos', () => {
    const snapshot = twoCandidates(['4', '40.00'], ['6', '60.00'])

    const summary = summarizeCandidates(snapshot)

    expect(summary.rows.map((row) => row.isAhead)).toEqual([false, true])
  })
})

describe('summarizeCandidates: situação dos votos (Res. 23.751, art. 265, § 2º)', () => {
  const withDestinations = (a: string | undefined, b: string | undefined) => {
    const snapshot = twoCandidates(['6000', '60.00'], ['4000', '40.00'])
    if (snapshot.availability !== 'available') throw new Error('available')
    const [first, second] = snapshot.candidates
    return {
      ...snapshot,
      candidates: [
        { ...first, ...(a && { voteDestination: a }) },
        { ...second, ...(b && { voteDestination: b }) },
      ],
    } as typeof snapshot
  }

  it.each([
    ['valid', '6.000 votos válidos'],
    ['valid_party', '6.000 votos válidos (legenda)'],
    ['annulled', '6.000 votos anulados'],
    ['annulled_sub_judice', '6.000 votos anulados sub judice'],
  ])('deve escrever a situação %s junto dos votos', (destination, text) => {
    const summary = summarizeCandidates(withDestinations(destination, 'valid'))

    expect(summary.rows[0]?.votes).toBe(text)
  })

  it('deve manter só a contagem quando a origem não informa a situação', () => {
    const summary = summarizeCandidates(withDestinations(undefined, undefined))

    expect(summary.rows.map((row) => row.votes)).toEqual([
      '6.000 votos',
      '4.000 votos',
    ])
  })

  it.each(['annulled', 'annulled_sub_judice'])(
    'deve não destacar como mais votada a candidatura com votos %s',
    (destination) => {
      const summary = summarizeCandidates(
        withDestinations(destination, 'valid'),
      )

      expect(summary.rows.map((row) => row.isAhead)).toEqual([false, true])
    },
  )
})

describe('nameWithParty', () => {
  it('deve mostrar o partido entre parênteses depois do nome de urna', () => {
    const snapshot = availableSnapshot()
    const withParty = {
      ...snapshot,
      candidates: snapshot.candidates.map((candidate, index) =>
        index === 0 ? { ...candidate, party: 'PT' } : candidate,
      ),
    } as typeof snapshot

    const [first, second] = summarizeCandidates(withParty).rows

    expect(first && nameWithParty(first)).toBe('CANDIDATURA SINTÉTICA A (PT)')
    expect(second && nameWithParty(second)).toBe('CANDIDATURA SINTÉTICA B')
  })
})
