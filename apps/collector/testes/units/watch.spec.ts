import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MANIFEST_FILE } from '../../src/constants.js'
import type { CollectorError } from '../../src/error.js'
import { parseElectionConfig } from '../../src/tse/ea11.js'
import type { Transport } from '../../src/tse/http.js'
import { channelFor } from '../../src/tse/channels.js'
import {
  channelPrefixFor,
  listTargets,
  watchTse,
  type WatchEvent,
} from '../../src/tse/watch.js'

const RESULT_PATH =
  /\/ele2026\/(\d+)\/dados\/([a-z]{2})\/[a-z]{2}-c(\d{4})-e\d{6}-u\.json$/

const config = (withFederal = true) => ({
  arq: [{ tp: 'u', dir: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>' }],
  pl: [
    {
      cd: '9900',
      c: 'ele2026',
      e: [
        ...(withFederal
          ? [
              {
                cd: '9002',
                nm: 'Federal 2º turno',
                t: '2',
                abr: [{ cd: 'br', cp: [{ cd: '1' }] }],
              },
            ]
          : []),
        {
          cd: '9004',
          nm: 'Estadual 2º turno',
          t: '2',
          abr: ['df', 'es'].map((uf) => ({ cd: uf, cp: [{ cd: '3' }] })),
        },
      ],
    },
  ],
})

const result = (election: string, scope: string, office: string) => ({
  ele: election,
  t: '2',
  cdabr: scope,
  dg: '25/10/2026',
  hg: '17:00:00',
  idg: '1',
  dt: '25/10/2026',
  ht: '17:00:00',
  dv: 's',
  tf: 'n',
  and: 'p',
  carg: [
    {
      cd: String(Number(office)),
      agr: [
        {
          par: [
            {
              cand: [
                {
                  n: '91',
                  sqcand: '900000000001',
                  nmu: 'CANDIDATURA SINTÉTICA A',
                  vap: '10',
                  pvap: '100,00',
                  dvt: 'Válido',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  s: { ts: '100', st: '10', pst: '10,00' },
  v: { tv: '10', vvc: '10', vv: '10' },
})

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })

function fakeTse(
  override: (url: string, scope?: string) => Response | undefined = () =>
    undefined,
  configBody: unknown = config(),
) {
  const calls: string[] = []
  const transport: Transport = async (url, init) => {
    calls.push(url)
    const headers = (init.headers ?? {}) as Record<string, string>
    const match = RESULT_PATH.exec(url)
    const custom = override(url, match?.[2])
    if (custom) return custom
    if (headers['If-None-Match']) return new Response(null, { status: 304 })
    if (url.endsWith('ele-c.json')) return json(configBody, { etag: '"c"' })
    if (!match) return new Response('', { status: 404 })
    return json(result(match[1], match[2], match[3]), { etag: `"${url}"` })
  }
  return { transport, calls }
}

let workDirectory: string

beforeEach(async () => {
  workDirectory = await mkdtemp(path.join(tmpdir(), 'eleicoes-watch-'))
})

afterEach(async () => {
  await rm(workDirectory, { recursive: true, force: true })
})

function watch(
  transport: Transport,
  overrides: Partial<Parameters<typeof watchTse>[0]> = {},
) {
  const events: WatchEvent[] = []
  let clock = Date.parse('2026-10-25T20:00:00Z')
  const run = watchTse({
    source: 'official',
    round: '2',
    output: path.join(workDirectory, 'tse'),
    publications: path.join(workDirectory, 'publicacoes'),
    minIntervalMs: 0,
    intervalMs: 1,
    blockPauseMs: 1,
    checkedAtMinIntervalMs: 0,
    maxCycles: 1,
    now: () => new Date((clock += 1_000)),
    log: (event) => events.push(event),
    transport,
    ...overrides,
  })
  return { run, events }
}

const manifest = async (channel: string) =>
  JSON.parse(
    await readFile(
      path.join(workDirectory, 'publicacoes', channel, MANIFEST_FILE),
      'utf8',
    ),
  )

const cycleEnds = (events: WatchEvent[]) =>
  events.filter((event) => event.event === 'cycle_end')

describe('listTargets', () => {
  it('deve listar presidente no Brasil e nas 27 UFs e governador onde o EA11 indica', () => {
    const parsed = parseElectionConfig(config())

    const targets = listTargets(parsed, 2)

    expect(targets).toHaveLength(30)
    expect(targets[0]).toEqual({ office: 'president', scope: 'br' })
    expect(targets.filter((target) => target.office === 'governor')).toEqual([
      { office: 'governor', scope: 'df' },
      { office: 'governor', scope: 'es' },
    ])
  })

  it('deve omitir presidente quando o turno não tem eleição federal', () => {
    const parsed = parseElectionConfig(config(false))

    const targets = listTargets(parsed, 2)

    expect(targets.map((target) => target.office)).toEqual([
      'governor',
      'governor',
    ])
  })
})

describe('channelFor', () => {
  it('deve nomear o canal por cargo, abrangência e turno', () => {
    const channel = channelFor(
      'oficial',
      { office: 'governor', scope: 'df' },
      2,
    )

    expect(channel).toBe('oficial-governador-df-2t')
  })

  it.each(['Oficial', 'a/b', ''])('deve recusar o prefixo %j', (prefix) => {
    let error: CollectorError | undefined
    try {
      channelFor(prefix, { office: 'president', scope: 'br' }, 2)
    } catch (caught) {
      error = caught as CollectorError
    }

    expect(error?.code).toBe('INVALID_ARGUMENTS')
  })
})

describe('watchTse', () => {
  it('deve publicar um canal por alvo num ciclo completo', async () => {
    const { transport, calls } = fakeTse()

    const { run, events } = watch(transport)
    await run

    expect(calls).toHaveLength(31)
    expect(cycleEnds(events)).toEqual([
      expect.objectContaining({ status: 'completed', published: 30 }),
    ])
    expect(await manifest('oficial-presidente-br-2t')).toMatchObject({
      office: 'president',
      scope: 'BR',
      revision: 1,
    })
    expect(await manifest('oficial-governador-df-2t')).toMatchObject({
      office: 'governor',
      scope: 'DF',
    })
  })

  it('deve publicar o resumo por UF no fim do ciclo', async () => {
    const { transport } = fakeTse()

    const { run, events } = watch(transport)
    await run

    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'summary',
        status: 'published',
        ufs: 27,
      }),
    )
    expect(await manifest('oficial-mapa-presidente-2t')).toMatchObject({
      office: 'president',
      scope: 'BR',
      revision: 1,
    })
  })

  it('deve recusar prefixo de demonstração na coleta oficial', async () => {
    const { transport, calls } = fakeTse()

    const { run } = watch(transport, { channelPrefix: 'demo-x' })
    const error = await run.catch((caught: CollectorError) => caught)

    expect((error as CollectorError).code).toBe('INVALID_ARGUMENTS')
    expect(calls).toEqual([])
  })

  it('deve derivar o prefixo padrão da fonte', () => {
    expect(channelPrefixFor('official', undefined)).toBe('oficial')
    expect(channelPrefixFor('simulated', undefined)).toBe('simulado')
    expect(channelPrefixFor('official', 'ensaio')).toBe('ensaio')
  })

  it.each(['oficial', 'oficial-ensaio'])(
    'deve recusar o prefixo %j para a fonte simulada',
    (prefix) => {
      expect(() => channelPrefixFor('simulated', prefix)).toThrow(
        expect.objectContaining({ code: 'INVALID_ARGUMENTS' }),
      )
    },
  )

  it('deve registrar verificação sem versão nova quando a origem responde 304', async () => {
    const { transport } = fakeTse()

    const { run, events } = watch(transport, { maxCycles: 2 })
    await run

    const ends = cycleEnds(events)
    expect(ends[1]).toMatchObject({ status: 'completed', checked: 30 })
    const published = await manifest('oficial-presidente-sp-2t')
    expect(published.revision).toBe(2)
    expect(published.checkedAt).toBeDefined()
    expect(events.indexOf(ends[0])).toBeLessThan(
      events.findIndex(
        (event) => event.event === 'cycle_start' && event.cycle === 2,
      ),
    )
  })

  it('deve respeitar o intervalo mínimo entre regravações de checkedAt', async () => {
    const { transport } = fakeTse()

    const { run, events } = watch(transport, {
      maxCycles: 2,
      checkedAtMinIntervalMs: 3_600_000,
    })
    await run

    expect(cycleEnds(events)[1]).toMatchObject({ unchanged: 30 })
    expect((await manifest('oficial-presidente-br-2t')).revision).toBe(1)
  })

  it('deve desligar o alvo que responde 404 e não pedi-lo de novo', async () => {
    const { transport, calls } = fakeTse((_url, scope) =>
      scope === 'sp' ? new Response('', { status: 404 }) : undefined,
    )

    const { run, events } = watch(transport, { maxCycles: 2 })
    const summary = await run

    expect(summary.disabled).toEqual(['president-sp'])
    expect(calls.filter((url) => url.includes('/sp/'))).toHaveLength(1)
    expect(cycleEnds(events)[1]).toMatchObject({ skipped: 1 })
  })

  it('deve interromper o ciclo e esperar o prazo de bloqueio quando a origem bloqueia', async () => {
    const { transport, calls } = fakeTse((_url, scope) =>
      scope === 'ac' ? new Response('', { status: 429 }) : undefined,
    )

    const { run, events } = watch(transport, {
      maxCycles: 2,
      intervalMs: 1,
      blockPauseMs: 7,
    })
    await run

    expect(cycleEnds(events)[0]).toMatchObject({ status: 'blocked' })
    expect(calls.slice(0, 4).map((url) => RESULT_PATH.exec(url)?.[2])).toEqual([
      undefined,
      'br',
      'ac',
      undefined,
    ])
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'wait', waitMs: 7, reason: 'blocked' }),
    )
  })

  it('deve seguir para os outros alvos quando um resultado é inválido', async () => {
    const { transport } = fakeTse((_url, scope) =>
      scope === 'rj' ? json({ ele: 'x' }) : undefined,
    )

    const { run, events } = watch(transport)
    await run

    expect(cycleEnds(events)[0]).toMatchObject({ published: 29, failed: 1 })
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'target_failed',
        target: 'president-rj',
        code: 'INVALID_TSE_RESULT',
      }),
    )
    await expect(manifest('oficial-presidente-rj-2t')).rejects.toThrow()
  })

  it('deve encerrar o ciclo sem alvos quando a configuração falha', async () => {
    const { transport, calls } = fakeTse((url) =>
      url.endsWith('ele-c.json')
        ? new Response('', { status: 500 })
        : undefined,
    )

    const { run, events } = watch(transport)
    await run

    expect(calls).toHaveLength(1)
    expect(cycleEnds(events)[0]).toMatchObject({ status: 'failed' })
  })

  it('deve parar ao receber sinal durante a espera entre ciclos', async () => {
    const controller = new AbortController()
    const { transport } = fakeTse()
    const events: WatchEvent[] = []

    const summary = await watchTse({
      source: 'official',
      round: '2',
      output: path.join(workDirectory, 'tse'),
      publications: path.join(workDirectory, 'publicacoes'),
      minIntervalMs: 0,
      intervalMs: 3_600_000,
      transport,
      signal: controller.signal,
      log: (event) => {
        events.push(event)
        if (event.event === 'wait') controller.abort()
      },
    })

    expect(summary.cycles).toBe(1)
    expect(events.at(-1)).toMatchObject({ event: 'stopped', bySignal: true })
  })
})
