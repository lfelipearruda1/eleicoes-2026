import { describe, expect, it } from 'vitest'

import {
  readPublication,
  type AcceptedPublication,
} from '../../src/features/president/publication.ts'
import {
  availableSnapshot,
  DATA_VERSION_A,
  DATA_VERSION_B,
  fakeServer,
  manifestFor,
  pendingSnapshot,
  TEST_ENDPOINT,
} from './fixtures.ts'

const signal = new AbortController().signal

const acceptedFrom = (
  snapshot = pendingSnapshot(),
  revision = 1,
): AcceptedPublication => ({
  manifest: manifestFor(snapshot, revision),
  snapshot,
})

describe('readPublication', () => {
  it('deve aceitar manifesto e snapshot válidos e correspondentes', async () => {
    const snapshot = availableSnapshot()
    const server = fakeServer()
    server.publish(manifestFor(snapshot), snapshot)

    const result = await readPublication(
      undefined,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({
      outcome: 'accepted',
      publication: { manifest: manifestFor(snapshot), snapshot },
    })
  })

  it('deve não buscar o snapshot quando o manifesto não mudou', async () => {
    const accepted = acceptedFrom()
    const server = fakeServer()
    server.publish(accepted.manifest, accepted.snapshot)

    const result = await readPublication(
      accepted,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'same' })
    expect(server.calls).toEqual(['/publications/manifest.json'])
  })

  it('deve reaproveitar o snapshot aceito quando a revisão nova mantém a dataVersion', async () => {
    const accepted = acceptedFrom(availableSnapshot(), 1)
    const server = fakeServer()
    server.publish(manifestFor(accepted.snapshot, 2))

    const result = await readPublication(
      accepted,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({
      outcome: 'accepted',
      publication: {
        manifest: manifestFor(accepted.snapshot, 2),
        snapshot: accepted.snapshot,
      },
    })
    expect(server.calls).toEqual(['/publications/manifest.json'])
  })

  it('deve recusar como conflito a mesma revisão com conteúdo diferente', async () => {
    const accepted = acceptedFrom(pendingSnapshot(), 2)
    const other = availableSnapshot({ dataVersion: DATA_VERSION_B })
    const server = fakeServer()
    server.publish(manifestFor(other, 2), other)

    const result = await readPublication(
      accepted,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'rejected', reason: 'conflict' })
    expect(server.calls).toEqual(['/publications/manifest.json'])
  })

  it('deve recusar revisão antiga', async () => {
    const accepted = acceptedFrom(pendingSnapshot(), 3)
    const server = fakeServer()
    server.publish(manifestFor(accepted.snapshot, 2), accepted.snapshot)

    const result = await readPublication(
      accepted,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'rejected', reason: 'stale' })
  })

  it('deve recusar manifesto de outro contexto como incomparável', async () => {
    const accepted = acceptedFrom()
    const firstRound = pendingSnapshot({ round: 1 })
    const server = fakeServer()
    server.publish(manifestFor(firstRound, 2), firstRound)

    const result = await readPublication(
      accepted,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'rejected', reason: 'incomparable' })
  })

  it('deve recusar manifesto que não é de presidente no Brasil', async () => {
    const snapshot = pendingSnapshot({ office: 'governor', scope: 'DF' })
    const server = fakeServer()
    server.publish(manifestFor(snapshot), snapshot)

    const result = await readPublication(
      undefined,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({
      outcome: 'rejected',
      reason: 'unexpected_contest',
    })
  })

  it('deve recusar revisão nova cujo snapshot não existe', async () => {
    const accepted = acceptedFrom()
    const server = fakeServer()
    server.publish(
      manifestFor(availableSnapshot({ dataVersion: DATA_VERSION_B }), 2),
    )

    const result = await readPublication(
      accepted,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'rejected', reason: 'snapshot_missing' })
  })

  it('deve recusar snapshot fora do contrato', async () => {
    const snapshot = availableSnapshot()
    const server = fakeServer()
    server.publish(manifestFor(snapshot), { ...snapshot, votesReleased: false })

    const result = await readPublication(
      undefined,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_snapshot' })
  })

  it('deve recusar snapshot que não corresponde ao manifesto', async () => {
    const snapshot = availableSnapshot()
    const server = fakeServer()
    server.publish(manifestFor(snapshot))
    server.files[`/publications/snapshots/${snapshot.dataVersion}.json`] =
      availableSnapshot({ round: 1 })

    const result = await readPublication(
      undefined,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'rejected', reason: 'snapshot_mismatch' })
  })

  it('deve recusar manifesto com caminho fora da base sem segui-lo', async () => {
    const snapshot = availableSnapshot()
    const server = fakeServer()
    server.publish(
      manifestFor(snapshot, 1, {
        current: {
          dataVersion: snapshot.dataVersion,
          path: 'https://exemplo.invalid/snapshot.json',
          publishedAt: '2026-10-25T21:01:00Z',
        },
      }),
      snapshot,
    )

    const result = await readPublication(
      undefined,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_manifest' })
    expect(server.calls).toEqual(['/publications/manifest.json'])
  })

  it('deve recusar manifesto que não é JSON', async () => {
    const server = fakeServer({ '/publications/manifest.json': '<html>' })

    const result = await readPublication(
      undefined,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_manifest' })
  })

  it('deve propagar falha de rede sem produzir estado', async () => {
    const server = fakeServer({
      '/publications/manifest.json': new TypeError('rede'),
    })

    const result = readPublication(
      undefined,
      signal,
      TEST_ENDPOINT,
      server.fetcher,
    )

    await expect(result).rejects.toThrow('rede')
  })
})

