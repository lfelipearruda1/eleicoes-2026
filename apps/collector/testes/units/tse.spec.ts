import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TSE_CAPTURE_FILES } from '../../src/constants.js'
import type { CollectorError } from '../../src/error.js'
import {
  configUrl,
  parseElectionConfig,
  parseTarget,
  resultFileUrl,
  selectElection,
} from '../../src/tse/ea11.js'
import { parseResult } from '../../src/tse/ea20.js'
import { httpGet, type Transport } from '../../src/tse/http.js'
import { runTseOnce, runTseReplay } from '../../src/tse/run.js'

const PRESIDENT_BR = { office: 'president', scope: 'br' } as const
const HOST = 'resultados.tse.jus.br'
const RESULT_URL = `https://${HOST}/oficial/ele2026/9002/dados/br/br-c0001-e009002-u.json`

const syntheticElection = (cd: string, t: string, offices = ['1']) => ({
  cd,
  nm: `Eleição sintética ${cd}`,
  t,
  abr: [{ cd: 'br', cp: offices.map((office) => ({ cd: office })) }],
})

const syntheticConfig = (
  elections = [syntheticElection('9001', '1'), syntheticElection('9002', '2')],
) => ({
  arq: [{ tp: 'u', dir: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>' }],
  pl: [{ cd: '9900', c: 'ele2026', e: elections }],
})

const syntheticCandidate = (sqcand: string, vap: string) => ({
  n: sqcand.slice(-2),
  sqcand,
  nmu: `CANDIDATURA SINTÉTICA ${sqcand}`,
  vap,
  pvap: '0,00',
})

const syntheticResult = (overrides: Record<string, unknown> = {}) => ({
  ele: '9002',
  t: '2',
  cdabr: 'br',
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
      cd: '1',
      agr: [
        { par: [{ cand: [syntheticCandidate('900000000001', '0')] }] },
        { par: [{ cand: [syntheticCandidate('900000000002', '0')] }] },
      ],
    },
  ],
  s: { ts: '100', st: '0', pst: '0,00' },
  v: { tv: '0', vvc: '0', vv: '0' },
  ...overrides,
})

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })

function fakeTransport(
  responder: (url: string, headers: Record<string, string>) => Response,
) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const transport: Transport = async (url, init) => {
    const headers = (init.headers ?? {}) as Record<string, string>
    calls.push({ url, headers })
    return responder(url, headers)
  }
  return { transport, calls }
}

const tseResponder = (result: () => Response) => (url: string) =>
  url.endsWith('ele-c.json')
    ? json(syntheticConfig(), { etag: '"config-1"' })
    : result()

let output: string

beforeEach(async () => {
  output = await mkdtemp(path.join(tmpdir(), 'eleicoes-tse-spec-'))
})

afterEach(async () => {
  await rm(output, { recursive: true, force: true })
})

async function errorOf(promise: Promise<unknown>): Promise<CollectorError> {
  try {
    await promise
  } catch (error) {
    return error as CollectorError
  }
  throw new Error('a operação deveria falhar')
}

function thrownBy(action: () => unknown): CollectorError {
  try {
    action()
  } catch (error) {
    return error as CollectorError
  }
  throw new Error('a operação deveria falhar')
}

const runOnce = (transport: Transport, source = 'official') =>
  runTseOnce({ source, round: '2', output, transport, minIntervalMs: 0 })

const readJson = async (file: string) =>
  JSON.parse(await readFile(file, 'utf8'))

