import { randomUUID } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { SnapshotEnvelope } from '@eleicoes/validation'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  LOCK_FILE,
  MANIFEST_FILE,
  MAX_DOCUMENT_BYTES,
  SNAPSHOTS_DIR,
} from '../../src/constants.js'
import type { PublicationError } from '../../src/publication/error.js'
import {
  publishSnapshot,
  type PublishRequest,
} from '../../src/publication/publish.js'
import {
  readPublication,
  refreshAcceptedState,
} from '../../src/publication/read.js'

const CHANNEL = 'teste-local-presidente-br-2t'

let workDirectory: string
let root: string
let inputCount = 0

beforeEach(async () => {
  workDirectory = await mkdtemp(path.join(tmpdir(), 'eleicoes-spec-'))
  root = path.join(workDirectory, 'publicacao')
})

afterEach(async () => {
  await rm(workDirectory, { recursive: true, force: true })
})

const envelope = (
  overrides: Partial<SnapshotEnvelope> = {},
): SnapshotEnvelope => ({
  contractVersion: 1,
  dataVersion: randomUUID(),
  environment: 'local',
  sourceEnvironment: 'simulated',
  round: 2,
  office: 'president',
  scope: 'BR',
  availability: 'unknown',
  collectedAt: '2026-10-25T21:04:19Z',
  source: { file: 'sintetico/exemplo.json' },
  ...overrides,
})

const channelDirectory = () => path.join(root, CHANNEL)
const manifestPath = () => path.join(channelDirectory(), MANIFEST_FILE)
const snapshotPath = (dataVersion: string) =>
  path.join(channelDirectory(), SNAPSHOTS_DIR, `${dataVersion}.json`)
const readManifestText = () => readFile(manifestPath(), 'utf8')
const failure = async () => {
  throw new Error('falha injetada')
}

async function writeInput(document: unknown): Promise<string> {
  inputCount += 1
  const inputPath = path.join(workDirectory, `entrada-${inputCount}.json`)
  await writeFile(
    inputPath,
    typeof document === 'string' ? document : JSON.stringify(document),
  )
  return inputPath
}

async function publish(
  document: unknown,
  options: Partial<PublishRequest> = {},
) {
  return publishSnapshot({
    root,
    channel: CHANNEL,
    inputPath: await writeInput(document),
    ...options,
  })
}

const publishError = (
  document: unknown,
  options: Partial<PublishRequest> = {},
) => errorOf(publish(document, options))

async function errorOf(promise: Promise<unknown>): Promise<PublicationError> {
  try {
    await promise
  } catch (error) {
    return error as PublicationError
  }
  throw new Error('a operação deveria falhar')
}

