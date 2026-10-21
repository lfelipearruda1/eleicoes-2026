import { randomUUID } from 'node:crypto'
import path from 'node:path'

import type { PresidentialSnapshot } from '@eleicoes/validation'
import { z } from 'zod'

import {
  DEMO_CHANNEL_PREFIX,
  TSE_CAPTURE_FILES,
  TSE_MAX_RESPONSE_BYTES,
  TSE_SOURCES,
} from '../constants.js'
import { CollectorError } from '../error.js'
import { publishDocument } from '../publication/publish.js'
import { readPublication } from '../publication/read.js'
import { hasErrorCode, readLimitedFile } from '../publication/storage.js'
import { presidentialResultUrl } from '../tse/ea11.js'
import { parsePresidentialResult } from '../tse/ea20.js'
import { normalizePresidentialResult } from './normalize.js'

const digitsSchema = z.string().regex(/^\d{1,6}$/)
const captureContextShape = {
  office: z.literal('president'),
  round: z.literal([1, 2]),
  scope: z.literal('br'),
}

const captureMetadataSchema = z.discriminatedUnion('source', [
  z.object({
    ...captureContextShape,
    source: z.literal('official'),
    validation: z.literal('valid'),
    election: z.object({
      cycle: z.string().regex(/^ele\d{4}$/),
      pleito: digitsSchema,
      election: digitsSchema,
      name: z.string(),
    }),
    requests: z.array(
      z.object({
        url: z.string(),
        requestedAt: z.iso.datetime(),
        status: z.int().optional(),
        reusedCapture: z
          .string()
          .regex(/^[\w-]+\/result\.json$/)
          .optional(),
      }),
    ),
  }),
  z.object({
    ...captureContextShape,
    source: z.literal('synthetic'),
    notice: z.string().min(1),
    election: z.object({ election: digitsSchema }),
    collectedAt: z.iso.datetime(),
  }),
])

type CaptureMetadata = z.infer<typeof captureMetadataSchema>

async function readJsonFile(filePath: string): Promise<unknown> {
  const content = await readLimitedFile(filePath, TSE_MAX_RESPONSE_BYTES).catch(
    (error: unknown) => {
      if (hasErrorCode(error, 'ENOENT')) {
        throw new CollectorError('NOT_FOUND', filePath)
      }
      throw error
    },
  )
  try {
    return JSON.parse(content.toString('utf8'))
  } catch (error) {
    throw new CollectorError('INVALID_JSON', filePath, error)
  }
}

function locateOfficialResult(
  captureDirectory: string,
  metadata: Extract<CaptureMetadata, { source: 'official' }>,
) {
  const url = presidentialResultUrl('official', metadata.election)
  const request = metadata.requests.findLast((entry) => entry.url === url.href)
  if (!request) {
    throw new CollectorError('INVALID_CAPTURE', `sem requisição a ${url.href}`)
  }
  const sourceFile = url.pathname.slice(
    `/${TSE_SOURCES.official.environment}/`.length,
  )
  if (request.status === 200) {
    return {
      resultPath: path.join(captureDirectory, TSE_CAPTURE_FILES.result),
      collectedAt: request.requestedAt,
      sourceFile,
    }
  }
  if (request.status === 304 && request.reusedCapture) {
    return {
      resultPath: path.join(
        path.dirname(captureDirectory),
        request.reusedCapture,
      ),
      collectedAt: request.requestedAt,
      sourceFile,
    }
  }
  throw new CollectorError(
    'INVALID_CAPTURE',
    `resposta ${request.status ?? 'ausente'} sem cópia do resultado identificada`,
  )
}

export async function readPresidentialCapture(captureDirectory: string) {
  const metadataPath = path.join(captureDirectory, TSE_CAPTURE_FILES.metadata)
  const parsed = captureMetadataSchema.safeParse(
    await readJsonFile(metadataPath),
  )
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.'))
    throw new CollectorError(
      'INVALID_CAPTURE',
      `${metadataPath}: ${[...new Set(fields)].join(', ')}`,
    )
  }
  const metadata = parsed.data
  const located =
    metadata.source === 'official'
      ? locateOfficialResult(captureDirectory, metadata)
      : {
          resultPath: path.join(captureDirectory, TSE_CAPTURE_FILES.result),
          collectedAt: metadata.collectedAt,
          sourceFile: 'sintetico/presidente-br.json',
        }
  const summary = parsePresidentialResult(
    await readJsonFile(located.resultPath),
    { election: metadata.election.election, round: metadata.round },
  )
  return {
    summary,
    context: {
      sourceEnvironment: metadata.source,
      collectedAt: located.collectedAt,
      sourceFile: located.sourceFile,
    },
  }
}

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, entry]) => [key, canonical(entry)]),
  )
}

const electoralContent = (snapshot: PresidentialSnapshot) =>
  JSON.stringify(
    canonical({ ...snapshot, dataVersion: undefined, collectedAt: undefined }),
  )

export interface PresidentialPublishRequest {
  capture: string
  output: string
  channel: string
  now?: () => Date
  beforeManifestSwap?: () => Promise<void>
}

export async function publishPresidentialCapture(
  request: PresidentialPublishRequest,
) {
  const captureDirectory = path.resolve(request.capture)
  const { summary, context } = await readPresidentialCapture(captureDirectory)
  const isSynthetic = context.sourceEnvironment === 'synthetic'
  if (isSynthetic !== request.channel.startsWith(DEMO_CHANNEL_PREFIX)) {
    throw new CollectorError(
      'CHANNEL_SOURCE_MISMATCH',
      `captura ${context.sourceEnvironment} exige canal ${isSynthetic ? 'com' : 'sem'} o prefixo "${DEMO_CHANNEL_PREFIX}"`,
    )
  }
  const snapshot = normalizePresidentialResult(summary, {
    ...context,
    dataVersion: randomUUID(),
  })
  const content = electoralContent(snapshot)
  const { status } = await publishDocument({
    root: request.output,
    channel: request.channel,
    document: snapshot,
    now: request.now,
    beforeManifestSwap: request.beforeManifestSwap,
    isUnchanged: (current) => electoralContent(current) === content,
    checkedAt:
      context.sourceEnvironment === 'official'
        ? context.collectedAt
        : undefined,
  })
  const publication = await readPublication(request.output, request.channel)
  return {
    status,
    capture: captureDirectory,
    channelDirectory: publication.channelDirectory,
    revision: publication.manifest.revision,
    dataVersion: publication.manifest.current.dataVersion,
    publishedAt: publication.manifest.current.publishedAt,
    checkedAt: publication.manifest.checkedAt,
    snapshot: publication.snapshot,
  }
}