describe('EA11: governador e presidente por UF', () => {
  const stateElection = {
    cd: '9004',
    nm: 'Eleição sintética estadual 9004',
    t: '2',
    abr: ['df', 'es'].map((uf) => ({ cd: uf, cp: [{ cd: '3' }] })),
  }
  const config = () =>
    parseElectionConfig(
      syntheticConfig([syntheticElection('9002', '2'), stateElection]),
    )

  it('deve selecionar a eleição estadual que lista governador na UF', () => {
    const selection = selectElection(config(), 2, {
      office: 'governor',
      scope: 'df',
    })

    expect(selection.election).toBe('9004')
  })

  it('deve recusar governador numa UF sem disputa no turno', () => {
    const error = thrownBy(() =>
      selectElection(config(), 2, { office: 'governor', scope: 'sp' }),
    )

    expect(error.code).toBe('ELECTION_NOT_FOUND')
  })

  it('deve selecionar a eleição federal para presidente numa UF', () => {
    const selection = selectElection(config(), 2, {
      office: 'president',
      scope: 'sp',
    })

    expect(selection.election).toBe('9002')
  })

  it.each([
    [{ office: 'governor', scope: 'df' }, '9004', 'df/df-c0003-e009004-u.json'],
    [
      { office: 'president', scope: 'sp' },
      '9002',
      'sp/sp-c0001-e009002-u.json',
    ],
  ] as const)('deve montar a URL de %j', (target, election, file) => {
    const selection = selectElection(config(), 2, target)

    const url = resultFileUrl('official', selection, target)

    expect(url.href).toBe(
      `https://${HOST}/oficial/ele2026/${election}/dados/${file}`,
    )
  })

  it.each([
    ['senator', 'df'],
    ['president', 'BR'],
    ['president', 'xx'],
    ['president', '../br'],
    ['governor', 'br'],
  ])('deve recusar o alvo %s/%s', (office, scope) => {
    const error = thrownBy(() => parseTarget(office, scope))

    expect(error.code).toBe('INVALID_ARGUMENTS')
  })

  it('deve consultar o arquivo de governador da UF e registrar o alvo', async () => {
    const governor = syntheticResult({
      ele: '9004',
      cdabr: 'df',
      carg: [
        {
          cd: '3',
          agr: [{ par: [{ cand: [syntheticCandidate('900000000003', '0')] }] }],
        },
      ],
    })
    const { transport, calls } = fakeTransport((url) =>
      url.endsWith('ele-c.json')
        ? json(syntheticConfig([syntheticElection('9002', '2'), stateElection]))
        : json(governor),
    )

    const run = await runTseOnce({
      source: 'official',
      round: '2',
      office: 'governor',
      scope: 'df',
      output,
      transport,
      minIntervalMs: 0,
    })

    const metadata = await readJson(
      path.join(run.runDirectory, TSE_CAPTURE_FILES.metadata),
    )
    expect(calls[1].url).toBe(
      `https://${HOST}/oficial/ele2026/9004/dados/df/df-c0003-e009004-u.json`,
    )
    expect(metadata).toMatchObject({ office: 'governor', scope: 'df' })
    expect(run.result).toMatchObject({ office: 'governor', scope: 'df' })
  })
})

