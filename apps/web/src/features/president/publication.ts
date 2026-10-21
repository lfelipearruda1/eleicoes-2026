import {
  decideManifestUpdate,
  findSnapshotMismatches,
  readManifestSchema,
  readResultSnapshotSchema,
  snapshotPathFor,
  type Manifest,
  type ResultSnapshot,
  type SnapshotEnvelope,
} from '@eleicoes/validation'

import { resolveInChannel, type ChannelSource } from './resultsConfig.ts'

export interface AcceptedPublication<
  T extends SnapshotEnvelope = ResultSnapshot,
> {
  manifest: Manifest
  snapshot: T
}

export interface SnapshotSchema<T> {
  safeParse: (value: unknown) => { success: boolean; data?: T }
}

export type RejectionReason =
  | 'manifest_missing'
  | 'invalid_manifest'
  | 'unexpected_contest'
  | 'unexpected_channel'
  | 'stale'
  | 'conflict'
  | 'incomparable'
  | 'snapshot_missing'
  | 'invalid_snapshot'
  | 'snapshot_mismatch'

export type PublicationRead<T extends SnapshotEnvelope = ResultSnapshot> =
  | { outcome: 'accepted'; publication: AcceptedPublication<T> }
  | { outcome: 'same' }
  | { outcome: 'rejected'; reason: RejectionReason }

type Fetch = typeof fetch

async function fetchJson(
  fetcher: Fetch,
  url: URL,
  signal: AbortSignal,
): Promise<
  { status: 'ok'; body: unknown } | { status: 'missing' | 'invalid' }
> {
  const response = await fetcher(url.href, {
    cache: 'no-store',
    credentials: 'omit',
    mode: 'cors',
    redirect: 'error',
    signal,
  })
  if (response.status === 404) return { status: 'missing' }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  try {
    return { status: 'ok', body: await response.json() }
  } catch {
    return { status: 'invalid' }
  }
}

export async function readPublication<
  T extends SnapshotEnvelope = ResultSnapshot,
>(
  accepted: AcceptedPublication<T> | undefined,
  signal: AbortSignal,
  source: ChannelSource,
  fetcher: Fetch = fetch,
  schema: SnapshotSchema<T> = readResultSnapshotSchema as SnapshotSchema<T>,
): Promise<PublicationRead<T>> {
  const manifestUrl = resolveInChannel(source, 'manifest.json')
  if (!manifestUrl) return { outcome: 'rejected', reason: 'invalid_manifest' }
  const manifestResponse = await fetchJson(fetcher, manifestUrl, signal)
  if (manifestResponse.status === 'missing') {
    return { outcome: 'rejected', reason: 'manifest_missing' }
  }
  const manifest =
    manifestResponse.status === 'ok'
      ? readManifestSchema.safeParse(manifestResponse.body)
      : undefined
  if (!manifest?.success) {
    return { outcome: 'rejected', reason: 'invalid_manifest' }
  }
  if (
    manifest.data.office !== source.office ||
    manifest.data.scope !== source.scope
  ) {
    return { outcome: 'rejected', reason: 'unexpected_contest' }
  }
  if (manifest.data.channel !== source.channel) {
    return { outcome: 'rejected', reason: 'unexpected_channel' }
  }
  const decision = decideManifestUpdate(accepted?.manifest, manifest.data)
  if (decision === 'same') return { outcome: 'same' }
  if (decision !== 'newer') return { outcome: 'rejected', reason: decision }
  if (
    accepted?.manifest.current.dataVersion === manifest.data.current.dataVersion
  ) {
    return {
      outcome: 'accepted',
      publication: { manifest: manifest.data, snapshot: accepted.snapshot },
    }
  }

  const snapshotUrl = resolveInChannel(
    source,
    snapshotPathFor(manifest.data.current.dataVersion),
  )
  if (!snapshotUrl) return { outcome: 'rejected', reason: 'invalid_manifest' }
  const snapshotResponse = await fetchJson(fetcher, snapshotUrl, signal)
  if (snapshotResponse.status === 'missing') {
    return { outcome: 'rejected', reason: 'snapshot_missing' }
  }
  const snapshot =
    snapshotResponse.status === 'ok'
      ? schema.safeParse(snapshotResponse.body)
      : undefined
  if (!snapshot?.success || snapshot.data === undefined) {
    return { outcome: 'rejected', reason: 'invalid_snapshot' }
  }
  if (findSnapshotMismatches(manifest.data, snapshot.data).length > 0) {
    return { outcome: 'rejected', reason: 'snapshot_mismatch' }
  }
  return {
    outcome: 'accepted',
    publication: { manifest: manifest.data, snapshot: snapshot.data },
  }
}
