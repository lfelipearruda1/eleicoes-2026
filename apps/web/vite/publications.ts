import { constants } from 'node:fs'
import { open, realpath } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

import type { Plugin } from 'vite'

export const PUBLICATIONS_ROUTE = '/publications/'

const CHANNEL_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ALLOWED_FILE =
  /^(manifest\.json|snapshots\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json)$/
const MAX_BYTES = 1024 * 1024

type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void

function reply(response: ServerResponse, status: number, body?: Buffer) {
  response.statusCode = status
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (body) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
  }
  response.end(body)
}

async function readChannelFile(
  channelDirectory: string,
  relativePath: string,
): Promise<Buffer | undefined> {
  const filePath = path.join(channelDirectory, relativePath)
  try {
    const expected = path.join(await realpath(channelDirectory), relativePath)
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

export function createPublicationsHandler(channelDirectory: string): Handler {
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
    const relativePath = url.slice(PUBLICATIONS_ROUTE.length)
    if (!ALLOWED_FILE.test(relativePath)) {
      reply(response, 404)
      return
    }
    void readChannelFile(channelDirectory, relativePath).then((body) =>
      body ? reply(response, 200, body) : reply(response, 404),
    )
  }
}

export function publicationsBridge(options: {
  root: string
  channel: string
}): Plugin {
  if (!CHANNEL_PATTERN.test(options.channel) || options.channel.length > 64) {
    throw new Error(`canal inválido: ${options.channel}`)
  }
  const channelDirectory = path.join(
    path.resolve(options.root),
    options.channel,
  )
  return {
    name: 'eleicoes-publications',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(createPublicationsHandler(channelDirectory))
    },
  }
}
