import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { z } from 'zod'

import { TSE_CAPTURE_FILES, TSE_MAX_RESPONSE_BYTES } from '../constants.js'
import { CollectorError } from '../error.js'
import {
  hasErrorCode,
  readLimitedFile,
  replaceFile,
} from '../publication/storage.js'

const lastValidSchema = z.record(
  z.string(),
  z.object({
    capture: z.string().regex(/^[\w-]+\/(config|result)\.json$/),
    validator: z.object({
      etag: z.string().optional(),
      lastModified: z.string().optional(),
    }),
  }),
)

export type LastValid = z.infer<typeof lastValidSchema>

export async function readLastValid(
  sourceDirectory: string,
): Promise<LastValid> {
  const indexPath = path.join(sourceDirectory, TSE_CAPTURE_FILES.lastValid)
  const content = await readLimitedFile(indexPath).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) return undefined
    throw error
  })
  if (content === undefined) return {}
  try {
    return lastValidSchema.parse(JSON.parse(content.toString('utf8')))
  } catch (error) {
    throw new CollectorError('CORRUPTED_FILE', indexPath, error)
  }
}

export async function writeLastValid(
  sourceDirectory: string,
  lastValid: LastValid,
): Promise<void> {
  await replaceFile(
    path.join(sourceDirectory, TSE_CAPTURE_FILES.lastValid),
    `${JSON.stringify(lastValid, null, 2)}\n`,
  )
}

export async function readCapture(
  sourceDirectory: string,
  capture: string,
): Promise<Buffer | undefined> {
  return readLimitedFile(
    path.join(sourceDirectory, capture),
    TSE_MAX_RESPONSE_BYTES,
  ).catch(() => undefined)
}

export async function createRunDirectory(
  parentDirectory: string,
  now: Date,
): Promise<string> {
  await mkdir(parentDirectory, { recursive: true, mode: 0o700 })
  const runId = `${now.toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
  const runDirectory = path.join(parentDirectory, runId)
  await mkdir(runDirectory, { mode: 0o700 })
  return runDirectory
}

export async function writeCaptureFile(
  runDirectory: string,
  name: string,
  content: string | Buffer,
): Promise<void> {
  await writeFile(path.join(runDirectory, name), content, {
    flag: 'wx',
    mode: 0o600,
  })
}
