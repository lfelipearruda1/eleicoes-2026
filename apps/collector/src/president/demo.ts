import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEMO_CHANNEL, DEMO_NOTICE } from '../constants.js'
import { CollectorError } from '../error.js'
import { readPublication } from '../publication/read.js'
import { listSnapshots } from '../publication/storage.js'
import { publishPresidentialCapture } from './publish.js'

export const DEMO_FIXTURES = fileURLToPath(
  new URL('../../fixtures/president-synthetic/', import.meta.url),
)

const DEMO_STEPS = [
  '01-nao-iniciada',
  '02-aguardando-liberacao',
  '03-parcial',
  '03-parcial',
  '04-parcial-atualizada',
  '05-invalida',
]

export async function runPresidentialDemo(baseDirectory = tmpdir()) {
  await mkdir(baseDirectory, { recursive: true, mode: 0o700 })
  const root = await mkdtemp(
    path.join(path.resolve(baseDirectory), 'eleicoes-demo-'),
  )
  const steps = []
  for (const capture of DEMO_STEPS) {
    try {
      const result = await publishPresidentialCapture({
        capture: path.join(DEMO_FIXTURES, capture),
        output: root,
        channel: DEMO_CHANNEL,
      })
      steps.push({
        capture,
        status: result.status,
        revision: result.revision,
        dataVersion: result.dataVersion,
        availability: result.snapshot.availability,
        ...(result.snapshot.availability === 'pending' && {
          pendingReason: result.snapshot.pendingReason,
        }),
      })
    } catch (error) {
      if (!(error instanceof CollectorError)) throw error
      steps.push({ capture, rejected: error.code })
    }
  }
  const { channelDirectory, manifest, snapshot } = await readPublication(
    root,
    DEMO_CHANNEL,
  )
  return {
    notice: DEMO_NOTICE,
    root,
    channel: DEMO_CHANNEL,
    steps,
    final: { manifest, snapshot },
    history: await listSnapshots(channelDirectory),
  }
}
