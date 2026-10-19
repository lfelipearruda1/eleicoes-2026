import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  unlink,
} from 'node:fs/promises'
import path from 'node:path'

import { channelSchema } from '@eleicoes/validation'

import {
  LOCK_FILE,
  MAX_DOCUMENT_BYTES,
  SNAPSHOTS_DIR,
  TEMP_FILE_PREFIX,
} from '../constants.js'
import { PublicationError } from './error.js'

export const hasErrorCode = (error: unknown, code: string) =>
  (error as NodeJS.ErrnoException)?.code === code

async function assertRealDirectory(directory: string): Promise<void> {
  const stats = await lstat(directory)
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new PublicationError('SYMBOLIC_LINK', directory)
  }
}

export async function resolveChannelDirectory(
  root: string,
  channel: string,
  create: boolean,
): Promise<string> {
  if (!channelSchema.safeParse(channel).success) {
    throw new PublicationError('INVALID_CHANNEL', channel)
  }
  if (create) {
    await mkdir(root, { recursive: true, mode: 0o700 })
  }
  const channelDirectory = path.join(await realpath(root), channel)
  for (const directory of [
    channelDirectory,
    path.join(channelDirectory, SNAPSHOTS_DIR),
  ]) {
    if (create) {
      await mkdir(directory, { mode: 0o700 }).catch((error: unknown) => {
        if (!hasErrorCode(error, 'EEXIST')) throw error
      })
    }
    await assertRealDirectory(directory).catch((error: unknown) => {
      if (hasErrorCode(error, 'ENOENT')) {
        throw new PublicationError('NOT_FOUND', directory)
      }
      throw error
    })
  }
  return channelDirectory
}

export async function readLimitedFile(filePath: string): Promise<Buffer> {
  const file = await open(
    filePath,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  ).catch((error: unknown) => {
    if (hasErrorCode(error, 'ELOOP')) {
      throw new PublicationError('SYMBOLIC_LINK', filePath)
    }
    throw error
  })
  try {
    if (!(await file.stat()).isFile()) {
      throw new PublicationError('SYMBOLIC_LINK', filePath)
    }
    const buffer = Buffer.alloc(MAX_DOCUMENT_BYTES + 1)
    let size = 0
    for (;;) {
      const { bytesRead } = await file.read(
        buffer,
        size,
        buffer.length - size,
        size,
      )
      size += bytesRead
      if (bytesRead === 0 || size === buffer.length) break
    }
    if (size > MAX_DOCUMENT_BYTES) {
      throw new PublicationError('DOCUMENT_TOO_LARGE', filePath)
    }
    return buffer.subarray(0, size)
  } finally {
    await file.close()
  }
}

async function writeTempFile(
  directory: string,
  content: string,
): Promise<string> {
  const tempPath = path.join(directory, `${TEMP_FILE_PREFIX}${randomUUID()}`)
  const file = await open(tempPath, 'wx', 0o600)
  try {
    await file.writeFile(content)
    await file.sync()
  } finally {
    await file.close()
  }
  return tempPath
}

export async function writeFileIfAbsent(
  filePath: string,
  content: string,
): Promise<boolean> {
  const tempPath = await writeTempFile(path.dirname(filePath), content)
  try {
    await link(tempPath, filePath)
    return true
  } catch (error) {
    if (hasErrorCode(error, 'EEXIST')) return false
    throw error
  } finally {
    await rm(tempPath, { force: true })
  }
}

export async function replaceFile(
  filePath: string,
  content: string,
): Promise<void> {
  const tempPath = await writeTempFile(path.dirname(filePath), content)
  await rename(tempPath, filePath).catch(async (error: unknown) => {
    await rm(tempPath, { force: true })
    throw error
  })
}

export async function listSnapshots(
  channelDirectory: string,
): Promise<string[]> {
  const entries = await readdir(path.join(channelDirectory, SNAPSHOTS_DIR))
  return entries.filter((entry) => !entry.startsWith(TEMP_FILE_PREFIX)).sort()
}

export async function withChannelLock<T>(
  channelDirectory: string,
  action: () => Promise<T>,
): Promise<T> {
  const lockPath = path.join(channelDirectory, LOCK_FILE)
  const lock = await open(lockPath, 'wx', 0o600).catch((error: unknown) => {
    if (hasErrorCode(error, 'EEXIST')) {
      throw new PublicationError('CHANNEL_LOCKED', lockPath)
    }
    throw error
  })
  try {
    await lock.close()
    return await action()
  } finally {
    await unlink(lockPath)
  }
}
