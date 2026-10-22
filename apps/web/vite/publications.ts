import { constants } from 'node:fs'
import { open, realpath } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

import type { Plugin } from 'vite'

export const PUBLICATIONS_ROUTE = '/publications/'

const CHANNEL_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CHANNEL_MAX_LENGTH = 64
const ALLOWED_FILE =
  /^(manifest\.json|snapshots\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json)$/
const PHOTO_CHANNEL = 'fotos'
const PHOTO_FILE = /^\d{1,20}\.jpeg$/
const MAX_BYTES = 1024 * 1024

type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void

function reply(
  response: ServerResponse,
  status: number,
  body?: Buffer,
  contentType = 'application/json; charset=utf-8',
) {
  response.statusCode = status
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (body) {
    response.setHeader('Content-Type', contentType)
  }
  response.end(body)
}

async function readChannelFile(
  root: string,
  channel: string,
  relativePath: string,
): Promise<Buffer | undefined> {
  const channelDirectory = path.join(root, channel)
  const filePath = path.join(channelDirectory, relativePath)
  try {
    const realChannel = path.join(await realpath(root), channel)
    if ((await realpath(channelDirectory)) !== realChannel) return undefined
    const expected = path.join(realChannel, relativePath)
    if ((await realpath(filePath)) !== expected) return undefined
    const file = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const stats = await file.stat()
      if (!stats.isFile() || stats.size > MAX_BYTES) return undefined
      return await file.readFile()
    } finally {
      await file.close()
    }
  } catch {
    return undefined
  }
}

export function createPublicationsHandler(root: string): Handler {
  return (request, response, next) => {
    const url = request.url ?? ''
    if (!url.startsWith(PUBLICATIONS_ROUTE)) {
      next()
      return
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      reply(response, 405)
      return
    }
    const relative = url.slice(PUBLICATIONS_ROUTE.length)
    const separator = relative.indexOf('/')
    const channel = relative.slice(0, separator)
    const file = relative.slice(separator + 1)
    const isPhoto = channel === PHOTO_CHANNEL && PHOTO_FILE.test(file)
    const isAllowed =
      isPhoto ||
      (separator > 0 &&
        channel.length <= CHANNEL_MAX_LENGTH &&
        CHANNEL_PATTERN.test(channel) &&
        ALLOWED_FILE.test(file))
    if (!isAllowed) {
      reply(response, 404)
      return
    }
    const contentType = isPhoto ? 'image/jpeg' : undefined
    void readChannelFile(root, channel, file).then((body) =>
      body ? reply(response, 200, body, contentType) : reply(response, 404),
    )
  }
}

export function publicationsBridge(options: { root: string }): Plugin {
  const root = path.resolve(options.root)
  return {
    name: 'eleicoes-publications',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(createPublicationsHandler(root))
    },
  }
}
