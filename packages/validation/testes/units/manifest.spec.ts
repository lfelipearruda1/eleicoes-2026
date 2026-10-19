import { describe, expect, it } from 'vitest'
import {
  decideManifestUpdate,
  findSnapshotMismatches,
  publishManifestSchema,
  readManifestSchema,
  type Manifest,
  type SnapshotEnvelope,
} from '../../src/index.js'

const DATA_VERSION_A = '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d'
const DATA_VERSION_B = '7d1e2f30-4a5b-4c6d-8e9f-0a1b2c3d4e5f'

function syntheticManifest(): Manifest {
  return {
    contractVersion: 1,
    channel: 'demo-local-presidente-br-2t',
    revision: 1,
    environment: 'local',
    sourceEnvironment: 'simulated',
    round: 2,
    office: 'president',
    scope: 'BR',
    current: {
      dataVersion: DATA_VERSION_A,
      path: `snapshots/${DATA_VERSION_A}.json`,
      publishedAt: '2026-10-25T21:05:00Z',
    },
  }
}

function syntheticEnvelope(): SnapshotEnvelope {
  return {
    contractVersion: 1,
    dataVersion: DATA_VERSION_A,
    environment: 'local',
    sourceEnvironment: 'simulated',
    round: 2,
    office: 'president',
    scope: 'BR',
    availability: 'unknown',
    collectedAt: '2026-10-25T21:04:19Z',
    source: { file: 'sintetico/exemplo.json' },
  }
}

describe('publishManifestSchema', () => {
  it('deve aceitar manifesto válido sem checkedAt', () => {
    const input = syntheticManifest()

    const result = publishManifestSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('deve aceitar checkedAt em UTC', () => {
    const input = { ...syntheticManifest(), checkedAt: '2026-10-25T21:06:00Z' }

    const result = publishManifestSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it.each([
    { label: 'no topo', input: { ...syntheticManifest(), extra: 1 } },
    {
      label: 'em current',
      input: {
        ...syntheticManifest(),
        current: { ...syntheticManifest().current, url: 'https://x' },
      },
    },
  ])('deve rejeitar chave não prevista $label', ({ input }) => {
    const result = publishManifestSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it.each([
    { label: 'absoluto', path: `/tmp/${DATA_VERSION_A}.json` },
    { label: 'com ..', path: `snapshots/../../${DATA_VERSION_A}.json` },
    { label: 'URL', path: `https://exemplo.invalid/${DATA_VERSION_A}.json` },
    { label: 'de outra versão', path: `snapshots/${DATA_VERSION_B}.json` },
    { label: 'fora de snapshots/', path: `${DATA_VERSION_A}.json` },
  ])('deve rejeitar path $label', ({ path }) => {
    const input = {
      ...syntheticManifest(),
      current: { ...syntheticManifest().current, path },
    }

    const result = publishManifestSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it.each(['../x', 'a/b', 'Demo', 'demo_local', '', '-demo', 'a'.repeat(65)])(
    'deve rejeitar canal %j',
    (channel) => {
      const input = { ...syntheticManifest(), channel }

      const result = publishManifestSchema.safeParse(input)

      expect(result.success).toBe(false)
    },
  )

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1'])(
    'deve rejeitar revision %j',
    (revision) => {
      const input = { ...syntheticManifest(), revision }

      const result = publishManifestSchema.safeParse(input)

      expect(result.success).toBe(false)
    },
  )

  it('deve aceitar revision igual ao maior inteiro seguro', () => {
    const input = { ...syntheticManifest(), revision: Number.MAX_SAFE_INTEGER }

    const result = publishManifestSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('deve rejeitar governador com abrangência BR', () => {
    const input = { ...syntheticManifest(), office: 'governor' }

    const result = publishManifestSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe('readManifestSchema', () => {
  it('deve descartar chave não prevista no topo e em current', () => {
    const input = {
      ...syntheticManifest(),
      extra: 1,
      current: { ...syntheticManifest().current, extra: 2 },
    }

    const result = readManifestSchema.parse(input)

    expect(result).toEqual(syntheticManifest())
  })

  it('deve rejeitar contractVersion não suportado', () => {
    const input = { ...syntheticManifest(), contractVersion: 2 }

    const result = readManifestSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe('findSnapshotMismatches', () => {
  it('deve devolver lista vazia quando manifesto e snapshot correspondem', () => {
    const manifest = syntheticManifest()
    const snapshot = syntheticEnvelope()

    const result = findSnapshotMismatches(manifest, snapshot)

    expect(result).toEqual([])
  })

  it.each([
    { field: 'dataVersion', change: { dataVersion: DATA_VERSION_B } },
    { field: 'environment', change: { environment: 'staging' } },
    { field: 'sourceEnvironment', change: { sourceEnvironment: 'official' } },
    { field: 'round', change: { round: 1 } },
    { field: 'office', change: { office: 'governor' } },
    { field: 'scope', change: { scope: 'SP' } },
  ] as const)('deve apontar divergência em $field', ({ field, change }) => {
    const snapshot = { ...syntheticEnvelope(), ...change } as SnapshotEnvelope

    const result = findSnapshotMismatches(syntheticManifest(), snapshot)

    expect(result).toEqual([field])
  })
})

describe('decideManifestUpdate', () => {
  function withRevision(revision: number): Manifest {
    return { ...syntheticManifest(), revision }
  }

  it('deve tratar o primeiro manifesto como candidato', () => {
    const received = withRevision(1)

    const result = decideManifestUpdate(undefined, received)

    expect(result).toBe('newer')
  })

  it('deve ignorar revisão menor como antiga', () => {
    const accepted = withRevision(5)

    const result = decideManifestUpdate(accepted, withRevision(4))

    expect(result).toBe('stale')
  })

  it('deve tratar revisão maior como candidata', () => {
    const accepted = withRevision(5)

    const result = decideManifestUpdate(accepted, withRevision(6))

    expect(result).toBe('newer')
  })

  it('deve não atualizar com mesma revisão e mesmo conteúdo', () => {
    const accepted = withRevision(5)

    const result = decideManifestUpdate(accepted, withRevision(5))

    expect(result).toBe('same')
  })

  it('deve apontar conflito com mesma revisão e conteúdo divergente', () => {
    const accepted = withRevision(5)
    const received = {
      ...withRevision(5),
      current: {
        dataVersion: DATA_VERSION_B,
        path: `snapshots/${DATA_VERSION_B}.json`,
        publishedAt: '2026-10-25T21:05:00Z',
      },
    }

    const result = decideManifestUpdate(accepted, received)

    expect(result).toBe('conflict')
  })

  it('deve ordenar só pela revisão, mesmo com publishedAt anterior', () => {
    const accepted = withRevision(5)
    const received = {
      ...withRevision(6),
      current: { ...accepted.current, publishedAt: '2020-01-01T00:00:00Z' },
    }

    const result = decideManifestUpdate(accepted, received)

    expect(result).toBe('newer')
  })

  it('deve não comparar manifestos de canais diferentes', () => {
    const accepted = withRevision(5)
    const received = { ...withRevision(9), channel: 'outro-canal' }

    const result = decideManifestUpdate(accepted, received)

    expect(result).toBe('incomparable')
  })

  it('deve não comparar manifestos do mesmo canal com contexto diferente', () => {
    const accepted = withRevision(5)
    const received = { ...withRevision(9), scope: 'SP' as const }

    const result = decideManifestUpdate(accepted, received)

    expect(result).toBe('incomparable')
  })
})
