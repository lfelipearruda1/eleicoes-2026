import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TSE_CAPTURE_FILES } from '../../src/constants.js'
import {
  configUrl,
  parseElectionConfig,
  parseTarget,
  resultFileUrl,
  selectElection,
} from '../../src/tse/ea11.js'
import { runTseOnce } from '../../src/tse/run.js'
import { thrownBy } from './failures.js'
import {
  PRESIDENT_BR,
  HOST,
  RESULT_URL,
  syntheticElection,
  syntheticConfig,
  syntheticCandidate,
  syntheticResult,
  json,
  fakeTransport,
} from './tseFixtures.js'

let output: string

beforeEach(async () => {
  output = await mkdtemp(path.join(tmpdir(), 'eleicoes-tse-spec-'))
})

afterEach(async () => {
  await rm(output, { recursive: true, force: true })
})

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
    expect(calls[1]?.url).toBe(
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

  it.each(['Federal\n[ERRO] falso', 'Federal\u001b[31m', 'x'.repeat(201)])(
    'deve recusar nome de eleição %j com caractere de controle ou longo demais',
    (nm) => {
      const config = syntheticConfig([
        { ...syntheticElection('9002', '2'), nm },
      ])

      const error = thrownBy(() => parseElectionConfig(config))

      expect(error.code).toBe('INVALID_TSE_CONFIG')
      expect(error.message).toContain('pl.0.e.0.nm')
    },
  )

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
