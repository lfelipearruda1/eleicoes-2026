import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ResultTarget } from '../../src/tse/ea11.js'
import type { Transport } from '../../src/tse/http.js'
import {
  candidatePhotoUrl,
  storeCandidatePhotos,
} from '../../src/tse/photos.js'
import { openTseSession } from '../../src/tse/run.js'
import { watchTse } from '../../src/tse/watch.js'
import { errorOf } from './failures.js'
import { json, syntheticConfig, syntheticResult } from './tseFixtures.js'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PHOTO_DIRECTORY = {
  tp: 'ft',
  dir: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/fotos/<uf>',
}
const SELECTION = {
  cycle: 'ele2026',
  pleito: '3221',
  election: '6260',
  name: 'Eleição estadual',
}
const GOVERNOR_DF: ResultTarget = { office: 'governor', scope: 'df' }

let workDirectory: string
let clockMs: number

beforeEach(async () => {
  workDirectory = await mkdtemp(path.join(tmpdir(), 'eleicoes-photos-'))
  clockMs = Date.parse('2026-10-25T21:00:00Z')
})

afterEach(async () => {
  await rm(workDirectory, { recursive: true, force: true })
})

function fakeTse(respond: (url: string) => Response) {
  const calls: string[] = []
  const transport: Transport = async (url) => {
    calls.push(url)
    return respond(url)
  }
  return { calls, transport }
}

const jpeg = () => new Response(JPEG, { status: 200 })

async function store(
  transport: Transport,
  overrides: Partial<Parameters<typeof storeCandidatePhotos>[0]> = {},
) {
  const session = await openTseSession({
    source: 'official',
    output: path.join(workDirectory, 'tse'),
    transport,
    minIntervalMs: 0,
    now: () => new Date(clockMs),
  })
  return storeCandidatePhotos({
    session,
    config: { arq: [PHOTO_DIRECTORY] },
    selection: SELECTION,
    target: GOVERNOR_DF,
    candidateIds: ['70002553055', '70002553057'],
    publications: path.join(workDirectory, 'publicacoes'),
    lastAttempts: new Map(),
    ...overrides,
  })
}

describe('candidatePhotoUrl', () => {
  it('deve usar a pasta da UF para governador', () => {
    const url = candidatePhotoUrl('official', SELECTION, GOVERNOR_DF, '1')

    expect(url.href).toBe(
      'https://resultados.tse.jus.br/oficial/ele2026/6260/fotos/df/1.jpeg',
    )
  })

  it('deve usar a pasta Brasil para presidente mesmo numa UF', () => {
    const url = candidatePhotoUrl(
      'official',
      { ...SELECTION, election: '6258' },
      { office: 'president', scope: 'sp' },
      '2',
    )

    expect(url.href).toBe(
      'https://resultados.tse.jus.br/oficial/ele2026/6258/fotos/br/2.jpeg',
    )
  })
})

describe('storeCandidatePhotos', () => {
  it('deve gravar cada foto JPEG na pasta publicada e devolver quem tem foto', async () => {
    const { transport } = fakeTse(jpeg)

    const stored = await store(transport)

    expect([...stored]).toEqual(['70002553055', '70002553057'])
    const file = await readFile(
      path.join(workDirectory, 'publicacoes', 'fotos', '70002553055.jpeg'),
    )
    expect(file.equals(JPEG)).toBe(true)
  })

  it('deve reaproveitar a foto gravada sem consultar o TSE de novo', async () => {
    const first = fakeTse(jpeg)
    await store(first.transport)
    const second = fakeTse(jpeg)

    const stored = await store(second.transport)

    expect(second.calls).toEqual([])
    expect(stored.size).toBe(2)
  })

  it('deve ignorar resposta que não é JPEG', async () => {
    const { transport } = fakeTse(
      () => new Response('<html>erro</html>', { status: 200 }),
    )

    const stored = await store(transport)

    expect(stored.size).toBe(0)
  })

  it('deve esperar o intervalo antes de tentar de novo a foto ausente', async () => {
    const lastAttempts = new Map<string, number>()
    const missing = fakeTse(() => new Response('', { status: 404 }))
    await store(missing.transport, { lastAttempts })
    const soon = fakeTse(jpeg)

    clockMs += 60_000
    await store(soon.transport, { lastAttempts })
    clockMs += 10 * 60_000
    const later = fakeTse(jpeg)
    const stored = await store(later.transport, { lastAttempts })

    expect(missing.calls).toHaveLength(2)
    expect(soon.calls).toEqual([])
    expect(later.calls).toHaveLength(2)
    expect(stored.size).toBe(2)
  })

  it('deve repassar o bloqueio do TSE em vez de seguir consultando', async () => {
    const { transport, calls } = fakeTse(
      () => new Response('', { status: 429 }),
    )

    const error = await errorOf(store(transport))

    expect(error.code).toBe('REMOTE_BLOCKED')
    expect(calls).toHaveLength(1)
  })

  it('deve não consultar quando o EA11 não lista a pasta de fotos', async () => {
    const { transport, calls } = fakeTse(jpeg)

    const stored = await store(transport, { config: { arq: [] } })

    expect(calls).toEqual([])
    expect(stored.size).toBe(0)
  })
})

describe('watchTse: fotos das candidaturas', () => {
  it('deve publicar o snapshot apontando para a foto gravada', async () => {
    const config = syntheticConfig()
    const configWithPhotos = {
      ...config,
      arq: [...config.arq, PHOTO_DIRECTORY],
    }
    const resultPath = /\/dados\/([a-z]{2})\/[a-z]{2}-c\d{4}-e\d{6}-u\.json$/
    const { transport } = fakeTse((url) => {
      if (url.endsWith('ele-c.json')) return json(configWithPhotos)
      if (url.includes('/fotos/br/')) return jpeg()
      const scope = resultPath.exec(url)?.[1]
      if (!scope) return new Response('', { status: 404 })
      return json(syntheticResult({ cdabr: scope }))
    })
    const publications = path.join(workDirectory, 'publicacoes')

    await watchTse({
      source: 'official',
      round: '2',
      output: path.join(workDirectory, 'tse'),
      publications,
      minIntervalMs: 0,
      maxCycles: 1,
      transport,
    })

    const channel = path.join(publications, 'oficial-presidente-br-2t')
    const manifest = JSON.parse(
      await readFile(path.join(channel, 'manifest.json'), 'utf8'),
    )
    const snapshot = JSON.parse(
      await readFile(path.join(channel, manifest.current.path), 'utf8'),
    )
    expect(snapshot.candidates).toMatchObject([
      { candidateId: '900000000001', photo: 'fotos/900000000001.jpeg' },
      { candidateId: '900000000002', photo: 'fotos/900000000002.jpeg' },
    ])
    const photo = await readFile(
      path.join(publications, 'fotos', '900000000001.jpeg'),
    )
    expect(photo.equals(JPEG)).toBe(true)
  })
})
