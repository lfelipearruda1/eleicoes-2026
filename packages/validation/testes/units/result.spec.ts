import { describe, expect, it } from 'vitest'

import {
  publishResultSnapshotSchema,
  readResultSnapshotSchema,
} from '../../src/index.js'

const common = {
  contractVersion: 1,
  dataVersion: '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d',
  environment: 'local',
  sourceEnvironment: 'synthetic',
  round: 2,
  office: 'president',
  scope: 'BR',
  collectedAt: '2026-10-25T21:04:19Z',
  source: { file: 'sintetico/presidente-br.json' },
  votesReleased: true,
  totalization: { status: 'in_progress', finalIndicator: false },
  sections: { total: '400', totalized: '200', totalizedPercentage: '50.00' },
  origin: {
    electionCode: '9002',
    generationId: '103',
    generatedAt: { date: '25/10/2026', time: '18:00:00' },
  },
}

const candidate = (id: string, votes: string, percentage: string) => ({
  candidateId: `90000000000${id}`,
  number: `9${id}`,
  ballotName: `CANDIDATURA SINTÉTICA ${id}`,
  votes,
  contestantVotesPercentage: percentage,
})

const available = (overrides: Record<string, unknown> = {}) => ({
  ...common,
  availability: 'available',
  votes: { total: '10600', valid: '10050', contestant: '10000' },
  candidates: [candidate('1', '10000', '100.00'), candidate('2', '0', '0.00')],
  ...overrides,
})

const pending = (overrides: Record<string, unknown> = {}) => ({
  ...common,
  votesReleased: false,
  availability: 'pending',
  pendingReason: 'votes_not_released',
  candidates: [
    { candidateId: '900000000001', number: '91', ballotName: 'A' },
    { candidateId: '900000000002', number: '92', ballotName: 'B' },
  ],
  ...overrides,
})

