import { TSE_MAX_RESPONSE_BYTES, TSE_REQUEST_TIMEOUT_MS } from '../constants.js'
import { CollectorError } from '../error.js'

export type Transport = (url: string, init: RequestInit) => Promise<Response>

export interface Validator {
  etag?: string
  lastModified?: string
}

export type HttpResult =
  { status: 200; body: Buffer; validator: Validator } | { status: 304 }

export interface HttpOptions {
  allowedHost: string
  validator?: Validator
  transport?: Transport
  timeoutMs?: number
  maxBytes?: number
}

export function assertAllowedUrl(url: URL, allowedHost: string): void {
  const isAllowed =
    url.protocol === 'https:' &&
    url.hostname === allowedHost &&
    url.port === '' &&
    url.username === '' &&
    url.password === ''
  if (!isAllowed) {
    throw new CollectorError('URL_NOT_ALLOWED', url.href)
  }
}

function conditionalHeaders(
  validator: Validator | undefined,
): Record<string, string> {
  if (validator?.etag) {
    return { 'If-None-Match': validator.etag }
  }
  if (validator?.lastModified) {
    return { 'If-Modified-Since': validator.lastModified }
  }
  return {}
}

async function readLimitedBody(
  response: Response,
  url: string,
  signal: AbortSignal,
  maxBytes: number,
): Promise<Buffer> {
  const reader = response.body?.getReader()
  if (!reader) {
    return Buffer.alloc(0)
  }
  const cancel = () => void reader.cancel().catch(() => undefined)
  signal.addEventListener('abort', cancel, { once: true })
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read().catch((error: unknown) => {
        const code = signal.aborted ? 'REMOTE_TIMEOUT' : 'REMOTE_TRANSPORT'
        throw new CollectorError(code, url, error)
      })
      if (signal.aborted) {
        throw new CollectorError('REMOTE_TIMEOUT', url)
      }
      if (done) {
        return Buffer.concat(chunks)
      }
      size += value.byteLength
      if (size > maxBytes) {
        cancel()
        throw new CollectorError('RESPONSE_TOO_LARGE', url)
      }
      chunks.push(value)
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    reader.releaseLock()
  }
}

async function send(
  url: string,
  init: RequestInit,
  transport: Transport,
): Promise<Response> {
  try {
    return await transport(url, init)
  } catch (error) {
    const isTimeout = (error as Error).name === 'TimeoutError'
    throw new CollectorError(
      isTimeout ? 'REMOTE_TIMEOUT' : 'REMOTE_TRANSPORT',
      url,
      error,
    )
  }
}

export async function httpGet(
  url: URL,
  options: HttpOptions,
): Promise<HttpResult> {
  assertAllowedUrl(url, options.allowedHost)
  const signal = AbortSignal.timeout(
    options.timeoutMs ?? TSE_REQUEST_TIMEOUT_MS,
  )
  const response = await send(
    url.href,
    {
      method: 'GET',
      redirect: 'manual',
      headers: conditionalHeaders(options.validator),
      signal,
    },
    options.transport ?? fetch,
  )
  if (response.status !== 200) {
    await response.body?.cancel().catch(() => undefined)
  }
  if (response.status === 304) {
    return { status: 304 }
  }
  if (response.status >= 300 && response.status < 400) {
    throw new CollectorError(
      'REMOTE_REDIRECT',
      response.headers.get('location') ?? `HTTP ${response.status}`,
    )
  }
  if (response.status === 403 || response.status === 429) {
    throw new CollectorError('REMOTE_BLOCKED', `HTTP ${response.status}`)
  }
  if (response.status === 404) {
    throw new CollectorError('REMOTE_NOT_FOUND', url.href)
  }
  if (response.status !== 200) {
    throw new CollectorError('REMOTE_HTTP_ERROR', `HTTP ${response.status}`)
  }
  const body = await readLimitedBody(
    response,
    url.href,
    signal,
    options.maxBytes ?? TSE_MAX_RESPONSE_BYTES,
  )
  const validator: Validator = {}
  const etag = response.headers.get('etag')
  const lastModified = response.headers.get('last-modified')
  if (etag) {
    validator.etag = etag
  }
  if (lastModified) {
    validator.lastModified = lastModified
  }
  return { status: 200, body, validator }
}

export function parseJsonBody(body: Buffer, url: string): unknown {
  try {
    return JSON.parse(body.toString('utf8'))
  } catch (error) {
    throw new CollectorError('RESPONSE_NOT_JSON', url, error)
  }
}
