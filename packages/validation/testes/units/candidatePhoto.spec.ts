import { describe, expect, it } from 'vitest'

import { publishResultSnapshotSchema } from '../../src/index.js'

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

const pending = (photo: string) => ({
  ...common,
  votesReleased: false,
  availability: 'pending',
  pendingReason: 'votes_not_released',
  candidates: [
    { candidateId: '900000000001', number: '91', ballotName: 'A', photo },
  ],
})

const publishPaths = (document: unknown) => {
  const result = publishResultSnapshotSchema.safeParse(document)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('publishResultSnapshotSchema: foto da candidatura', () => {
  it('deve aceitar a foto dentro da pasta de fotos', () => {
    expect(publishPaths(pending('fotos/900000000001.jpeg'))).toEqual([])
  })

  it.each([
    '../fotos/900000000001.jpeg',
    'fotos/900000000001.png',
    'https://resultados.tse.jus.br/fotos/900000000001.jpeg',
    'fotos/../manifest.json',
  ])('deve recusar a foto fora do caminho publicado: %s', (photo) => {
    expect(publishPaths(pending(photo))).toEqual(['candidates.0.photo'])
  })
})
