import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TSE_CAPTURE_FILES } from '../../src/constants.js'
import { configUrl } from '../../src/tse/ea11.js'
import type { Transport } from '../../src/tse/http.js'
import { runTseOnce, runTseReplay } from '../../src/tse/run.js'
import { errorOf } from './failures.js'
import {
  RESULT_URL,
  syntheticResult,
  json,
  fakeTransport,
  tseResponder,
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

const runOnce = (transport: Transport, source = 'official') =>
  runTseOnce({ source, round: '2', output, transport, minIntervalMs: 0 })

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
    const runs = await readdir(path.join(output, 'official'))
    const configRun = runs.find(
      (entry) =>
        entry !== path.basename(run.runDirectory) &&
        entry !== TSE_CAPTURE_FILES.lastValid,
    )
    expect(run.validation).toBe('valid')
    expect((await readdir(run.runDirectory)).sort()).toEqual(
      [
        TSE_CAPTURE_FILES.metadata,
        TSE_CAPTURE_FILES.result,
        TSE_CAPTURE_FILES.summary,
      ].sort(),
    )
    expect(
      (await readdir(path.join(output, 'official', configRun ?? ''))).sort(),
    ).toEqual([TSE_CAPTURE_FILES.config, TSE_CAPTURE_FILES.metadata].sort())
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

    const runs = (await readdir(sourceDirectory)).filter(
      (entry) =>
        entry !== path.basename(valid.runDirectory) &&
        entry !== TSE_CAPTURE_FILES.lastValid,
    )
    const listings = await Promise.all(
      runs.map((entry) => readdir(path.join(sourceDirectory, entry))),
    )
    const rejectedRun = runs.find((_entry, index) =>
      listings[index]?.includes(TSE_CAPTURE_FILES.rejected),
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