describe('EA11: seleção da eleição', () => {
  it('deve selecionar a eleição presidencial do turno pedido', () => {
    const config = parseElectionConfig(syntheticConfig())

    const selection = selectElection(config, 2, PRESIDENT_BR)

    expect(selection).toEqual({
      cycle: 'ele2026',
      pleito: '9900',
      election: '9002',
      name: 'Eleição sintética 9002',
    })
  })

  it('deve falhar quando a configuração não lista o turno pedido', () => {
    const config = parseElectionConfig(
      syntheticConfig([syntheticElection('9001', '1')]),
    )

    const error = thrownBy(() => selectElection(config, 2, PRESIDENT_BR))

    expect(error.code).toBe('ELECTION_NOT_FOUND')
  })

  it('deve exigir escolha explícita quando há mais de uma eleição compatível', () => {
    const config = parseElectionConfig(
      syntheticConfig([
        syntheticElection('9002', '2'),
        syntheticElection('9003', '2'),
      ]),
    )

    const error = thrownBy(() => selectElection(config, 2, PRESIDENT_BR))

    expect(error.code).toBe('ELECTION_AMBIGUOUS')
    expect(error.message).toContain('9002')
    expect(error.message).toContain('9003')
  })

  it('deve aceitar a eleição escolhida explicitamente entre as compatíveis', () => {
    const config = parseElectionConfig(
      syntheticConfig([
        syntheticElection('9002', '2'),
        syntheticElection('9003', '2'),
      ]),
    )

    const selection = selectElection(config, 2, PRESIDENT_BR, '9003')

    expect(selection.election).toBe('9003')
  })

  it('deve ignorar eleição do turno sem cargo de presidente', () => {
    const config = parseElectionConfig(
      syntheticConfig([
        syntheticElection('9002', '2'),
        syntheticElection('9004', '2', ['3']),
      ]),
    )

    const selection = selectElection(config, 2, PRESIDENT_BR)

    expect(selection.election).toBe('9002')
  })

  it('deve recusar configuração com diretório de resultado diferente do conhecido', () => {
    const config = {
      ...syntheticConfig(),
      arq: [{ tp: 'u', dir: '<base>/outro/<uf>' }],
    }

    const error = thrownBy(() => parseElectionConfig(config))

    expect(error.code).toBe('TSE_LAYOUT_CHANGED')
  })

  it('deve montar as URLs de configuração e de resultado presidencial Brasil', () => {
    const selection = {
      cycle: 'ele2026',
      pleito: '9900',
      election: '9002',
      name: '',
    }

    const url = resultFileUrl('official', selection, PRESIDENT_BR)

    expect(url.href).toBe(RESULT_URL)
    expect(configUrl('official').href).toBe(
      `https://${HOST}/oficial/comum/config/ele-c.json`,
    )
  })
})

