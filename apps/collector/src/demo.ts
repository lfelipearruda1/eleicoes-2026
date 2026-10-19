import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { SnapshotEnvelope } from '@eleicoes/validation'

import { DEMO_CHANNEL, DEMO_NOTICE } from './constants.js'
import { CollectorError } from './error.js'
import { publishSnapshot } from './publication/publish.js'
import { readPublication } from './publication/read.js'
import { listSnapshots } from './publication/storage.js'

const syntheticEnvelope = (): SnapshotEnvelope => ({
  contractVersion: 1,
  dataVersion: randomUUID(),
  environment: 'local',
  sourceEnvironment: 'simulated',
  round: 2,
  office: 'president',
  scope: 'BR',
  availability: 'unknown',
  collectedAt: '2026-01-01T00:00:00Z',
  source: { file: 'sintetico/demo.json' },
})

export async function runDemo(baseDirectory = tmpdir()) {
  await mkdir(baseDirectory, { recursive: true, mode: 0o700 })
  const root = await mkdtemp(
    path.join(path.resolve(baseDirectory), 'eleicoes-demo-'),
  )
  const writeInput = async (name: string) => {
    const inputPath = path.join(root, `${name}.json`)
    await writeFile(inputPath, JSON.stringify(syntheticEnvelope()))
    return inputPath
  }
  const inputA = await writeInput('a')
  const inputB = await writeInput('b')

  const publish = async (inputPath: string) => {
    try {
      const { status, manifest } = await publishSnapshot({
        root,
        channel: DEMO_CHANNEL,
        inputPath,
      })
      return {
        status,
        revision: manifest.revision,
        dataVersion: manifest.current.dataVersion,
      }
    } catch (error) {
      if (error instanceof CollectorError) return { rejected: error.code }
      throw error
    }
  }
  const read = async () => {
    const { manifest } = await readPublication(root, DEMO_CHANNEL)
    return {
      revision: manifest.revision,
      dataVersion: manifest.current.dataVersion,
    }
  }

  return {
    notice: DEMO_NOTICE,
    root,
    channel: DEMO_CHANNEL,
    publishA: await publish(inputA),
    readA: await read(),
    repeatA: await publish(inputA),
    publishB: await publish(inputB),
    readB: await read(),
    reactivateA: await publish(inputA),
    readAfterReactivation: await read(),
    history: await listSnapshots(path.join(root, DEMO_CHANNEL)),
  }
}