describe('readPublication com base configurada', () => {
  const CHANNEL = 'demo-sintetico-presidente-br-2t'
  const ROOT = `https://resultados.exemplo.invalid/publicacoes/${CHANNEL}/`
  const endpoint = { channelRoot: new URL(ROOT), channel: CHANNEL }

  function remoteServer(manifest: unknown, snapshot?: unknown) {
    const requests: { url: string; init: RequestInit | undefined }[] = []
    const files: Record<string, unknown> = {
      [`${ROOT}manifest.json`]: manifest,
    }
    if (snapshot) {
      files[`${ROOT}snapshots/${DATA_VERSION_A}.json`] = snapshot
    }
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init })
      const body = files[String(input)]
      if (body === undefined) return new Response('', { status: 404 })
      return new Response(JSON.stringify(body))
    }) as typeof fetch
    return { requests, fetcher }
  }

  it('deve ler manifesto e snapshot sob base, prefixo e canal, sem credenciais', async () => {
    const snapshot = availableSnapshot()
    const server = remoteServer(manifestFor(snapshot), snapshot)

    const result = await readPublication(
      undefined,
      signal,
      endpoint,
      server.fetcher,
    )

    expect(result.outcome).toBe('accepted')
    expect(server.requests.map((request) => request.url)).toEqual([
      `${ROOT}manifest.json`,
      `${ROOT}snapshots/${DATA_VERSION_A}.json`,
    ])
    expect(server.requests[0].init).toMatchObject({
      cache: 'no-store',
      credentials: 'omit',
      mode: 'cors',
      redirect: 'error',
    })
  })

  it('deve recusar manifesto de outro canal', async () => {
    const snapshot = availableSnapshot()
    const server = remoteServer(
      manifestFor(snapshot, 1, { channel: 'outro-canal' }),
      snapshot,
    )

    const result = await readPublication(
      undefined,
      signal,
      endpoint,
      server.fetcher,
    )

    expect(result).toEqual({
      outcome: 'rejected',
      reason: 'unexpected_channel',
    })
    expect(server.requests).toHaveLength(1)
  })
})