describe('httpGet', () => {
  const get = (url: string, transport: Transport, extra: object = {}) =>
    httpGet(new URL(url), { allowedHost: HOST, transport, ...extra })

  it.each([
    'http://resultados.tse.jus.br/x.json',
    'https://outro.example/x.json',
    'https://resultados.tse.jus.br.example/x.json',
    'https://resultados.tse.jus.br:8443/x.json',
    'https://usuario:senha@resultados.tse.jus.br/x.json',
  ])('deve recusar %s sem fazer requisição', async (url) => {
    const { transport, calls } = fakeTransport(() => json({}))

    const error = await errorOf(get(url, transport))

    expect(error.code).toBe('URL_NOT_ALLOWED')
    expect(calls).toHaveLength(0)
  })

  it('deve devolver o corpo e os validadores de uma resposta 200', async () => {
    const { transport } = fakeTransport(() =>
      json({ ok: true }, { etag: '"a"' }),
    )

    const result = await get(RESULT_URL, transport)

    expect(result).toMatchObject({ status: 200, validator: { etag: '"a"' } })
  })

  it('deve enviar If-Modified-Since quando só houver Last-Modified', async () => {
    const lastModified = 'Sun, 18 Oct 2026 15:38:28 GMT'
    const { transport, calls } = fakeTransport(
      () => new Response(null, { status: 304 }),
    )

    await get(RESULT_URL, transport, { validator: { lastModified } })

    expect(calls[0].headers).toEqual({ 'If-Modified-Since': lastModified })
  })

  it.each([
    { status: 404, code: 'REMOTE_NOT_FOUND' },
    { status: 403, code: 'REMOTE_BLOCKED' },
    { status: 429, code: 'REMOTE_BLOCKED' },
    { status: 500, code: 'REMOTE_HTTP_ERROR' },
  ])(
    'deve falhar com HTTP $status sem repetir a requisição',
    async ({ status, code }) => {
      const { transport, calls } = fakeTransport(
        () => new Response('erro', { status }),
      )

      const error = await errorOf(get(RESULT_URL, transport))

      expect(error.code).toBe(code)
      expect(calls).toHaveLength(1)
    },
  )

  it('deve não seguir redirecionamento', async () => {
    const { transport } = fakeTransport(
      () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://outro.example/' },
        }),
    )

    const error = await errorOf(get(RESULT_URL, transport))

    expect(error.code).toBe('REMOTE_REDIRECT')
    expect(error.message).toContain('https://outro.example/')
  })

  it('deve cancelar a leitura quando o corpo passa do limite', async () => {
    const { transport } = fakeTransport(() => new Response('x'.repeat(2048)))

    const error = await errorOf(get(RESULT_URL, transport, { maxBytes: 1024 }))

    expect(error.code).toBe('RESPONSE_TOO_LARGE')
  })

  it('deve expirar quando o corpo para de chegar no meio da leitura', async () => {
    const stalled = new ReadableStream<Uint8Array>({
      start: (controller) =>
        controller.enqueue(new TextEncoder().encode('{"ele":')),
    })
    const { transport } = fakeTransport(() => new Response(stalled))

    const error = await errorOf(get(RESULT_URL, transport, { timeoutMs: 50 }))

    expect(error.code).toBe('REMOTE_TIMEOUT')
  })

  it('deve distinguir falha de transporte', async () => {
    const transport: Transport = async () => {
      throw new TypeError('fetch failed')
    }

    const error = await errorOf(get(RESULT_URL, transport))

    expect(error.code).toBe('REMOTE_TRANSPORT')
  })
})

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

    expect(summary.candidates[0].votes).toBe('0')
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
      document.carg[0].agr[0].par[0].cand[0].vap = vap

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
    Object.assign(document.carg[0].agr[0].par[0].cand[0], { dvt })
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

    expect(summary.candidates[0].voteDestination).toBe(destination)
  })

  it.each([undefined, ''])(
    'deve tratar situação %j como não informada',
    (dvt) => {
      const document = withDestination(dvt)

      const summary = parseResult(document)

      expect(summary.candidates[0].voteDestination).toBeUndefined()
    },
  )

  it('deve recusar situação dos votos fora da especificação', () => {
    const document = withDestination('Cassado')

    const error = thrownBy(() => parseResult(document))

    expect(error.code).toBe('INVALID_TSE_RESULT')
  })
})

