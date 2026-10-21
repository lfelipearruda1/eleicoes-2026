import { describe, expect, it } from 'vitest'

import { httpGet, type Transport } from '../../src/tse/http.js'
import { errorOf } from './failures.js'
import { HOST, RESULT_URL, json, fakeTransport } from './tseFixtures.js'

describe('httpGet', () => {
  const get = (url: string, transport: Transport, extra: object = {}) =>
    httpGet(new URL(url), { allowedHost: HOST, transport, ...extra })

  it.each([
    'http://resultados.tse.jus.br/x.json',
    'https://outro.example/x.json',
    'https://resultados.tse.jus.br.example/x.json',
    'https://resultados.tse.jus.br:8443/x.json',
    'https://usuario:senha@resultados.tse.jus.br/x.json',
  ])('deve recusar %s sem fazer requisição', async (url) => {
    const { transport, calls } = fakeTransport(() => json({}))

    const error = await errorOf(get(url, transport))

    expect(error.code).toBe('URL_NOT_ALLOWED')
    expect(calls).toHaveLength(0)
  })

  it('deve devolver o corpo e os validadores de uma resposta 200', async () => {
    const { transport } = fakeTransport(() =>
      json({ ok: true }, { etag: '"a"' }),
    )

    const result = await get(RESULT_URL, transport)

    expect(result).toMatchObject({ status: 200, validator: { etag: '"a"' } })
  })

  it('deve enviar If-Modified-Since quando só houver Last-Modified', async () => {
    const lastModified = 'Sun, 18 Oct 2026 15:38:28 GMT'
    const { transport, calls } = fakeTransport(
      () => new Response(null, { status: 304 }),
    )

    await get(RESULT_URL, transport, { validator: { lastModified } })

    expect(calls[0]?.headers).toEqual({ 'If-Modified-Since': lastModified })
  })

  it.each([
    { status: 404, code: 'REMOTE_NOT_FOUND' },
    { status: 403, code: 'REMOTE_BLOCKED' },
    { status: 429, code: 'REMOTE_BLOCKED' },
    { status: 500, code: 'REMOTE_HTTP_ERROR' },
  ])(
    'deve falhar com HTTP $status sem repetir a requisição',
    async ({ status, code }) => {
      const { transport, calls } = fakeTransport(
        () => new Response('erro', { status }),
      )

      const error = await errorOf(get(RESULT_URL, transport))

      expect(error.code).toBe(code)
      expect(calls).toHaveLength(1)
    },
  )

  it('deve não seguir redirecionamento', async () => {
    const { transport } = fakeTransport(
      () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://outro.example/' },
        }),
    )

    const error = await errorOf(get(RESULT_URL, transport))

    expect(error.code).toBe('REMOTE_REDIRECT')
    expect(error.message).toContain('https://outro.example/')
  })

  it('deve cancelar a leitura quando o corpo passa do limite', async () => {
    const { transport } = fakeTransport(() => new Response('x'.repeat(2048)))

    const error = await errorOf(get(RESULT_URL, transport, { maxBytes: 1024 }))

    expect(error.code).toBe('RESPONSE_TOO_LARGE')
  })

  it('deve expirar quando o corpo para de chegar no meio da leitura', async () => {
    const stalled = new ReadableStream<Uint8Array>({
      start: (controller) =>
        controller.enqueue(new TextEncoder().encode('{"ele":')),
    })
    const { transport } = fakeTransport(() => new Response(stalled))

    const error = await errorOf(get(RESULT_URL, transport, { timeoutMs: 50 }))

    expect(error.code).toBe('REMOTE_TIMEOUT')
  })

  it('deve distinguir falha de transporte', async () => {
    const transport: Transport = async () => {
      throw new TypeError('fetch failed')
    }

    const error = await errorOf(get(RESULT_URL, transport))

    expect(error.code).toBe('REMOTE_TRANSPORT')
  })
})
