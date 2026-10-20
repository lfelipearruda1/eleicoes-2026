import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runCli } from '../../src/cli.js'
import {
  DEMO_CHANNEL,
  DEMO_NOTICE,
  EXIT_CODE,
  HELP,
} from '../../src/constants.js'

let workDirectory: string
let printed: string[]
let errors: string[]

const run = (argv: string[]) =>
  runCli(
    argv,
    (line) => printed.push(line),
    (line) => errors.push(line),
  )

beforeEach(async () => {
  workDirectory = await mkdtemp(path.join(tmpdir(), 'eleicoes-cli-spec-'))
  printed = []
  errors = []
})

afterEach(async () => {
  await rm(workDirectory, { recursive: true, force: true })
})

describe('runCli', () => {
  it('deve mostrar a ajuda sem argumentos e não escrever em disco', async () => {
    const exitCode = await run([])

    expect(exitCode).toBe(EXIT_CODE.success)
    expect(printed).toEqual([HELP])
    expect(await readdir(workDirectory)).toEqual([])
  })

  it('deve recusar publish sem as opções obrigatórias', async () => {
    const exitCode = await run(['publish', '--out', workDirectory])

    expect(exitCode).toBe(EXIT_CODE.usage)
    expect(errors.join()).toContain('--channel, --input')
  })

  it('deve recusar comando desconhecido', async () => {
    const exitCode = await run(['publicar'])

    expect(exitCode).toBe(EXIT_CODE.usage)
  })

  it('deve recusar opção desconhecida', async () => {
    const exitCode = await run(['publish', '--saida', workDirectory])

    expect(exitCode).toBe(EXIT_CODE.usage)
  })

  it('deve executar a demonstração presidencial só com fixtures do repositório', async () => {
    const exitCode = await run(['president-demo', '--output', workDirectory])

    const report = JSON.parse(printed[0])
    expect(exitCode).toBe(EXIT_CODE.success)
    expect(report.notice).toBe(DEMO_NOTICE)
    expect(report.steps).toMatchObject([
      { status: 'published', revision: 1, availability: 'pending' },
      { status: 'published', revision: 2, availability: 'pending' },
      { status: 'published', revision: 3, availability: 'available' },
      { status: 'unchanged', revision: 3 },
      { status: 'published', revision: 4, availability: 'available' },
      { rejected: 'INVALID_TSE_RESULT' },
    ])
    expect(report.final.manifest.revision).toBe(4)
    expect(report.final.snapshot.candidates).toHaveLength(2)
    expect(report.history).toHaveLength(4)
  })

  it('deve recusar president-publish sem as opções obrigatórias', async () => {
    const exitCode = await run(['president-publish', '--output', workDirectory])

    expect(exitCode).toBe(EXIT_CODE.usage)
    expect(errors.join()).toContain('--capture, --channel')
  })

  it('deve inspecionar o canal publicado pela demonstração', async () => {
    await run(['president-demo', '--output', workDirectory])
    const { root } = JSON.parse(printed[0])
    printed = []

    const exitCode = await run([
      'inspect',
      '--out',
      root,
      '--channel',
      DEMO_CHANNEL,
    ])

    expect(exitCode).toBe(EXIT_CODE.success)
    expect(JSON.parse(printed[0]).manifest.revision).toBe(4)
  })
})