describe('runTseOnce', () => {
  it('deve consultar configuração e resultado e salvar a captura validada', async () => {
    const { transport, calls } = fakeTransport(
      tseResponder(() => json(syntheticResult(), { etag: '"r-1"' })),
    )

    const run = await runOnce(transport)

    expect(calls.map((call) => call.url)).toEqual([
      configUrl('official').href,
      RESULT_URL,
    ])
    expect(run.validation).toBe('valid')
    expect((await readdir(run.runDirectory)).sort()).toEqual(
      [
        TSE_CAPTURE_FILES.config,
        TSE_CAPTURE_FILES.metadata,
        TSE_CAPTURE_FILES.result,
        TSE_CAPTURE_FILES.summary,
      ].sort(),
    )
  })

  it('deve não enviar validador sem cópia anterior', async () => {
    const { transport, calls } = fakeTransport(
      tseResponder(() => json(syntheticResult())),
    )

    await runOnce(transport)

    expect(calls.map((call) => call.headers)).toEqual([{}, {}])
  })

  it('deve reutilizar a cópia válida anterior quando a origem responde 304', async () => {
    await runOnce(
      fakeTransport(
        tseResponder(() => json(syntheticResult(), { etag: '"r-1"' })),
      ).transport,
    )
    const second = fakeTransport((_url, headers) =>
      headers['If-None-Match'] ? new Response(null, { status: 304 }) : json({}),
    )

    const run = await runOnce(second.transport)

    expect(second.calls.map((call) => call.headers['If-None-Match'])).toEqual([
      '"config-1"',
      '"r-1"',
    ])
    expect(run).toMatchObject({
      validation: 'valid',
      sampleOrigin: 'previous-capture',
    })
  })

  it('deve registrar nos metadados qual cópia anterior o 304 reaproveitou', async () => {
    const first = await runOnce(
      fakeTransport(
        tseResponder(() => json(syntheticResult(), { etag: '"r-1"' })),
      ).transport,
    )
    const second = fakeTransport((_url, headers) =>
      headers['If-None-Match'] ? new Response(null, { status: 304 }) : json({}),
    )

    const run = await runOnce(second.transport)

    const metadata = await readJson(
      path.join(run.runDirectory, TSE_CAPTURE_FILES.metadata),
    )
    expect(metadata.requests[1].reusedCapture).toBe(
      `${path.basename(first.runDirectory)}/${TSE_CAPTURE_FILES.result}`,
    )
  })

  it('deve falhar com 304 quando não há cópia anterior', async () => {
    const { transport } = fakeTransport(
      () => new Response(null, { status: 304 }),
    )

    const error = await errorOf(runOnce(transport))

    expect(error.code).toBe('NOT_MODIFIED_WITHOUT_COPY')
  })

  it('deve recusar resposta HTML no lugar do JSON', async () => {
    const { transport } = fakeTransport(
      tseResponder(() => new Response('<html>erro</html>')),
    )

    const error = await errorOf(runOnce(transport))

    expect(error.code).toBe('RESPONSE_NOT_JSON')
  })

  it('deve preservar a última cópia válida quando a resposta nova é inválida', async () => {
    const valid = await runOnce(
      fakeTransport(
        tseResponder(() => json(syntheticResult(), { etag: '"r-1"' })),
      ).transport,
    )
    const sourceDirectory = path.join(output, 'official')
    const lastValidPath = path.join(
      sourceDirectory,
      TSE_CAPTURE_FILES.lastValid,
    )
    const before = (await readJson(lastValidPath))[RESULT_URL]
    const invalid = fakeTransport(
      tseResponder(() => json(syntheticResult({ s: {} }), { etag: '"r-2"' })),
    )

    const error = await errorOf(runOnce(invalid.transport))

    const runs = await readdir(sourceDirectory)
    const rejectedRun = runs.find(
      (entry) =>
        entry !== path.basename(valid.runDirectory) &&
        entry !== TSE_CAPTURE_FILES.lastValid,
    )
    const rejectedDirectory = path.join(sourceDirectory, rejectedRun ?? '')
    expect(error.code).toBe('INVALID_TSE_RESULT')
    expect((await readJson(lastValidPath))[RESULT_URL]).toEqual(before)
    expect(await readdir(rejectedDirectory)).toContain(
      TSE_CAPTURE_FILES.rejected,
    )
    expect(
      (await readJson(path.join(rejectedDirectory, TSE_CAPTURE_FILES.metadata)))
        .validation,
    ).toBe('rejected')
  })

  it('deve recusar a origem simulada não confirmada sem consultar nem gravar', async () => {
    const { transport, calls } = fakeTransport(() => json({}))

    const error = await errorOf(runOnce(transport, 'simulated'))

    expect(error.code).toBe('SOURCE_NOT_CONFIRMED')
    expect(calls).toHaveLength(0)
    expect(await readdir(output)).toEqual([])
  })
})

describe('runTseReplay', () => {
  it('deve reprocessar uma captura sem rede com o mesmo parser do comando online', async () => {
    const online = await runOnce(
      fakeTransport(tseResponder(() => json(syntheticResult()))).transport,
    )

    const replay = await runTseReplay({
      input: path.join(online.runDirectory, TSE_CAPTURE_FILES.result),
      output,
    })

    expect(replay.validation).toBe('valid')
    expect(
      await readJson(path.join(replay.runDirectory, TSE_CAPTURE_FILES.summary)),
    ).toEqual(
      await readJson(path.join(online.runDirectory, TSE_CAPTURE_FILES.summary)),
    )
  })
})
