import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEMO_CHANNEL } from '../../src/constants.js'
import { DEMO_FIXTURES } from '../../src/president/demo.js'
import { publishResultCapture } from '../../src/president/publish.js'
import { readPublication } from '../../src/publication/read.js'
import { listSnapshots } from '../../src/publication/storage.js'
import { errorOf } from './failures.js'
import { OFFICIAL_CHANNEL, setupPublishWorkspace } from './presidentFixtures.js'

describe('publishResultCapture', () => {
  const { workspace, fixture, publishFixture, manifestText, copyFixture } =
    setupPublishWorkspace()

  it('deve publicar a primeira versão e ler o payload persistido', async () => {
    const result = await publishFixture('03-parcial')

    const { snapshot } = await readPublication(workspace.output, DEMO_CHANNEL)
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
    expect(
      await listSnapshots(path.join(workspace.output, DEMO_CHANNEL)),
    ).toHaveLength(1)
  })

  it('deve tratar nova coleta com o mesmo conteúdo como verificação, sem versão nova', async () => {
    await publishFixture('03-parcial')
    const recollected = await copyFixture('03-parcial', (metadata) => {
      metadata.collectedAt = '2026-10-25T23:59:00Z'
    })

    const result = await publishResultCapture({
      capture: recollected,
      output: workspace.output,
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

    const { snapshot } = await readPublication(workspace.output, DEMO_CHANNEL)
    expect(error.code).toBe('INVALID_TSE_RESULT')
    expect(await manifestText()).toBe(before)
    expect(snapshot.dataVersion).toBe(first.dataVersion)
  })

  it('deve preservar a versão anterior quando a publicação falha antes da troca', async () => {
    const first = await publishFixture('03-parcial')
    const before = await manifestText()

    await errorOf(
      publishResultCapture({
        capture: fixture('04-parcial-atualizada'),
        output: workspace.output,
        channel: DEMO_CHANNEL,
        beforeManifestSwap: async () => {
          throw new Error('falha injetada')
        },
      }),
    )

    const { snapshot } = await readPublication(workspace.output, DEMO_CHANNEL)
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
      publishResultCapture({
        capture: firstRound,
        output: workspace.output,
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
      publishResultCapture({
        capture: mismatched,
        output: workspace.output,
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
      publishResultCapture({
        capture: replay,
        output: workspace.output,
        channel: DEMO_CHANNEL,
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
