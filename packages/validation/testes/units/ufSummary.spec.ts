import { describe, expect, it } from 'vitest'

import { publishUfSummarySchema, readUfSummarySchema } from '../../src/index.js'

const summary = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  kind: 'uf-summary',
  dataVersion: '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d',
  environment: 'local',
  sourceEnvironment: 'synthetic',
  round: 2,
  office: 'president',
  scope: 'BR',
  availability: 'available',
  collectedAt: '2026-10-25T21:00:05Z',
  source: { file: 'resumo/presidente-uf.json' },
  ufs: [
    {
      scope: 'SP',
      dataVersion: '1c8d0b63-4a2f-4e3b-8d5c-7f9a2b3c4d5e',
      collectedAt: '2026-10-25T21:00:05Z',
      availability: 'available',
      totalizationStatus: 'in_progress',
      sections: { total: '100', totalized: '50', totalizedPercentage: '50.00' },
      candidates: [
        {
          candidateId: '900000000001',
          votes: '7000',
          contestantVotesPercentage: '70.00',
          voteDestination: 'valid',
        },
        {
          candidateId: '900000000002',
          votes: '3000',
          contestantVotesPercentage: '30.00',
        },
      ],
    },
    {
      scope: 'DF',
      dataVersion: '2d9e1c74-5b3a-4f4c-9e6d-8a0b3c4d5e6f',
      collectedAt: '2026-10-25T21:00:05Z',
      availability: 'pending',
      totalizationStatus: 'not_started',
      sections: { total: '10', totalized: '0', totalizedPercentage: '0.00' },
      candidates: [
        { candidateId: '900000000001' },
        { candidateId: '900000000002' },
      ],
    },
  ],
  ...overrides,
})

const paths = (document: unknown) => {
  const result = publishUfSummarySchema.safeParse(document)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('publishUfSummarySchema', () => {
  it('deve aceitar o resumo com UF disponível e UF pendente', () => {
    const document = summary()

    const result = publishUfSummarySchema.parse(document)

    expect(result).toEqual(document)
  })

  it('deve recusar UF repetida', () => {
    const document = summary()
    document.ufs = [document.ufs[0], document.ufs[0]]

    expect(paths(document)).toEqual(['ufs'])
  })

  it('deve recusar abrangência Brasil dentro da lista de UFs', () => {
    const document = summary()
    document.ufs = [{ ...document.ufs[0], scope: 'BR' }]

    expect(paths(document)).toEqual(['ufs.0.scope'])
  })

  it('deve recusar votos em UF pendente', () => {
    const document = summary()
    document.ufs = [
      {
        ...document.ufs[1],
        candidates: [
          {
            candidateId: '900000000001',
            votes: '1',
            contestantVotesPercentage: '100.00',
          },
        ],
      },
    ]

    expect(paths(document)).toEqual(['ufs.0.candidates.0'])
  })

  it('deve recusar resumo que não é de presidente no Brasil', () => {
    expect(paths(summary({ office: 'governor', scope: 'DF' }))).toEqual([
      'office',
      'scope',
    ])
  })

  it('deve recusar documento sem o tipo de resumo', () => {
    expect(paths(summary({ kind: undefined }))).toEqual(['kind'])
  })
})

describe('readUfSummarySchema', () => {
  it('deve descartar chave extra na leitura', () => {
    const document = summary({ extra: true })

    const result = readUfSummarySchema.parse(document)

    expect(result).not.toHaveProperty('extra')
  })
})
