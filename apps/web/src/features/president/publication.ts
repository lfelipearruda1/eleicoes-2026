import {
  decideManifestUpdate,
  findSnapshotMismatches,
  readManifestSchema,
  readPresidentialSnapshotSchema,
  snapshotPathFor,
  type Manifest,
  type PresidentialSnapshot,
} from '@eleicoes/validation'

import { resolveInChannel, type ResultsEndpoint } from './resultsConfig.ts'

export interface AcceptedPublication {
  manifest: Manifest
  snapshot: PresidentialSnapshot
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

export type PublicationRead =
  | { outcome: 'accepted'; publication: AcceptedPublication }
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

export async function readPublication(
  accepted: AcceptedPublication | undefined,
  signal: AbortSignal,
  endpoint: ResultsEndpoint,
  fetcher: Fetch = fetch,
): Promise<PublicationRead> {
  const manifestUrl = resolveInChannel(endpoint, 'manifest.json')
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
  if (manifest.data.office !== 'president' || manifest.data.scope !== 'BR') {
    return { outcome: 'rejected', reason: 'unexpected_contest' }
  }
  if (endpoint.channel && manifest.data.channel !== endpoint.channel) {
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
    endpoint,
    snapshotPathFor(manifest.data.current.dataVersion),
  )
  if (!snapshotUrl) return { outcome: 'rejected', reason: 'invalid_manifest' }
  const snapshotResponse = await fetchJson(fetcher, snapshotUrl, signal)
  if (snapshotResponse.status === 'missing') {
    return { outcome: 'rejected', reason: 'snapshot_missing' }
  }
  const snapshot =
    snapshotResponse.status === 'ok'
      ? readPresidentialSnapshotSchema.safeParse(snapshotResponse.body)
      : undefined
  if (!snapshot?.success) {
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