const publishPaths = (document: unknown) => {
  const result = publishResultSnapshotSchema.safeParse(document)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('publishResultSnapshotSchema', () => {
  it('deve aceitar resultado disponível sem transformar os valores', () => {
    const document = available()

    const result = publishResultSnapshotSchema.parse(document)

    expect(result).toEqual(document)
  })

  it('deve aceitar votos zerados como resultado disponível', () => {
    const document = available({
      votes: { total: '0', valid: '0', contestant: '0' },
      candidates: [candidate('1', '0', '0.00')],
    })

    const paths = publishPaths(document)

    expect(paths).toEqual([])
  })

  it('deve aceitar pending com candidaturas sem votos', () => {
    const document = pending()

    const paths = publishPaths(document)

    expect(paths).toEqual([])
  })

  it('deve recusar pending que traz votos de candidatura', () => {
    const document = pending({
      candidates: [candidate('1', '0', '0.00')],
    })

    const paths = publishPaths(document)

    expect(paths).toContain('candidates.0')
  })

  it('deve recusar pending que traz o total de votos', () => {
    const document = pending({
      votes: { total: '0', valid: '0', contestant: '0' },
    })

    const paths = publishPaths(document)

    expect(paths).toEqual([''])
  })

  it('deve recusar available sem votos', () => {
    const document = available({ votes: undefined })

    const paths = publishPaths(document)

    expect(paths).toContain('votes')
  })

  it('deve recusar available com votação não liberada', () => {
    const document = available({ votesReleased: false })

    const paths = publishPaths(document)

    expect(paths).toEqual(['votesReleased'])
  })

  it('deve recusar available com totalização não iniciada', () => {
    const document = available({
      totalization: { status: 'not_started', finalIndicator: false },
    })

    const paths = publishPaths(document)

    expect(paths).toEqual(['totalization.status'])
  })

  it.each([
    { pendingReason: 'votes_not_released', votesReleased: true },
    { pendingReason: 'totalization_not_started', votesReleased: false },
    { pendingReason: 'totalization_not_started', votesReleased: true },
  ])('deve recusar motivo de pending incoerente: %o', (change) => {
    const document = pending(change)

    const paths = publishPaths(document)

    expect(paths).toContain('pendingReason')
  })

  it('deve preservar contagem maior que o inteiro seguro', () => {
    const big = '9007199254740993'
    const document = available({
      votes: { total: big, valid: big, contestant: big },
    })

    const result = publishResultSnapshotSchema.parse(document)

    expect(result.availability === 'available' && result.votes.total).toBe(big)
  })

  it.each(['007', '1.5', '-1', '', 12])(
    'deve recusar contagem malformada %j',
    (total) => {
      const document = available({
        votes: { total, valid: '0', contestant: '0' },
      })

      const paths = publishPaths(document)

      expect(paths).toEqual(['votes.total'])
    },
  )

  it.each(['47,03', '47.0', '47', 47.03])(
    'deve recusar percentual fora da forma com ponto e duas casas: %j',
    (percentage) => {
      const document = available({
        candidates: [candidate('1', '1', percentage as string)],
      })

      const paths = publishPaths(document)

      expect(paths).toEqual(['candidates.0.contestantVotesPercentage'])
    },
  )

  it.each([
    { field: 'office', value: 'governor' },
    { field: 'availability', value: 'unknown' },
    { field: 'availability', value: 'not_applicable' },
    { field: 'contractVersion', value: 2 },
    { field: 'sourceTime', value: null },
    { field: 'sourceTime', value: '2026-10-25T18:00:00' },
  ])('deve recusar $field = $value', ({ field, value }) => {
    const document = available({ [field]: value })

    const paths = publishPaths(document)

    expect(paths.length).toBeGreaterThan(0)
  })

  it('deve recusar horário de totalização da origem com null', () => {
    const document = available({
      origin: { ...common.origin, totalizedAt: null },
    })

    const paths = publishPaths(document)

    expect(paths).toEqual(['origin.totalizedAt'])
  })

  it('deve recusar candidatura repetida', () => {
    const document = available({
      candidates: [candidate('1', '1', '50.00'), candidate('1', '1', '50.00')],
    })

    const paths = publishPaths(document)

    expect(new Set(paths)).toEqual(new Set(['candidates']))
  })

  it('deve recusar seções totalizadas acima do total', () => {
    const document = available({
      sections: { total: '10', totalized: '11', totalizedPercentage: '100.00' },
    })

    const paths = publishPaths(document)

    expect(paths).toEqual(['sections.totalized'])
  })

  it('deve recusar chave não prevista no payload', () => {
    const document = available({ winner: '900000000001' })

    const paths = publishPaths(document)

    expect(paths).toEqual([''])
  })
})

describe('publishResultSnapshotSchema: cargo, abrangência e situação dos votos', () => {
  it('deve aceitar governador numa UF', () => {
    const document = available({ office: 'governor', scope: 'DF' })

    const paths = publishPaths(document)

    expect(paths).toEqual([])
  })

  it('deve aceitar presidente numa UF', () => {
    const document = available({ scope: 'SP' })

    const paths = publishPaths(document)

    expect(paths).toEqual([])
  })

  it('deve recusar governador com abrangência Brasil', () => {
    const document = available({ office: 'governor', scope: 'BR' })

    const paths = publishPaths(document)

    expect(paths).toEqual(['scope'])
  })

  it.each(['valid', 'valid_party', 'annulled', 'annulled_sub_judice'])(
    'deve aceitar a situação dos votos %s',
    (voteDestination) => {
      const document = available({
        candidates: [{ ...candidate('1', '10000', '100.00'), voteDestination }],
      })

      const paths = publishPaths(document)

      expect(paths).toEqual([])
    },
  )

  it('deve recusar situação dos votos desconhecida', () => {
    const document = available({
      candidates: [
        { ...candidate('1', '10000', '100.00'), voteDestination: 'cassado' },
      ],
    })

    const paths = publishPaths(document)

    expect(paths).toEqual(['candidates.0.voteDestination'])
  })

  it('deve recusar situação dos votos em candidatura de pending', () => {
    const document = pending({
      candidates: [
        {
          candidateId: '900000000001',
          number: '91',
          ballotName: 'A',
          voteDestination: 'valid',
        },
      ],
    })

    const paths = publishPaths(document)

    expect(paths).toEqual(['candidates.0'])
  })
})

describe('readResultSnapshotSchema', () => {
  it('deve descartar chaves extras e manter o payload validado', () => {
    const document = available({
      winner: '900000000001',
      candidates: [{ ...candidate('1', '10000', '100.00'), photo: 'x.png' }],
    })

    const result = readResultSnapshotSchema.parse(document)

    expect(result).not.toHaveProperty('winner')
    expect(result.candidates).toEqual([candidate('1', '10000', '100.00')])
  })

  it('deve recusar contractVersion desconhecido na leitura', () => {
    const document = available({ contractVersion: 2 })

    const result = readResultSnapshotSchema.safeParse(document)

    expect(result.success).toBe(false)
  })

  it('deve aplicar as regras cruzadas também na leitura', () => {
    const document = available({ votesReleased: false })

    const result = readResultSnapshotSchema.safeParse(document)

    expect(result.success).toBe(false)
  })
})
