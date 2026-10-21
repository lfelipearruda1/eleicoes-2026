import { describe, expect, it } from 'vitest'

import {
  channelSource,
  LOCAL_POLL_INTERVAL_MS,
  LOCAL_STALE_AFTER_MS,
  readResultsConfig,
  resolveInChannel,
  type ResultsConfig,
  type ResultsEnv,
} from '../../src/features/president/resultsConfig.ts'

const LOCAL_PAGE = 'http://127.0.0.1:4173/'
const PUBLIC_PAGE = 'https://eleicoes.exemplo.invalid/'
const CHANNEL = 'demo-sintetico-presidente-br-2t'

const build = (overrides: Partial<ResultsEnv> = {}): ResultsEnv => ({
  DEV: false,
  VITE_RESULTS_BASE_URL: 'https://resultados.exemplo.invalid/publicacoes',
  VITE_RESULTS_CHANNEL: CHANNEL,
  VITE_RESULTS_STALE_AFTER_MS: '300000',
  VITE_RESULTS_POLL_INTERVAL_MS: '20000',
  VITE_RESULTS_LOOPBACK_HOSTS: '127.0.0.1, [::1]',
  VITE_RESULTS_BLOCKED_DOMAINS: 'tse.jus.br',
  ...overrides,
})

function ready(config: ResultsConfig) {
  if (config.status !== 'ready') throw new Error(config.problems.join(' '))
  return config
}

const nationalRoot = (config: Extract<ResultsConfig, { status: 'ready' }>) =>
  channelSource(config.endpoint, 'president', 'BR').channelRoot.href

function problems(config: ResultsConfig) {
  return config.status === 'invalid' ? config.problems : []
}

