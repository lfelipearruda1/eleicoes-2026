import type { UfSummarySnapshot } from '@eleicoes/validation'
import { describe, expect, it } from 'vitest'

import { describeUfResults } from '../../src/features/map/ufResults.ts'

type Uf = UfSummarySnapshot['ufs'][number]

const NAMES = [
  { candidateId: '1', ballotName: 'CANDIDATURA A' },
  { candidateId: '2', ballotName: 'CANDIDATURA B' },
]

const base = {
  dataVersion: '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d',
  collectedAt: '2026-10-25T21:00:05Z',
  sections: { total: '100', totalized: '50', totalizedPercentage: '50.00' },
}

const available = (
  scope: Uf['scope'],
  a: [string, string],
  b: [string, string],
  destinationA?: 'annulled',
): Uf => ({
  ...base,
  scope,
  availability: 'available',
  totalizationStatus: 'in_progress',
  candidates: [
    {
      candidateId: '1',
      votes: a[0],
      contestantVotesPercentage: a[1],
      ...(destinationA && { voteDestination: destinationA }),
    },
    { candidateId: '2', votes: b[0], contestantVotesPercentage: b[1] },
  ],
})

const summary = (ufs: Uf[]) => ({ ufs }) as UfSummarySnapshot

describe('describeUfResults', () => {
  it('deve colorir a UF pela candidatura à frente e descrever o percentual', () => {
    const results = describeUfResults(
      summary([available('SP', ['70', '70.00'], ['30', '30.00'])]),
      NAMES,
    )

    expect(results.SP).toMatchObject({
      tone: 'candidate1',
      undecided: false,
      description: 'CANDIDATURA A à frente com 70,00%',
      tooltip: ['CANDIDATURA A', 'à frente com 70,00%'],
      values: { '1': '70,00%', '2': '30,00%' },
    })
    expect(results.SP?.segments).toHaveLength(2)
  })

  it('deve usar a cor da segunda candidatura quando ela está à frente', () => {
    const results = describeUfResults(
      summary([available('RJ', ['30', '30.00'], ['70', '70.00'])]),
      NAMES,
    )

    expect(results.RJ?.tone).toBe('candidate2')
  })

  it('deve não colorir empate', () => {
    const results = describeUfResults(
      summary([available('MG', ['50', '50.00'], ['50', '50.00'])]),
      NAMES,
    )

    expect(results.MG).toMatchObject({
      tone: undefined,
      undecided: true,
      description: 'empate',
      tooltip: ['Empate'],
    })
  })

  it('deve não colorir UF sem votos apurados', () => {
    const results = describeUfResults(
      summary([available('BA', ['0', '0.00'], ['0', '0.00'])]),
      NAMES,
    )

    expect(results.BA).toMatchObject({
      tone: undefined,
      description: 'sem votos apurados',
    })
  })

  it('deve ignorar votos anulados ao escolher a cor', () => {
    const results = describeUfResults(
      summary([available('PE', ['70', '70.00'], ['30', '30.00'], 'annulled')]),
      NAMES,
    )

    expect(results.PE?.tone).toBe('candidate2')
  })

  it('deve descrever UF pendente sem inventar percentual', () => {
    const results = describeUfResults(
      summary([
        {
          ...base,
          scope: 'DF',
          availability: 'pending',
          totalizationStatus: 'not_started',
          candidates: [{ candidateId: '1' }, { candidateId: '2' }],
        },
      ]),
      NAMES,
    )

    expect(results.DF).toMatchObject({
      tone: undefined,
      undecided: false,
      description: 'aguardando votos',
      tooltip: ['Aguardando votos'],
      values: { '1': '—', '2': '—' },
      segments: [],
    })
  })

  it('deve deixar fora a UF ausente do resumo e tudo sem resumo', () => {
    expect(describeUfResults(summary([]), NAMES).SP).toBeUndefined()
    expect(describeUfResults(undefined, NAMES)).toEqual({})
  })
})
