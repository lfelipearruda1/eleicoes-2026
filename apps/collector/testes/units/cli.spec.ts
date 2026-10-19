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

  it('deve executar a demonstração A, repetição, B e recusa de A', async () => {
    const exitCode = await run(['demo', '--out', workDirectory])

    const report = JSON.parse(printed[0])
    expect(exitCode).toBe(EXIT_CODE.success)
    expect(report.notice).toBe(DEMO_NOTICE)
    expect(report.publishA).toMatchObject({ status: 'published', revision: 1 })
    expect(report.repeatA).toMatchObject({ status: 'unchanged', revision: 1 })
    expect(report.publishB).toMatchObject({ status: 'published', revision: 2 })
    expect(report.reactivateA).toEqual({ rejected: 'VERSION_NOT_CURRENT' })
    expect(report.readAfterReactivation.dataVersion).toBe(
      report.publishB.dataVersion,
    )
    expect(report.history).toHaveLength(2)
  })

  it('deve inspecionar o canal publicado pela demonstração', async () => {
    await run(['demo', '--out', workDirectory])
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
    expect(JSON.parse(printed[0]).manifest.revision).toBe(2)
  })
})