describe('readResultsConfig', () => {
  it('deve usar a ponte local e o limiar local sem base em desenvolvimento', () => {
    const env = { DEV: true }

    const config = ready(
      readResultsConfig(env, 'http://127.0.0.1:5173/#/uf/SP'),
    )

    expect(nationalRoot(config)).toBe(
      'http://127.0.0.1:5173/publications/demo-sintetico-presidente-br-2t/',
    )
    expect(config.staleAfterMs).toBe(LOCAL_STALE_AFTER_MS)
    expect(config.pollIntervalMs).toBe(LOCAL_POLL_INTERVAL_MS)
  })

  it('deve tratar base só com espaços como ausente em desenvolvimento', () => {
    const env = { DEV: true, VITE_RESULTS_BASE_URL: '   ' }

    const config = ready(readResultsConfig(env, LOCAL_PAGE))

    expect(config.endpoint.root.pathname).toBe('/publications/')
  })

  it('deve recusar build sem base nem limiar, sem cair na ponte', () => {
    const env = { DEV: false }

    const config = readResultsConfig(env, LOCAL_PAGE)

    expect(config.status).toBe('invalid')
    expect(problems(config)).toEqual([
      'VITE_RESULTS_BASE_URL não foi definida neste build.',
      'VITE_RESULTS_STALE_AFTER_MS não foi definida neste build.',
      'VITE_RESULTS_POLL_INTERVAL_MS não foi definida neste build.',
    ])
  })

  it('deve recusar base vazia no build', () => {
    const env = build({ VITE_RESULTS_BASE_URL: '' })

    const config = readResultsConfig(env, PUBLIC_PAGE)

    expect(problems(config)).toEqual([
      'VITE_RESULTS_BASE_URL não foi definida neste build.',
    ])
  })

  it('deve aceitar https e montar base, prefixo e canal sem barra final', () => {
    const env = build()

    const config = ready(readResultsConfig(env, PUBLIC_PAGE))

    expect(nationalRoot(config)).toBe(
      `https://resultados.exemplo.invalid/publicacoes/${CHANNEL}/`,
    )
    expect(config.staleAfterMs).toBe(300_000)
    expect(config.pollIntervalMs).toBe(20_000)
  })

  it('deve produzir a mesma raiz com barra final na base', () => {
    const env = build({
      VITE_RESULTS_BASE_URL: 'https://resultados.exemplo.invalid/publicacoes/',
    })

    const config = ready(readResultsConfig(env, PUBLIC_PAGE))

    expect(nationalRoot(config)).toBe(
      `https://resultados.exemplo.invalid/publicacoes/${CHANNEL}/`,
    )
  })

  it('deve aceitar http só com a página e os dados em loopback', () => {
    const env = build({ VITE_RESULTS_BASE_URL: 'http://127.0.0.1:4174' })

    const config = ready(readResultsConfig(env, LOCAL_PAGE))

    expect(nationalRoot(config)).toBe(`http://127.0.0.1:4174/${CHANNEL}/`)
  })

  it.each([
    ['dados fora de loopback', 'http://resultados.exemplo.invalid', LOCAL_PAGE],
    ['página pública', 'http://127.0.0.1:4174', PUBLIC_PAGE],
    ['host que só começa com loopback', 'http://127.0.0.1.nip.io', LOCAL_PAGE],
  ])('deve recusar http com %s', (_case, base, page) => {
    const env = build({ VITE_RESULTS_BASE_URL: base })

    const config = readResultsConfig(env, page)

    expect(config.status).toBe('invalid')
  })

  it('deve recusar http em loopback quando a lista de loopback não foi definida', () => {
    const env = build({
      VITE_RESULTS_BASE_URL: 'http://127.0.0.1:4174',
      VITE_RESULTS_LOOPBACK_HOSTS: '',
    })

    const config = readResultsConfig(env, LOCAL_PAGE)

    expect(problems(config)).toEqual([
      'VITE_RESULTS_BASE_URL precisa usar https; http só vale com a página e os dados em loopback.',
    ])
  })

  it('deve recusar host de loopback que não está na lista da env', () => {
    const env = build({ VITE_RESULTS_BASE_URL: 'http://localhost:4174' })

    const config = readResultsConfig(env, 'http://localhost:4173/')

    expect(config.status).toBe('invalid')
  })

  it.each(['127.0.0.1:4174', 'http://127.0.0.1', '127.0.0.1/x'])(
    'deve recusar a lista de loopback com a entrada %j',
    (entry) => {
      const env = build({ VITE_RESULTS_LOOPBACK_HOSTS: entry })

      const config = readResultsConfig(env, PUBLIC_PAGE)

      expect(problems(config)).toEqual([
        'VITE_RESULTS_LOOPBACK_HOSTS precisa ser uma lista de hosts separados por vírgula.',
      ])
    },
  )

  it('deve exigir a lista de domínios bloqueados quando há base', () => {
    const env = build({ VITE_RESULTS_BLOCKED_DOMAINS: ' ' })

    const config = readResultsConfig(env, PUBLIC_PAGE)

    expect(problems(config)).toEqual([
      'VITE_RESULTS_BLOCKED_DOMAINS precisa listar os domínios que a base não pode usar.',
    ])
  })

  it.each([
    'https://tse.jus.br/',
    'https://resultados.tse.jus.br/',
    'https://RESULTADOS.TSE.JUS.BR/',
  ])('deve recusar base no domínio bloqueado %s', (base) => {
    const env = build({ VITE_RESULTS_BASE_URL: base })

    const config = readResultsConfig(env, PUBLIC_PAGE)

    expect(problems(config)).toEqual([
      'VITE_RESULTS_BASE_URL aponta para um domínio bloqueado em VITE_RESULTS_BLOCKED_DOMAINS.',
    ])
  })

  it('deve aceitar domínio que só termina com o texto bloqueado', () => {
    const env = build({
      VITE_RESULTS_BASE_URL: 'https://naotse.jus.br.exemplo.invalid/',
    })

    const config = readResultsConfig(env, PUBLIC_PAGE)

    expect(config.status).toBe('ready')
  })

  it.each([
    'file:///Users/alguem/publicacoes',
    'data:application/json,{}',
    'javascript:alert(1)',
    'ftp://resultados.exemplo.invalid/',
  ])('deve recusar o esquema de %s', (base) => {
    const env = build({ VITE_RESULTS_BASE_URL: base })

    const config = readResultsConfig(env, PUBLIC_PAGE)

    expect(config.status).toBe('invalid')
  })

  it.each([
    ['credenciais', 'https://usuario:senha@resultados.exemplo.invalid/'],
    ['query string', 'https://resultados.exemplo.invalid/?canal=x'],
    ['query vazia', 'https://resultados.exemplo.invalid/?'],
    ['fragmento', 'https://resultados.exemplo.invalid/#x'],
    ['caminho relativo', '/publications/'],
  ])('deve recusar base com %s', (_case, base) => {
    const env = build({ VITE_RESULTS_BASE_URL: base })

    const config = readResultsConfig(env, PUBLIC_PAGE)

    expect(config.status).toBe('invalid')
  })

  it.each(['', '../x', 'Canal', 'a/b', 'a--b'])(
    'deve recusar o canal %j',
    (channel) => {
      const env = build({ VITE_RESULTS_CHANNEL: channel })

      const config = readResultsConfig(env, PUBLIC_PAGE)

      expect(config.status).toBe('invalid')
    },
  )

  it.each([
    '0',
    '-1',
    '1.5',
    '12abc',
    ' 1e3',
    'NaN',
    'Infinity',
    '0x10',
    '9007199254740992',
  ])('deve recusar o limiar %j', (value) => {
    const env = build({ VITE_RESULTS_STALE_AFTER_MS: value })

    const config = readResultsConfig(env, PUBLIC_PAGE)

    expect(problems(config)).toEqual([
      'VITE_RESULTS_STALE_AFTER_MS precisa ser um inteiro positivo de milissegundos.',
    ])
  })

  it.each(['0', '-1', '1.5', '1e3'])(
    'deve recusar o intervalo de polling %j no build',
    (value) => {
      const env = build({ VITE_RESULTS_POLL_INTERVAL_MS: value })

      const config = readResultsConfig(env, PUBLIC_PAGE)

      expect(problems(config)).toEqual([
        'VITE_RESULTS_POLL_INTERVAL_MS precisa ser um inteiro positivo de milissegundos.',
      ])
    },
  )

  it('deve aceitar o limiar explícito em desenvolvimento', () => {
    const env = { DEV: true, VITE_RESULTS_STALE_AFTER_MS: ' 15000 ' }

    const config = ready(readResultsConfig(env, LOCAL_PAGE))

    expect(config.staleAfterMs).toBe(15_000)
  })
})

