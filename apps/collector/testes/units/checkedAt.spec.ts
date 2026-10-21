import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEMO_CHANNEL } from '../../src/constants.js'
import { publishResultCapture } from '../../src/president/publish.js'
import { readPublication } from '../../src/publication/read.js'
import { listSnapshots } from '../../src/publication/storage.js'
import { errorOf } from './failures.js'
import {
  OFFICIAL_CHANNEL,
  OFFICIAL_URL,
  rawResult,
  setupPublishWorkspace,
} from './presidentFixtures.js'

describe('publishResultCapture: checkedAt', () => {
  const {
    workspace,
    publishFixture,
    manifestText,
    copyFixture,
    officialCapture,
  } = setupPublishWorkspace()

  const FIRST_CHECK = '2026-10-25T21:00:01.500Z'
  const officialRequest = (requestedAt: string) => ({
    url: OFFICIAL_URL,
    requestedAt,
    status: 200,
  })

  async function recheck(
    capture: string,
    request: Record<string, unknown>,
    result: Record<string, unknown> = rawResult(),
  ) {
    const metadataPath = path.join(capture, 'metadata.json')
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    await writeFile(
      metadataPath,
      JSON.stringify({ ...metadata, requests: [request] }),
    )
    await writeFile(path.join(capture, 'result.json'), JSON.stringify(result))
    return publishResultCapture({
      capture,
      output: workspace.output,
      channel: OFFICIAL_CHANNEL,
    })
  }

  const officialManifestText = () => manifestText(OFFICIAL_CHANNEL)

  it('deve registrar a nova consulta oficial sem mudança como checkedAt na revisão seguinte', async () => {
    const capture = await officialCapture([officialRequest(FIRST_CHECK)])
    const first = await publishResultCapture({
      capture,
      output: workspace.output,
      channel: OFFICIAL_CHANNEL,
    })

    const result = await recheck(
      capture,
      officialRequest('2026-10-25T21:05:00Z'),
    )

    const { manifest } = await readPublication(
      workspace.output,
      OFFICIAL_CHANNEL,
    )
    expect(result).toMatchObject({
      status: 'checked',
      revision: 2,
      dataVersion: first.dataVersion,
      publishedAt: first.publishedAt,
      checkedAt: '2026-10-25T21:05:00Z',
    })
    expect(manifest.checkedAt).toBe('2026-10-25T21:05:00Z')
    expect(
      await listSnapshots(path.join(workspace.output, OFFICIAL_CHANNEL)),
    ).toHaveLength(1)
  })

  it('deve registrar a verificação respondida com 304', async () => {
    const capture = await officialCapture([officialRequest(FIRST_CHECK)])
    await publishResultCapture({
      capture,
      output: workspace.output,
      channel: OFFICIAL_CHANNEL,
    })

    const result = await recheck(capture, {
      url: OFFICIAL_URL,
      requestedAt: '2026-10-25T21:06:00Z',
      status: 304,
      reusedCapture: 'run-1/result.json',
    })

    expect(result).toMatchObject({
      status: 'checked',
      checkedAt: '2026-10-25T21:06:00Z',
    })
  })

  it('deve não regravar o manifesto com consulta igual ou mais antiga', async () => {
    const capture = await officialCapture([officialRequest(FIRST_CHECK)])
    await publishResultCapture({
      capture,
      output: workspace.output,
      channel: OFFICIAL_CHANNEL,
    })
    await recheck(capture, officialRequest('2026-10-25T21:05:00Z'))
    const before = await officialManifestText()

    const same = await recheck(capture, officialRequest('2026-10-25T21:05:00Z'))
    const older = await recheck(
      capture,
      officialRequest('2026-10-25T21:04:00Z'),
    )

    expect(same.status).toBe('unchanged')
    expect(older.status).toBe('unchanged')
    expect(await officialManifestText()).toBe(before)
  })

  it('deve não copiar checkedAt para uma versão nova', async () => {
    const capture = await officialCapture([officialRequest(FIRST_CHECK)])
    await publishResultCapture({
      capture,
      output: workspace.output,
      channel: OFFICIAL_CHANNEL,
    })
    await recheck(capture, officialRequest('2026-10-25T21:05:00Z'))

    const result = await recheck(
      capture,
      officialRequest('2026-10-25T21:10:00Z'),
      rawResult({ s: { ts: '400', st: '300', pst: '75,00' } }),
    )

    const { manifest } = await readPublication(
      workspace.output,
      OFFICIAL_CHANNEL,
    )
    expect(result).toMatchObject({ status: 'published', revision: 3 })
    expect(manifest.checkedAt).toBeUndefined()
  })

  it('deve manter o manifesto quando a gravação da verificação falha', async () => {
    const capture = await officialCapture([officialRequest(FIRST_CHECK)])
    await publishResultCapture({
      capture,
      output: workspace.output,
      channel: OFFICIAL_CHANNEL,
    })
    const before = await officialManifestText()
    const metadataPath = path.join(capture, 'metadata.json')
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    await writeFile(
      metadataPath,
      JSON.stringify({
        ...metadata,
        requests: [officialRequest('2026-10-25T21:05:00Z')],
      }),
    )

    await errorOf(
      publishResultCapture({
        capture,
        output: workspace.output,
        channel: OFFICIAL_CHANNEL,
        beforeManifestSwap: async () => {
          throw new Error('falha injetada')
        },
      }),
    )

    expect(await officialManifestText()).toBe(before)
  })

  it('deve não registrar checkedAt a partir de captura sintética', async () => {
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
    expect(result.checkedAt).toBeUndefined()
  })
})
