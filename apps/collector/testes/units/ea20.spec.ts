import { describe, expect, it } from 'vitest'

import { parseResult } from '../../src/tse/ea20.js'
import { thrownBy } from './failures.js'
import { itemAt } from './itemAt.js'
import {
  PRESIDENT_BR,
  syntheticCandidate,
  syntheticResult,
  firstCandidate,
} from './tseFixtures.js'

describe('EA20: parser do resultado presidencial', () => {
  it('deve identificar candidaturas pelo identificador da origem, não pela posição', () => {
    const document = syntheticResult()

    const summary = parseResult(document, {
      election: '9002',
      round: 2,
      ...PRESIDENT_BR,
    })

    expect(
      summary.candidates.map((candidate) => candidate.candidateId),
    ).toEqual(['900000000001', '900000000002'])
  })

  it.each([
    ['n', 'not_started'],
    ['p', 'in_progress'],
    ['f', 'finished'],
  ])('deve ler o andamento %j da especificação EA20 como %s', (and, status) => {
    const document = syntheticResult({ and })

    const summary = parseResult(document)

    expect(summary.totalizationStatus).toBe(status)
  })

  it('deve recusar andamento fora da especificação EA20', () => {
    const document = syntheticResult({ and: 'a' })

    const error = thrownBy(() => parseResult(document))

    expect(error.code).toBe('INVALID_TSE_RESULT')
  })

  it('deve aceitar votos zerados como dado válido', () => {
    const document = syntheticResult()

    const summary = parseResult(document)

    expect(summary.candidates[0]?.votes).toBe('0')
    expect(summary.sections.totalized).toBe('0')
  })

  it('deve aceitar resultado antes da totalização, sem data de totalização', () => {
    const document = syntheticResult({ dt: '', ht: '' })

    const summary = parseResult(document)

    expect(summary.totalizedAt).toBeUndefined()
  })

  it('deve recusar data de totalização sem horário', () => {
    const document = syntheticResult({ ht: '' })

    const error = thrownBy(() => parseResult(document))

    expect(error.code).toBe('INVALID_TSE_RESULT')
  })

  it('deve preservar contagens maiores que o inteiro seguro sem perda', () => {
    const big = '9007199254740993'
    const document = syntheticResult({ v: { tv: big, vvc: big, vv: big } })

    const summary = parseResult(document)

    expect(summary.votes.valid).toBe(big)
  })

  it.each(['12abc', '-1', '1.5', ' 1', ''])(
    'deve recusar contagem malformada %j sem aceitação parcial',
    (vap) => {
      const document = syntheticResult()
      firstCandidate(document).vap = vap

      const error = thrownBy(() => parseResult(document))

      expect(error.code).toBe('INVALID_TSE_RESULT')
    },
  )

  it('deve recusar resultado sem campo obrigatório', () => {
    const document: Record<string, unknown> = syntheticResult()
    delete document.s

    const error = thrownBy(() => parseResult(document))

    expect(error.code).toBe('INVALID_TSE_RESULT')
  })

  it('deve recusar resultado de outro turno', () => {
    const document = syntheticResult({ t: '1' })

    const error = thrownBy(() =>
      parseResult(document, { election: '9002', round: 2, ...PRESIDENT_BR }),
    )

    expect(error.code).toBe('TSE_RESULT_MISMATCH')
  })
})

describe('EA20: cargo, abrangência e situação dos votos', () => {
  const governorResult = (overrides: Record<string, unknown> = {}) =>
    syntheticResult({
      cdabr: 'df',
      carg: [
        {
          cd: '3',
          agr: [{ par: [{ cand: [syntheticCandidate('900000000003', '0')] }] }],
        },
      ],
      ...overrides,
    })

  const withDestination = (dvt: unknown) => {
    const document = syntheticResult()
    Object.assign(firstCandidate(document), { dvt })
    return document
  }

  it('deve ler presidente numa UF quando é a abrangência pedida', () => {
    const document = syntheticResult({ cdabr: 'sp' })

    const summary = parseResult(document, {
      election: '9002',
      round: 2,
      office: 'president',
      scope: 'sp',
    })

    expect(summary).toMatchObject({ office: 'president', scope: 'sp' })
  })

  it('deve ler governador numa UF', () => {
    const document = governorResult()

    const summary = parseResult(document, {
      election: '9002',
      round: 2,
      office: 'governor',
      scope: 'df',
    })

    expect(summary).toMatchObject({ office: 'governor', scope: 'df' })
    expect(summary.candidates.map((c) => c.candidateId)).toEqual([
      '900000000003',
    ])
  })

  it('deve deduzir cargo e abrangência no replay', () => {
    const document = governorResult()

    const summary = parseResult(document)

    expect(summary).toMatchObject({ office: 'governor', scope: 'df' })
  })

  it.each([
    ['outra UF', syntheticResult({ cdabr: 'rj' }), 'president', 'sp'],
    [
      'abrangência desconhecida',
      syntheticResult({ cdabr: 'xx' }),
      'president',
      'xx',
    ],
    ['governador no Brasil', governorResult({ cdabr: 'br' }), 'governor', 'br'],
    ['cargo ausente', syntheticResult(), 'governor', 'br'],
  ] as const)('deve recusar %s', (_case, document, office, scope) => {
    const error = thrownBy(() =>
      parseResult(document, { election: '9002', round: 2, office, scope }),
    )

    expect(error.code).toBe('TSE_RESULT_MISMATCH')
  })

  it.each([
    ['Válido', 'valid'],
    ['Válido (legenda)', 'valid_party'],
    ['Anulado', 'annulled'],
    ['Anulado sub judice', 'annulled_sub_judice'],
    ['ANULADO SUB JUDICE', 'annulled_sub_judice'],
    ['  anulado  ', 'annulled'],
  ])('deve ler a situação dos votos %j como %s', (dvt, destination) => {
    const document = withDestination(dvt)

    const summary = parseResult(document)

    expect(summary.candidates[0]?.voteDestination).toBe(destination)
  })

  it.each([undefined, ''])(
    'deve tratar situação %j como não informada',
    (dvt) => {
      const document = withDestination(dvt)

      const summary = parseResult(document)

      expect(summary.candidates[0]).toMatchObject({
        voteDestination: undefined,
      })
    },
  )

  it('deve recusar situação dos votos fora da especificação', () => {
    const document = withDestination('Cassado')

    const error = thrownBy(() => parseResult(document))

    expect(error.code).toBe('INVALID_TSE_RESULT')
  })
})

describe('EA20: partido da candidatura', () => {
  const firstParty = (document: ReturnType<typeof syntheticResult>) =>
    itemAt(itemAt(itemAt(document.carg, 0).agr, 0).par, 0)

  it('deve ler a sigla do partido de cada candidatura', () => {
    const document = syntheticResult()
    Object.assign(firstParty(document), { sg: 'PT' })

    const summary = parseResult(document)

    expect(summary.candidates[0]?.party).toBe('PT')
    expect(summary.candidates[1]?.party).toBeUndefined()
  })

  it.each(['', 'pt', 'PT\u0000', 'X'.repeat(21)])(
    'deve descartar a sigla malformada %j sem recusar o resultado',
    (sg) => {
      const document = syntheticResult()
      Object.assign(firstParty(document), { sg })

      const summary = parseResult(document)

      expect(summary.candidates[0]?.party).toBeUndefined()
    },
  )
})
