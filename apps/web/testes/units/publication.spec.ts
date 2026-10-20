import { describe, expect, it } from 'vitest'

import {
  readPublication,
  type AcceptedPublication,
} from '../../src/features/president/publication.ts'
import {
  availableSnapshot,
  DATA_VERSION_B,
  fakeServer,
  manifestFor,
  pendingSnapshot,
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

    const result = await readPublication(undefined, signal, server.fetcher)

    expect(result).toEqual({
      outcome: 'accepted',
      publication: { manifest: manifestFor(snapshot), snapshot },
    })
  })

  it('deve não buscar o snapshot quando o manifesto não mudou', async () => {
    const accepted = acceptedFrom()
    const server = fakeServer()
    server.publish(accepted.manifest, accepted.snapshot)

    const result = await readPublication(accepted, signal, server.fetcher)

    expect(result).toEqual({ outcome: 'same' })
    expect(server.calls).toEqual(['/publications/manifest.json'])
  })

  it('deve recusar revisão antiga', async () => {
    const accepted = acceptedFrom(pendingSnapshot(), 3)
    const server = fakeServer()
    server.publish(manifestFor(accepted.snapshot, 2), accepted.snapshot)

    const result = await readPublication(accepted, signal, server.fetcher)

    expect(result).toEqual({ outcome: 'rejected', reason: 'stale' })
  })

  it('deve recusar manifesto de outro contexto como incomparável', async () => {
    const accepted = acceptedFrom()
    const firstRound = pendingSnapshot({ round: 1 })
    const server = fakeServer()
    server.publish(manifestFor(firstRound, 2), firstRound)

    const result = await readPublication(accepted, signal, server.fetcher)

    expect(result).toEqual({ outcome: 'rejected', reason: 'incomparable' })
  })

  it('deve recusar manifesto que não é de presidente no Brasil', async () => {
    const snapshot = pendingSnapshot({ office: 'governor', scope: 'DF' })
    const server = fakeServer()
    server.publish(manifestFor(snapshot), snapshot)

    const result = await readPublication(undefined, signal, server.fetcher)

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

    const result = await readPublication(accepted, signal, server.fetcher)

    expect(result).toEqual({ outcome: 'rejected', reason: 'snapshot_missing' })
  })

  it('deve recusar snapshot fora do contrato', async () => {
    const snapshot = availableSnapshot()
    const server = fakeServer()
    server.publish(manifestFor(snapshot), { ...snapshot, votesReleased: false })

    const result = await readPublication(undefined, signal, server.fetcher)

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_snapshot' })
  })

  it('deve recusar snapshot que não corresponde ao manifesto', async () => {
    const snapshot = availableSnapshot()
    const server = fakeServer()
    server.publish(manifestFor(snapshot))
    server.files[`/publications/snapshots/${snapshot.dataVersion}.json`] =
      availableSnapshot({ round: 1 })

    const result = await readPublication(undefined, signal, server.fetcher)

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

    const result = await readPublication(undefined, signal, server.fetcher)

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_manifest' })
    expect(server.calls).toEqual(['/publications/manifest.json'])
  })

  it('deve recusar manifesto que não é JSON', async () => {
    const server = fakeServer({ '/publications/manifest.json': '<html>' })

    const result = await readPublication(undefined, signal, server.fetcher)

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_manifest' })
  })

  it('deve propagar falha de rede sem produzir estado', async () => {
    const server = fakeServer({
      '/publications/manifest.json': new TypeError('rede'),
    })

    const result = readPublication(undefined, signal, server.fetcher)

    await expect(result).rejects.toThrow('rede')
  })
})
