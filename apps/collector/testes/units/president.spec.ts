import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { readPresidentialSnapshotSchema } from '@eleicoes/validation'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_CHANNEL, MANIFEST_FILE } from '../../src/constants.js'
import type { CollectorError } from '../../src/error.js'
import { DEMO_FIXTURES } from '../../src/president/demo.js'
import { normalizePresidentialResult } from '../../src/president/normalize.js'
import { publishPresidentialCapture } from '../../src/president/publish.js'
import { readPublication } from '../../src/publication/read.js'
import { listSnapshots } from '../../src/publication/storage.js'
import {
  parsePresidentialResult,
  type PresidentialSummary,
} from '../../src/tse/ea20.js'

const OFFICIAL_CHANNEL = 'teste-oficial-presidente-br-2t'
const OFFICIAL_URL =
  'https://resultados.tse.jus.br/oficial/ele2026/9002/dados/br/br-c0001-e009002-u.json'
const DATA_VERSION = '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d'

const candidate = (id: string, vap: string, pvap: string) => ({
  n: `9${id}`,
  sqcand: `90000000000${id}`,
  nmu: `CANDIDATURA SINTÉTICA ${id}`,
  vap,
  pvap,
})

const rawResult = (overrides: Record<string, unknown> = {}) => ({
  ele: '9002',
  t: '2',
  cdabr: 'br',
  dg: '25/10/2026',
  hg: '18:00:00',
  idg: '103',
  dt: '25/10/2026',
  ht: '18:00:00',
  dv: 's',
  tf: 'n',
  and: 'a',
  carg: [
    {
      cd: '1',
      agr: [
        { par: [{ cand: [candidate('2', '0', '0,00')] }] },
        { par: [{ cand: [candidate('1', '6000', '33,33')] }] },
      ],
    },
  ],
  s: { ts: '400', st: '200', pst: '50,00' },
  v: { tv: '6100', vvc: '6000', vv: '6050' },
  ...overrides,
})

const summaryOf = (overrides: Record<string, unknown> = {}) =>
  parsePresidentialResult(rawResult(overrides))

const normalize = (summary: PresidentialSummary) =>
  normalizePresidentialResult(summary, {
    dataVersion: DATA_VERSION,
    sourceEnvironment: 'synthetic',
    collectedAt: '2026-10-25T21:00:05Z',
    sourceFile: 'sintetico/presidente-br.json',
  })

function thrownBy(action: () => unknown): CollectorError {
  try {
    action()
  } catch (error) {
    return error as CollectorError
  }
  throw new Error('a operação deveria falhar')
}

async function errorOf(promise: Promise<unknown>): Promise<CollectorError> {
  try {
    await promise
  } catch (error) {
    return error as CollectorError
  }
  throw new Error('a operação deveria falhar')
}

describe('normalizePresidentialResult', () => {
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
    reordered.carg[0].agr.reverse()

    const first = normalize(parsePresidentialResult(reordered))

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

    expect(readPresidentialSnapshotSchema.parse(snapshot)).toEqual(snapshot)
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

    const error = thrownBy(() => parsePresidentialResult(document))

    expect(error.code).toBe('INVALID_TSE_RESULT')
  })
})

