import path from 'node:path'

import {
  findSnapshotMismatches,
  publishManifestSchema,
  publishResultSnapshotSchema,
  snapshotPathFor,
  type Manifest,
  type ResultSnapshot,
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

export type PublishDocumentRequest = Omit<PublishRequest, 'inputPath'> & {
  document: unknown
  isUnchanged?: (current: ResultSnapshot) => boolean
  checkedAt?: string
  checkedAtMinIntervalMs?: number
}

export interface PublishResult {
  status: 'published' | 'checked' | 'unchanged'
  channelDirectory: string
  manifest: Manifest
}

const serialize = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

async function readInput(inputPath: string): Promise<unknown> {
  const content = await readLimitedFile(inputPath).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) {
      throw new CollectorError('NOT_FOUND', inputPath)
    }
    throw error
  })
  try {
    return JSON.parse(content.toString('utf8'))
  } catch (error) {
    throw new CollectorError('INVALID_JSON', inputPath, error)
  }
}

function validateDocument(document: unknown): ResultSnapshot {
  const parsed = publishResultSnapshotSchema.safeParse(document)
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

async function recordCheck(
  channelDirectory: string,
  previous: Manifest,
  current: ResultSnapshot,
  request: PublishDocumentRequest,
): Promise<PublishResult> {
  const latestCheck = previous.checkedAt ?? current.collectedAt
  const minIntervalMs = request.checkedAtMinIntervalMs ?? 0
  if (
    request.checkedAt === undefined ||
    Date.parse(request.checkedAt) <= Date.parse(latestCheck) ||
    Date.parse(request.checkedAt) - Date.parse(latestCheck) < minIntervalMs
  ) {
    return { status: 'unchanged', channelDirectory, manifest: previous }
  }
  const revision = previous.revision + 1
  if (!Number.isSafeInteger(revision)) {
    throw new CollectorError('REVISION_LIMIT', String(previous.revision))
  }
  const manifest = publishManifestSchema.parse({
    ...previous,
    revision,
    checkedAt: request.checkedAt,
  })
  await request.beforeManifestSwap?.()
  await replaceFile(
    path.join(channelDirectory, MANIFEST_FILE),
    serialize(manifest),
  )
  return { status: 'checked', channelDirectory, manifest }
}

export async function publishSnapshot({
  inputPath,
  ...request
}: PublishRequest): Promise<PublishResult> {
  return publishDocument({ ...request, document: await readInput(inputPath) })
}

export async function publishDocument(
  request: PublishDocumentRequest,
): Promise<PublishResult> {
  const snapshot = validateDocument(request.document)
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
    const current =
      previous &&
      request.isUnchanged &&
      (await loadSnapshot(channelDirectory, previous))
    if (previous && current && request.isUnchanged?.(current)) {
      return recordCheck(channelDirectory, previous, current, request)
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
