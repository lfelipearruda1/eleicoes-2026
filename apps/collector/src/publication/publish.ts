import path from 'node:path'

import {
  findSnapshotMismatches,
  publishEnvelopeSchema,
  publishManifestSchema,
  snapshotPathFor,
  type Manifest,
} from '@eleicoes/validation'

import { MANIFEST_FILE } from '../constants.js'
import { CollectorError } from '../error.js'
import { loadSnapshot, readManifest } from './read.js'
import {
  hasErrorCode,
  listSnapshots,
  readLimitedFile,
  replaceFile,
  resolveChannelDirectory,
  withChannelLock,
  writeFileIfAbsent,
} from './storage.js'

export interface PublishRequest {
  root: string
  channel: string
  inputPath: string
  now?: () => Date
  beforeManifestSwap?: () => Promise<void>
}

export interface PublishResult {
  status: 'published' | 'unchanged'
  channelDirectory: string
  manifest: Manifest
}

const serialize = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

async function readInput(inputPath: string) {
  const content = await readLimitedFile(inputPath).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) {
      throw new CollectorError('NOT_FOUND', inputPath)
    }
    throw error
  })
  let document: unknown
  try {
    document = JSON.parse(content.toString('utf8'))
  } catch (error) {
    throw new CollectorError('INVALID_JSON', inputPath, error)
  }
  const parsed = publishEnvelopeSchema.safeParse(document)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.'))
    throw new CollectorError(
      'INVALID_DOCUMENT',
      [...new Set(fields)].join(', '),
    )
  }
  if (parsed.data.environment !== 'local') {
    throw new CollectorError('UNSUPPORTED_ENVIRONMENT', parsed.data.environment)
  }
  return parsed.data
}

export async function publishSnapshot(
  request: PublishRequest,
): Promise<PublishResult> {
  const snapshot = await readInput(request.inputPath)
  const channelDirectory = await resolveChannelDirectory(
    request.root,
    request.channel,
    true,
  )

  return withChannelLock(channelDirectory, async () => {
    const previous = await readManifest(channelDirectory, request.channel)
    if (
      previous === undefined &&
      (await listSnapshots(channelDirectory)).length > 0
    ) {
      throw new CollectorError('MANIFEST_MISSING', channelDirectory)
    }
    const contextMismatches = previous
      ? findSnapshotMismatches(previous, snapshot).filter(
          (field) => field !== 'dataVersion',
        )
      : []
    if (contextMismatches.length > 0) {
      throw new CollectorError('CHANNEL_MISMATCH', contextMismatches.join(', '))
    }

    const content = serialize(snapshot)
    const snapshotPath = path.join(
      channelDirectory,
      snapshotPathFor(snapshot.dataVersion),
    )
    const isCurrent = previous?.current.dataVersion === snapshot.dataVersion
    const revision = (previous?.revision ?? 0) + 1
    if (!isCurrent && !Number.isSafeInteger(revision)) {
      throw new CollectorError('REVISION_LIMIT', String(previous?.revision))
    }
    const isNew = !isCurrent && (await writeFileIfAbsent(snapshotPath, content))
    if (!isNew) {
      const existing = await readLimitedFile(snapshotPath)
      if (!existing.equals(Buffer.from(content))) {
        throw new CollectorError('VERSION_CONFLICT', snapshot.dataVersion)
      }
      if (isCurrent && previous) {
        return { status: 'unchanged', channelDirectory, manifest: previous }
      }
      throw new CollectorError('VERSION_NOT_CURRENT', snapshot.dataVersion)
    }

    const manifest = publishManifestSchema.parse({
      contractVersion: 1,
      channel: request.channel,
      revision,
      environment: snapshot.environment,
      sourceEnvironment: snapshot.sourceEnvironment,
      round: snapshot.round,
      office: snapshot.office,
      scope: snapshot.scope,
      current: {
        dataVersion: snapshot.dataVersion,
        path: snapshotPathFor(snapshot.dataVersion),
        publishedAt: (request.now?.() ?? new Date()).toISOString(),
      },
    })
    await loadSnapshot(channelDirectory, manifest)
    await request.beforeManifestSwap?.()
    await replaceFile(
      path.join(channelDirectory, MANIFEST_FILE),
      serialize(manifest),
    )
    return { status: 'published', channelDirectory, manifest }
  })
}
