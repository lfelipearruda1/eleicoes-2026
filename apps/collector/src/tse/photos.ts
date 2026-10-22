import { randomUUID } from 'node:crypto'
import { access, mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { candidatePhotoPath } from '@eleicoes/validation'

import {
  TSE_MAX_PHOTO_BYTES,
  TSE_NATIONAL_SCOPE,
  TSE_PHOTO_DIRECTORY_TEMPLATE,
  TSE_PHOTO_FILE_TYPE,
  TSE_PHOTO_RETRY_MS,
  TSE_SOURCES,
} from '../constants.js'
import { CollectorError } from '../error.js'
import type { ElectionSelection, ResultTarget, SourceName } from './ea11.js'
import type { TseSession } from './run.js'

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])
const PROPAGATED_CODES = new Set(['REMOTE_BLOCKED'])

export function candidatePhotoUrl(
  source: SourceName,
  selection: ElectionSelection,
  target: ResultTarget,
  candidateId: string,
): URL {
  const { host, environment } = TSE_SOURCES[source]
  const scope =
    target.office === 'president' ? TSE_NATIONAL_SCOPE : target.scope
  return new URL(
    `https://${host}/${environment}/${selection.cycle}/${selection.election}/fotos/${scope}/${candidateId}.jpeg`,
  )
}

const isStored = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  )

async function storePhoto(file: string, body: Buffer) {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${randomUUID()}.tmp`
  await writeFile(temporary, body)
  await rename(temporary, file)
}

export interface PhotoRequest {
  session: TseSession
  config: { arq: { tp: string; dir: string }[] }
  selection: ElectionSelection
  target: ResultTarget
  candidateIds: readonly string[]
  publications: string
  lastAttempts: Map<string, number>
}

export async function storeCandidatePhotos(
  request: PhotoRequest,
): Promise<Set<string>> {
  const { session, publications, lastAttempts } = request
  const isPublishedBySource = request.config.arq.some(
    (entry) =>
      entry.tp === TSE_PHOTO_FILE_TYPE &&
      entry.dir === TSE_PHOTO_DIRECTORY_TEMPLATE,
  )
  const stored = new Set<string>()
  for (const candidateId of request.candidateIds) {
    const file = path.join(publications, candidatePhotoPath(candidateId))
    if (await isStored(file)) {
      stored.add(candidateId)
      continue
    }
    const nowMs = session.now().getTime()
    const lastAttempt = lastAttempts.get(candidateId)
    const isWaiting =
      lastAttempt !== undefined && nowMs - lastAttempt < TSE_PHOTO_RETRY_MS
    if (!isPublishedBySource || isWaiting) continue
    lastAttempts.set(candidateId, nowMs)
    const url = candidatePhotoUrl(
      session.source,
      request.selection,
      request.target,
      candidateId,
    )
    const body = await session
      .fetchFile(url, TSE_MAX_PHOTO_BYTES)
      .catch((error: unknown) => {
        const code = error instanceof CollectorError ? error.code : undefined
        if (code === undefined || PROPAGATED_CODES.has(code)) throw error
        return undefined
      })
    if (!body?.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) {
      continue
    }
    await storePhoto(file, body)
    stored.add(candidateId)
  }
  return stored
}