describe('publishPresidentialCapture', () => {
  let workDirectory: string
  let output: string

  beforeEach(async () => {
    workDirectory = await mkdtemp(path.join(tmpdir(), 'eleicoes-president-'))
    output = path.join(workDirectory, 'publicacoes')
  })

  afterEach(async () => {
    await rm(workDirectory, { recursive: true, force: true })
  })

  const fixture = (name: string) => path.join(DEMO_FIXTURES, name)
  const publishFixture = (name: string, channel = DEMO_CHANNEL) =>
    publishPresidentialCapture({ capture: fixture(name), output, channel })
  const manifestText = (channel = DEMO_CHANNEL) =>
    readFile(path.join(output, channel, MANIFEST_FILE), 'utf8')

  async function copyFixture(
    name: string,
    edit: (metadata: Record<string, unknown>) => void,
  ) {
    const target = path.join(workDirectory, `copia-${name}`)
    await cp(fixture(name), target, { recursive: true })
    const metadataPath = path.join(target, 'metadata.json')
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    edit(metadata)
    await writeFile(metadataPath, JSON.stringify(metadata))
    return target
  }

  async function officialCapture(requests: Record<string, unknown>[]) {
    const sourceDirectory = path.join(workDirectory, 'tse', 'official')
    const runDirectory = path.join(sourceDirectory, 'run-2')
    await mkdir(path.join(sourceDirectory, 'run-1'), { recursive: true })
    await mkdir(runDirectory)
    const body = JSON.stringify(rawResult())
    await writeFile(path.join(sourceDirectory, 'run-1', 'result.json'), body)
    await writeFile(path.join(runDirectory, 'result.json'), body)
    await writeFile(
      path.join(runDirectory, 'metadata.json'),
      JSON.stringify({
        source: 'official',
        sourceEnvironment: 'oficial',
        office: 'president',
        round: 2,
        scope: 'br',
        requests,
        validation: 'valid',
        election: {
          cycle: 'ele2026',
          pleito: '9900',
          election: '9002',
          name: 'Eleição sintética 9002',
        },
        sampleOrigin: 'live',
      }),
    )
    return runDirectory
  }

  it('deve publicar a primeira versão e ler o payload persistido', async () => {
    const result = await publishFixture('03-parcial')

    const { snapshot } = await readPublication(output, DEMO_CHANNEL)
    expect(result).toMatchObject({ status: 'published', revision: 1 })
    expect(snapshot).toEqual(result.snapshot)
    expect(snapshot.availability).toBe('available')
    expect(snapshot.candidates).toHaveLength(2)
  })

  it('deve não criar versão ao reprocessar a mesma captura', async () => {
    await publishFixture('03-parcial')
    const before = await manifestText()

    const result = await publishFixture('03-parcial')

    expect(result).toMatchObject({ status: 'unchanged', revision: 1 })
    expect(await manifestText()).toBe(before)
    expect(await listSnapshots(path.join(output, DEMO_CHANNEL))).toHaveLength(1)
  })

  it('deve tratar nova coleta com o mesmo conteúdo como verificação, sem versão nova', async () => {
    await publishFixture('03-parcial')
    const recollected = await copyFixture('03-parcial', (metadata) => {
      metadata.collectedAt = '2026-10-25T23:59:00Z'
    })

    const result = await publishPresidentialCapture({
      capture: recollected,
      output,
      channel: DEMO_CHANNEL,
    })

    expect(result.status).toBe('unchanged')
    expect(result.snapshot.collectedAt).toBe('2026-10-25T21:00:05Z')
  })

  it('deve criar nova versão quando o conteúdo eleitoral muda', async () => {
    const first = await publishFixture('03-parcial')

    const result = await publishFixture('04-parcial-atualizada')

    expect(result).toMatchObject({ status: 'published', revision: 2 })
    expect(result.dataVersion).not.toBe(first.dataVersion)
    expect(result.snapshot.sections.totalized).toBe('300')
  })

  it('deve preservar manifesto e snapshot quando a entrada é inválida', async () => {
    const first = await publishFixture('04-parcial-atualizada')
    const before = await manifestText()

    const error = await errorOf(publishFixture('05-invalida'))

    const { snapshot } = await readPublication(output, DEMO_CHANNEL)
    expect(error.code).toBe('INVALID_TSE_RESULT')
    expect(await manifestText()).toBe(before)
    expect(snapshot.dataVersion).toBe(first.dataVersion)
  })

  it('deve preservar a versão anterior quando a publicação falha antes da troca', async () => {
    const first = await publishFixture('03-parcial')
    const before = await manifestText()

    await errorOf(
      publishPresidentialCapture({
        capture: fixture('04-parcial-atualizada'),
        output,
        channel: DEMO_CHANNEL,
        beforeManifestSwap: async () => {
          throw new Error('falha injetada')
        },
      }),
    )

    const { snapshot } = await readPublication(output, DEMO_CHANNEL)
    expect(await manifestText()).toBe(before)
    expect(snapshot.dataVersion).toBe(first.dataVersion)
  })

  it('deve recusar captura sintética em canal sem o prefixo de demonstração', async () => {
    const error = await errorOf(publishFixture('03-parcial', OFFICIAL_CHANNEL))

    expect(error.code).toBe('CHANNEL_SOURCE_MISMATCH')
  })

  it('deve recusar outro turno num canal já publicado', async () => {
    await publishFixture('03-parcial')
    const firstRound = await copyFixture('03-parcial', (metadata) => {
      metadata.round = 1
    })
    const resultPath = path.join(firstRound, 'result.json')
    const result = JSON.parse(await readFile(resultPath, 'utf8'))
    await writeFile(resultPath, JSON.stringify({ ...result, t: '1' }))

    const error = await errorOf(
      publishPresidentialCapture({
        capture: firstRound,
        output,
        channel: DEMO_CHANNEL,
      }),
    )

    expect(error.code).toBe('CHANNEL_MISMATCH')
  })

  it('deve recusar metadados e resultado de turnos diferentes', async () => {
    const mismatched = await copyFixture('03-parcial', (metadata) => {
      metadata.round = 1
    })

    const error = await errorOf(
      publishPresidentialCapture({
        capture: mismatched,
        output,
        channel: DEMO_CHANNEL,
      }),
    )

    expect(error.code).toBe('TSE_RESULT_MISMATCH')
  })

  it('deve recusar captura de replay sem proveniência', async () => {
    const replay = await copyFixture('03-parcial', (metadata) => {
      delete metadata.source
      metadata.sampleOrigin = 'replay'
    })

    const error = await errorOf(
      publishPresidentialCapture({
        capture: replay,
        output,
        channel: DEMO_CHANNEL,
      }),
    )

    expect(error.code).toBe('INVALID_CAPTURE')
  })

  it('deve identificar a captura oficial pela URL e pelo horário da consulta', async () => {
    const capture = await officialCapture([
      {
        url: OFFICIAL_URL,
        requestedAt: '2026-10-25T21:00:01.500Z',
        status: 200,
      },
    ])

    const result = await publishPresidentialCapture({
      capture,
      output,
      channel: OFFICIAL_CHANNEL,
    })

    expect(result.snapshot).toMatchObject({
      sourceEnvironment: 'official',
      collectedAt: '2026-10-25T21:00:01.500Z',
      source: { file: 'ele2026/9002/dados/br/br-c0001-e009002-u.json' },
      origin: { electionCode: '9002', generationId: '103' },
    })
  })

  it('deve resolver a cópia reaproveitada por 304 numa execução anterior', async () => {
    const capture = await officialCapture([
      {
        url: OFFICIAL_URL,
        requestedAt: '2026-10-25T21:05:00Z',
        status: 304,
        reusedCapture: 'run-1/result.json',
      },
    ])
    await rm(path.join(capture, 'result.json'))

    const result = await publishPresidentialCapture({
      capture,
      output,
      channel: OFFICIAL_CHANNEL,
    })

    expect(result.status).toBe('published')
  })

  it('deve recusar 304 sem referência à cópia reaproveitada', async () => {
    const capture = await officialCapture([
      { url: OFFICIAL_URL, requestedAt: '2026-10-25T21:05:00Z', status: 304 },
    ])

    const error = await errorOf(
      publishPresidentialCapture({
        capture,
        output,
        channel: OFFICIAL_CHANNEL,
      }),
    )

    expect(error.code).toBe('INVALID_CAPTURE')
  })

  it('deve recusar referência de 304 que sai do diretório da origem', async () => {
    const capture = await officialCapture([
      {
        url: OFFICIAL_URL,
        requestedAt: '2026-10-25T21:05:00Z',
        status: 304,
        reusedCapture: '../fora/result.json',
      },
    ])

    const error = await errorOf(
      publishPresidentialCapture({
        capture,
        output,
        channel: OFFICIAL_CHANNEL,
      }),
    )

    expect(error.code).toBe('INVALID_CAPTURE')
  })
})

describe('runPresidentialDemo: fixtures', () => {
  it('deve usar fixtures versionadas dentro do pacote do coletor', () => {
    const collectorDirectory = path.resolve(import.meta.dirname, '../..')

    const relative = path.relative(collectorDirectory, DEMO_FIXTURES)

    expect(relative).toBe(path.join('fixtures', 'president-synthetic'))
  })
})