describe('channelSource', () => {
  const endpoint = {
    root: new URL('https://resultados.exemplo.invalid/p/'),
    channelPrefix: 'oficial',
    round: '2',
  }

  it.each([
    ['president', 'BR', 'oficial-presidente-br-2t'],
    ['president', 'SP', 'oficial-presidente-sp-2t'],
    ['governor', 'DF', 'oficial-governador-df-2t'],
  ] as const)('deve derivar o canal de %s em %s', (office, scope, channel) => {
    const source = channelSource(endpoint, office, scope)

    expect(source).toMatchObject({ channel, office, scope })
    expect(source.channelRoot.href).toBe(
      `https://resultados.exemplo.invalid/p/${channel}/`,
    )
  })
})

describe('readResultsConfig: canal nacional', () => {
  it.each([
    'oficial-governador-df-2t',
    'oficial-presidente-sp-2t',
    'oficial-presidente-br-3t',
    'presidente-br-2t',
  ])('deve recusar %j como canal nacional', (channel) => {
    const env = build({ VITE_RESULTS_CHANNEL: channel })

    const config = readResultsConfig(env, PUBLIC_PAGE)

    expect(problems(config)).toEqual([
      'VITE_RESULTS_CHANNEL precisa ser o canal nacional de presidente, no formato <prefixo>-presidente-br-<turno>t.',
    ])
  })

  it('deve usar o canal nacional configurado em desenvolvimento', () => {
    const env = { DEV: true, VITE_RESULTS_CHANNEL: 'oficial-presidente-br-1t' }

    const config = ready(readResultsConfig(env, LOCAL_PAGE))

    expect(config.endpoint).toMatchObject({
      channelPrefix: 'oficial',
      round: '1',
    })
  })
})

describe('resolveInChannel', () => {
  const endpoint = {
    channelRoot: new URL(`https://resultados.exemplo.invalid/p/${CHANNEL}/`),
    channel: CHANNEL,
    office: 'president' as const,
    scope: 'BR',
  }

  it('deve resolver o snapshot dentro do canal', () => {
    const url = resolveInChannel(endpoint, 'snapshots/abc.json')

    expect(url?.href).toBe(
      `https://resultados.exemplo.invalid/p/${CHANNEL}/snapshots/abc.json`,
    )
  })

  it.each([
    ['trocar o host', '//outro.exemplo.invalid/manifest.json'],
    ['trocar o protocolo', 'http://resultados.exemplo.invalid/p/x.json'],
    ['sair do canal', '../outro-canal/manifest.json'],
    ['sair do canal codificado', '%2e%2e/outro-canal/manifest.json'],
    ['escapar do prefixo', '/manifest.json'],
    ['usar outro esquema', 'javascript:alert(1)'],
    ['levar query', 'manifest.json?x=1'],
    ['apontar para o próprio canal', ''],
  ])('deve recusar referência que tenta %s', (_case, path) => {
    const url = resolveInChannel(endpoint, path)

    expect(url).toBeUndefined()
  })
})