describe('publishSnapshot', () => {
  it('deve criar a revisão 1 apontando para o snapshot', async () => {
    const first = envelope()

    const result = await publish(first)

    const manifest = JSON.parse(await readManifestText())
    expect(result.status).toBe('published')
    expect(manifest.revision).toBe(1)
    expect(manifest.current.path).toBe(`snapshots/${first.dataVersion}.json`)
    expect(manifest.checkedAt).toBeUndefined()
  })

  it('deve incrementar a revisão e preservar o histórico', async () => {
    const first = envelope()
    await publish(first)
    const second = envelope()

    const result = await publish(second)

    expect(result.manifest.revision).toBe(2)
    expect(
      (await readdir(path.join(channelDirectory(), SNAPSHOTS_DIR))).sort(),
    ).toEqual(
      [`${first.dataVersion}.json`, `${second.dataVersion}.json`].sort(),
    )
  })

  it('deve ser idempotente ao repetir a versão atual', async () => {
    const first = envelope()
    await publish(first)
    const before = await readManifestText()

    const result = await publish(first, {
      now: () => new Date('2030-01-01T00:00:00Z'),
    })

    expect(result.status).toBe('unchanged')
    expect(await readManifestText()).toBe(before)
  })

  it('deve tratar outra formatação e ordem de chaves como repetição', async () => {
    const first = envelope()
    await publish(first)
    const reordered = Object.fromEntries(Object.entries(first).reverse())

    const result = await publish(JSON.stringify(reordered, null, 8))

    expect(result.status).toBe('unchanged')
  })

  it('deve falhar com mesmo dataVersion e conteúdo diferente', async () => {
    const first = envelope()
    await publish(first)
    const before = await readManifestText()

    const error = await publishError({
      ...first,
      collectedAt: '2026-10-25T22:00:00Z',
    })

    expect(error.code).toBe('VERSION_CONFLICT')
    expect(await readManifestText()).toBe(before)
  })

  it('deve recusar reativar uma versão histórica', async () => {
    const first = envelope()
    await publish(first)
    await publish(envelope())

    const error = await publishError(first)

    expect(error.code).toBe('VERSION_NOT_CURRENT')
  })

  it('deve preservar o manifesto anterior quando a publicação falha antes da troca', async () => {
    const first = envelope()
    await publish(first)
    const before = await readManifestText()

    await errorOf(publish(envelope(), { beforeManifestSwap: failure }))

    expect(await readManifestText()).toBe(before)
    const { snapshot } = await readPublication(root, CHANNEL)
    expect(snapshot.dataVersion).toBe(first.dataVersion)
  })

  it('deve liberar o bloqueio depois de uma falha', async () => {
    await publish(envelope())
    await errorOf(publish(envelope(), { beforeManifestSwap: failure }))

    const result = await publish(envelope())

    expect(result.manifest.revision).toBe(2)
  })

  it('deve não promover o snapshot órfão de uma publicação interrompida', async () => {
    await publish(envelope())
    const orphan = envelope()
    await errorOf(publish(orphan, { beforeManifestSwap: failure }))

    const error = await publishError(orphan)

    expect(error.code).toBe('VERSION_NOT_CURRENT')
  })

  it('deve recusar manifesto corrompido sem reinicializar o canal', async () => {
    await publish(envelope())
    await writeFile(manifestPath(), '{"revision": ')

    const error = await publishError(envelope())

    expect(error.code).toBe('CORRUPTED_FILE')
    expect(await readManifestText()).toBe('{"revision": ')
  })

  it('deve recusar canal sem manifesto que já tem snapshots', async () => {
    await publish(envelope())
    await unlink(manifestPath())

    const error = await publishError(envelope())

    expect(error.code).toBe('MANIFEST_MISSING')
  })

  it('deve continuar a revisão a partir do estado persistido', async () => {
    await publish(envelope())
    const manifest = JSON.parse(await readManifestText())
    await writeFile(
      manifestPath(),
      JSON.stringify({ ...manifest, revision: 41 }),
    )

    const result = await publish(envelope())

    expect(result.manifest.revision).toBe(42)
  })

  it('deve recusar incrementar além do maior inteiro seguro', async () => {
    await publish(envelope())
    const manifest = JSON.parse(await readManifestText())
    await writeFile(
      manifestPath(),
      JSON.stringify({ ...manifest, revision: Number.MAX_SAFE_INTEGER }),
    )

    const error = await publishError(envelope())

    expect(error.code).toBe('REVISION_LIMIT')
  })

  it.each([
    { scope: 'SP' },
    { round: 1 },
    { sourceEnvironment: 'official' },
  ] as const)(
    'deve recusar documento de outro contexto: %o',
    async (change) => {
      await publish(envelope())

      const error = await publishError(envelope(change))

      expect(error.code).toBe('CHANNEL_MISMATCH')
    },
  )

  it.each([
    {
      label: 'ambiente diferente de local',
      document: envelope({ environment: 'staging' }),
      code: 'UNSUPPORTED_ENVIRONMENT',
    },
    {
      label: 'chave fora do contrato',
      document: { ...envelope(), payload: {} },
      code: 'INVALID_DOCUMENT',
    },
    { label: 'JSON inválido', document: '{', code: 'INVALID_JSON' },
    {
      label: 'acima do limite',
      document: ' '.repeat(MAX_DOCUMENT_BYTES + 1),
      code: 'DOCUMENT_TOO_LARGE',
    },
  ])('deve recusar entrada com $label', async ({ document, code }) => {
    const error = await publishError(document)

    expect(error.code).toBe(code)
  })

  it('deve recusar canal que tenta ser caminho', async () => {
    const inputPath = await writeInput(envelope())

    const error = await errorOf(
      publishSnapshot({ root, channel: '../fora', inputPath }),
    )

    expect(error.code).toBe('INVALID_CHANNEL')
    expect(await readdir(workDirectory)).not.toContain('fora')
  })

  it('deve recusar diretório de canal que é link simbólico', async () => {
    const elsewhere = path.join(workDirectory, 'outro-lugar')
    await mkdir(elsewhere)
    await mkdir(root)
    await symlink(elsewhere, channelDirectory())

    const error = await publishError(envelope())

    expect(error.code).toBe('SYMBOLIC_LINK')
    expect(await readdir(elsewhere)).toEqual([])
  })

  it('deve recusar publicação concorrente no mesmo canal', async () => {
    await publish(envelope())
    const holding = Promise.withResolvers<void>()
    const inside = Promise.withResolvers<void>()
    const first = publish(envelope(), {
      beforeManifestSwap: async () => {
        inside.resolve()
        await holding.promise
      },
    })
    await inside.promise

    const error = await publishError(envelope())

    holding.resolve()
    expect(error.code).toBe('CHANNEL_LOCKED')
    expect((await first).manifest.revision).toBe(2)
  })

  it('deve recusar bloqueio deixado por interrupção, sem removê-lo', async () => {
    await publish(envelope())
    const lockPath = path.join(channelDirectory(), LOCK_FILE)
    await writeFile(lockPath, '')

    const error = await publishError(envelope())

    expect(error.code).toBe('CHANNEL_LOCKED')
    expect((await stat(lockPath)).isFile()).toBe(true)
  })
})

