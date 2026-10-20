import {
  decideManifestUpdate,
  findSnapshotMismatches,
  readManifestSchema,
  readPresidentialSnapshotSchema,
  snapshotPathFor,
  type Manifest,
  type PresidentialSnapshot,
} from '@eleicoes/validation'

export const PUBLICATIONS_BASE = '/publications/'

export interface AcceptedPublication {
  manifest: Manifest
  snapshot: PresidentialSnapshot
}

export type RejectionReason =
  | 'manifest_missing'
  | 'invalid_manifest'
  | 'unexpected_contest'
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
  url: string,
  signal: AbortSignal,
): Promise<
  { status: 'ok'; body: unknown } | { status: 'missing' | 'invalid' }
> {
  const response = await fetcher(url, { cache: 'no-store', signal })
  if (response.status === 404) return { status: 'missing' }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  try {
    return { status: 'ok', body: await response.json() }
  } catch {
    return { status: 'invalid' }
  }
}

// Erro de rede ou HTTP inesperado é lançado; o resto vira rejeição explícita.
// Em nenhum caso o conjunto aceito anterior é alterado aqui.
export async function readPublication(
  accepted: AcceptedPublication | undefined,
  signal: AbortSignal,
  fetcher: Fetch = fetch,
): Promise<PublicationRead> {
  const manifestResponse = await fetchJson(
    fetcher,
    `${PUBLICATIONS_BASE}manifest.json`,
    signal,
  )
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
  const decision = decideManifestUpdate(accepted?.manifest, manifest.data)
  if (decision === 'same') return { outcome: 'same' }
  if (decision !== 'newer') return { outcome: 'rejected', reason: decision }

  const snapshotResponse = await fetchJson(
    fetcher,
    `${PUBLICATIONS_BASE}${snapshotPathFor(manifest.data.current.dataVersion)}`,
    signal,
  )
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
