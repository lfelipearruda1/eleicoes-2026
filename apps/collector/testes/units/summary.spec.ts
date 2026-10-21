import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { readUfSummarySchema, type ResultSnapshot } from '@eleicoes/validation'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MANIFEST_FILE } from '../../src/constants.js'
import { publishDocument } from '../../src/publication/publish.js'
import { buildUfSummary, publishUfSummary } from '../../src/tse/summary.js'

const PREFIX = 'oficial'
const SUMMARY_CHANNEL = 'oficial-mapa-presidente-2t'

const snapshot = (
  scope: string,
  overrides: Record<string, unknown> = {},
): ResultSnapshot =>
  ({
    contractVersion: 1,
    dataVersion: crypto.randomUUID(),
    environment: 'local',
    sourceEnvironment: 'official',
    round: 2,
    office: 'president',
    scope,
    availability: 'available',
    collectedAt: '2026-10-25T21:00:05Z',
    source: { file: `ele2026/6258/dados/${scope.toLowerCase()}/x.json` },
    votesReleased: true,
    totalization: { status: 'in_progress', finalIndicator: false },
    sections: { total: '100', totalized: '50', totalizedPercentage: '50.00' },
    origin: {
      electionCode: '6258',
      generationId: '1',
      generatedAt: { date: '25/10/2026', time: '18:00:00' },
    },
    votes: { total: '100', valid: '100', contestant: '100' },
    candidates: [
      {
        candidateId: '1',
        number: '13',
        ballotName: 'A',
        votes: '70',
        contestantVotesPercentage: '70.00',
        voteDestination: 'valid',
      },
      {
        candidateId: '2',
        number: '22',
        ballotName: 'B',
        votes: '30',
        contestantVotesPercentage: '30.00',
      },
    ],
    ...overrides,
  }) as ResultSnapshot

let root: string

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'eleicoes-summary-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const publishUf = (document: ResultSnapshot) =>
  publishDocument({
    root,
    channel: `${PREFIX}-presidente-${document.scope.toLowerCase()}-2t`,
    document,
  })

const summaryManifest = async () =>
  JSON.parse(
    await readFile(path.join(root, SUMMARY_CHANNEL, MANIFEST_FILE), 'utf8'),
  )

describe('buildUfSummary', () => {
  it('deve copiar seções e votos de cada UF sem recalcular', () => {
    const sp = snapshot('SP')

    const summary = buildUfSummary([sp], crypto.randomUUID())

    expect(readUfSummarySchema.parse(summary).ufs).toEqual([
      {
        scope: 'SP',
        dataVersion: sp.dataVersion,
        collectedAt: sp.collectedAt,
        availability: 'available',
        totalizationStatus: 'in_progress',
        sections: sp.sections,
        candidates: [
          {
            candidateId: '1',
            votes: '70',
            contestantVotesPercentage: '70.00',
            voteDestination: 'valid',
          },
          {
            candidateId: '2',
            votes: '30',
            contestantVotesPercentage: '30.00',
          },
        ],
      },
    ])
  })

  it('deve manter UF pendente sem votos', () => {
    const pending = snapshot('DF', {
      availability: 'pending',
      pendingReason: 'totalization_not_started',
      totalization: { status: 'not_started', finalIndicator: false },
      sections: { total: '10', totalized: '0', totalizedPercentage: '0.00' },
      votes: undefined,
      candidates: [
        { candidateId: '1', number: '13', ballotName: 'A' },
        { candidateId: '2', number: '22', ballotName: 'B' },
      ],
    })

    const summary = buildUfSummary([pending], crypto.randomUUID())

    expect(summary.ufs[0]).toMatchObject({
      availability: 'pending',
      candidates: [{ candidateId: '1' }, { candidateId: '2' }],
    })
  })

  it('deve usar a coleta mais antiga como coleta do resumo e ordenar as UFs', () => {
    const summary = buildUfSummary(
      [
        snapshot('SP', { collectedAt: '2026-10-25T21:10:00Z' }),
        snapshot('AC', { collectedAt: '2026-10-25T21:05:00Z' }),
      ],
      crypto.randomUUID(),
    )

    expect(summary.collectedAt).toBe('2026-10-25T21:05:00Z')
    expect(summary.ufs.map((uf) => uf.scope)).toEqual(['AC', 'SP'])
  })
})

describe('publishUfSummary', () => {
  it('deve publicar o resumo das UFs já publicadas', async () => {
    await publishUf(snapshot('SP'))
    await publishUf(snapshot('RJ'))

    const result = await publishUfSummary({
      publications: root,
      prefix: PREFIX,
      round: 2,
    })

    expect(result).toMatchObject({ status: 'published', ufs: 2 })
    expect(await summaryManifest()).toMatchObject({
      channel: SUMMARY_CHANNEL,
      office: 'president',
      scope: 'BR',
      revision: 1,
    })
  })

  it('deve não criar versão nova quando nenhuma UF mudou', async () => {
    await publishUf(snapshot('SP'))
    await publishUfSummary({ publications: root, prefix: PREFIX, round: 2 })

    const again = await publishUfSummary({
      publications: root,
      prefix: PREFIX,
      round: 2,
    })

    expect(again.status).toBe('unchanged')
    expect((await summaryManifest()).revision).toBe(1)
  })

  it('deve criar versão nova quando uma UF muda', async () => {
    await publishUf(snapshot('SP'))
    await publishUfSummary({ publications: root, prefix: PREFIX, round: 2 })
    await publishUf(
      snapshot('SP', {
        sections: {
          total: '100',
          totalized: '80',
          totalizedPercentage: '80.00',
        },
      }),
    )

    const result = await publishUfSummary({
      publications: root,
      prefix: PREFIX,
      round: 2,
    })

    expect(result.status).toBe('published')
    expect((await summaryManifest()).revision).toBe(2)
  })

  it('deve não publicar nada sem UF publicada', async () => {
    const result = await publishUfSummary({
      publications: root,
      prefix: PREFIX,
      round: 2,
    })

    expect(result).toEqual({ status: 'empty', ufs: 0 })
  })
})
