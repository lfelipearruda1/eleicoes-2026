import path from 'node:path'

import {
  decideManifestUpdate,
  findSnapshotMismatches,
  readManifestSchema,
  readResultSnapshotSchema,
  type Manifest,
  type ManifestUpdateDecision,
  type ResultSnapshot,
  type SnapshotEnvelope,
} from '@eleicoes/validation'

import { MANIFEST_FILE } from '../constants.js'
import { CollectorError } from '../error.js'
import {
  hasErrorCode,
  readLimitedFile,
  resolveChannelDirectory,
} from './storage.js'

async function readValidJson<T>(
  filePath: string,
  schema: { parse: (value: unknown) => T },
): Promise<T | undefined> {
  const content = await readLimitedFile(filePath).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) return undefined
    throw error
  })
  if (content === undefined) return undefined
  try {
    return schema.parse(JSON.parse(content.toString('utf8')))
  } catch (error) {
    throw new CollectorError('CORRUPTED_FILE', filePath, error)
  }
}

export async function readManifest(
  channelDirectory: string,
  channel: string,
): Promise<Manifest | undefined> {
  const manifestPath = path.join(channelDirectory, MANIFEST_FILE)
  const manifest = await readValidJson(manifestPath, readManifestSchema)
  if (manifest !== undefined && manifest.channel !== channel) {
    throw new CollectorError('FOREIGN_MANIFEST', manifestPath)
  }
  return manifest
}

export interface SnapshotSchema<T> {
  parse: (value: unknown) => T
}

export async function loadSnapshot<T extends SnapshotEnvelope = ResultSnapshot>(
  channelDirectory: string,
  manifest: Manifest,
  schema: SnapshotSchema<T> = readResultSnapshotSchema as unknown as SnapshotSchema<T>,
): Promise<T> {
  const snapshotPath = path.join(channelDirectory, manifest.current.path)
  const snapshot = await readValidJson(snapshotPath, schema)
  if (snapshot === undefined) {
    throw new CollectorError('NOT_FOUND', snapshotPath)
  }
  const mismatches = findSnapshotMismatches(manifest, snapshot)
  if (mismatches.length > 0) {
    throw new CollectorError('SNAPSHOT_MISMATCH', mismatches.join(', '))
  }
  return snapshot
}

export async function readPublication<
  T extends SnapshotEnvelope = ResultSnapshot,
>(root: string, channel: string, schema?: SnapshotSchema<T>) {
  const channelDirectory = await resolveChannelDirectory(root, channel, false)
  const manifest = await readManifest(channelDirectory, channel)
  if (manifest === undefined) {
    throw new CollectorError(
      'NOT_FOUND',
      path.join(channelDirectory, MANIFEST_FILE),
    )
  }
  const snapshot = await loadSnapshot<T>(channelDirectory, manifest, schema)
  return { channelDirectory, manifest, snapshot }
}

export interface AcceptedState {
  manifest: Manifest
  snapshot: ResultSnapshot
}

export type RefreshOutcome =
  'accepted' | 'unavailable' | Exclude<ManifestUpdateDecision, 'newer'>

export async function refreshAcceptedState(
  root: string,
  channel: string,
  accepted: AcceptedState | undefined,
): Promise<{ state: AcceptedState | undefined; outcome: RefreshOutcome }> {
  try {
    const channelDirectory = await resolveChannelDirectory(root, channel, false)
    const manifest = await readManifest(channelDirectory, channel)
    if (manifest === undefined) {
      return { state: accepted, outcome: 'unavailable' }
    }
    const decision = decideManifestUpdate(accepted?.manifest, manifest)
    if (decision !== 'newer') {
      return { state: accepted, outcome: decision }
    }
    const snapshot = await loadSnapshot(channelDirectory, manifest)
    return { state: { manifest, snapshot }, outcome: 'accepted' }
  } catch {
    return { state: accepted, outcome: 'unavailable' }
  }
}