describe('readPublication', () => {
  it('deve ler a versão atual validada pelo manifesto', async () => {
    const first = envelope()
    await publish(first)

    const result = await readPublication(root, CHANNEL)

    expect(result.snapshot).toEqual(first)
  })

  it('deve recusar manifesto cujo caminho sai do diretório do canal', async () => {
    const first = envelope()
    await publish(first)
    const manifest = JSON.parse(await readManifestText())
    manifest.current.path = `../../${first.dataVersion}.json`
    await writeFile(manifestPath(), JSON.stringify(manifest))

    const error = await errorOf(readPublication(root, CHANNEL))

    expect(error.code).toBe('CORRUPTED_FILE')
  })

  it('deve falhar quando o snapshot referenciado não existe', async () => {
    const first = envelope()
    await publish(first)
    await unlink(snapshotPath(first.dataVersion))

    const error = await errorOf(readPublication(root, CHANNEL))

    expect(error.code).toBe('NOT_FOUND')
  })

  it('deve falhar quando o snapshot referenciado é inválido', async () => {
    const first = envelope()
    await publish(first)
    await writeFile(snapshotPath(first.dataVersion), '[]')

    const error = await errorOf(readPublication(root, CHANNEL))

    expect(error.code).toBe('CORRUPTED_FILE')
  })

  it('deve recusar snapshot que é link simbólico', async () => {
    const first = envelope()
    await publish(first)
    const outside = path.join(workDirectory, 'fora.json')
    await writeFile(outside, await readFile(snapshotPath(first.dataVersion)))
    await unlink(snapshotPath(first.dataVersion))
    await symlink(outside, snapshotPath(first.dataVersion))

    const error = await errorOf(readPublication(root, CHANNEL))

    expect(error.code).toBe('SYMBOLIC_LINK')
  })
})

describe('refreshAcceptedState', () => {
  const accept = async () =>
    (await refreshAcceptedState(root, CHANNEL, undefined)).state

  it('deve aceitar o primeiro manifesto com snapshot válido', async () => {
    const first = envelope()
    await publish(first)

    const result = await refreshAcceptedState(root, CHANNEL, undefined)

    expect(result.outcome).toBe('accepted')
    expect(result.state?.snapshot.dataVersion).toBe(first.dataVersion)
  })

  it('deve ignorar revisão antiga e manter o estado aceito', async () => {
    await publish(envelope())
    const oldManifest = await readManifestText()
    await publish(envelope())
    const accepted = await accept()
    await writeFile(manifestPath(), oldManifest)

    const result = await refreshAcceptedState(root, CHANNEL, accepted)

    expect(result.outcome).toBe('stale')
    expect(result.state).toBe(accepted)
  })

  it('deve apontar conflito com mesma revisão e conteúdo divergente', async () => {
    await publish(envelope())
    const accepted = await accept()
    const manifest = JSON.parse(await readManifestText())
    manifest.current.publishedAt = '2026-10-25T23:59:59Z'
    await writeFile(manifestPath(), JSON.stringify(manifest))

    const result = await refreshAcceptedState(root, CHANNEL, accepted)

    expect(result.outcome).toBe('conflict')
    expect(result.state).toBe(accepted)
  })

  it('deve manter o último estado válido quando o snapshot novo não existe', async () => {
    await publish(envelope())
    const accepted = await accept()
    const second = envelope()
    await publish(second)
    await unlink(snapshotPath(second.dataVersion))

    const result = await refreshAcceptedState(root, CHANNEL, accepted)

    expect(result.outcome).toBe('unavailable')
    expect(result.state).toBe(accepted)
  })

  it('deve manter o último estado válido quando o manifesto está corrompido', async () => {
    await publish(envelope())
    const accepted = await accept()
    await writeFile(manifestPath(), 'não é json')

    const result = await refreshAcceptedState(root, CHANNEL, accepted)

    expect(result.outcome).toBe('unavailable')
    expect(result.state).toBe(accepted)
  })
})
