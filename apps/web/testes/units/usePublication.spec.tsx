// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  LOCAL_POLL_INTERVAL_MS,
  usePublication,
} from '../../src/features/president/hooks/usePublication.ts'
import {
  availableSnapshot,
  DATA_VERSION_B,
  fakeServer,
  manifestFor,
  pendingSnapshot,
} from './fixtures.ts'

const settle = () => act(async () => {})
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

let server: ReturnType<typeof fakeServer>

beforeEach(() => {
  vi.useFakeTimers()
  setVisibility('visible')
  server = fakeServer()
  server.publish(manifestFor(pendingSnapshot()), pendingSnapshot())
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const render = () =>
  renderHook(() => usePublication({ fetcher: server.fetcher }))

const manifestCalls = () =>
  server.calls.filter((url) => url.endsWith('manifest.json')).length

describe('usePublication', () => {
  it('deve indicar carregamento antes da primeira leitura', () => {
    const { result } = render()

    expect(result.current.isLoading).toBe(true)
    expect(result.current.accepted).toBeUndefined()
  })

  it('deve aceitar a publicação da primeira leitura', async () => {
    const { result } = render()

    await settle()

    expect(result.current.accepted?.snapshot.availability).toBe('pending')
    expect(result.current.isLoading).toBe(false)
  })

  it('deve consultar de novo só depois do intervalo após a tentativa anterior', async () => {
    render()
    await settle()

    await advance(LOCAL_POLL_INTERVAL_MS - 1)
    const beforeInterval = manifestCalls()
    await advance(1)

    expect(beforeInterval).toBe(1)
    expect(manifestCalls()).toBe(2)
  })

  it('deve trocar para a revisão nova sem recarregar', async () => {
    const { result } = render()
    await settle()
    const next = availableSnapshot({ dataVersion: DATA_VERSION_B })
    server.publish(manifestFor(next, 2), next)

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(result.current.accepted?.manifest.revision).toBe(2)
    expect(result.current.accepted?.snapshot.availability).toBe('available')
  })

  it('deve atualizar manualmente sem esperar o intervalo', async () => {
    const { result } = render()
    await settle()

    act(() => result.current.refresh())
    await settle()

    expect(manifestCalls()).toBe(2)
  })

  it('deve sinalizar verificação só na atualização manual', async () => {
    const { result } = render()
    const duringPolling = result.current.isChecking
    await settle()

    act(() => result.current.refresh())
    const duringManual = result.current.isChecking
    await settle()

    expect(duringPolling).toBe(false)
    expect(duringManual).toBe(true)
    expect(result.current.isChecking).toBe(false)
  })

  it('deve ignorar a atualização manual enquanto há tentativa em andamento', async () => {
    const { result } = render()

    act(() => result.current.refresh())
    await settle()

    expect(manifestCalls()).toBe(1)
  })

  it('deve preservar a última versão válida quando a leitura falha', async () => {
    const { result } = render()
    await settle()
    const accepted = result.current.accepted
    server.files['/publications/manifest.json'] = new TypeError('rede')

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(result.current.accepted).toBe(accepted)
    expect(result.current.failure?.reason).toBe('unreachable')
  })

  it('deve manter a versão aceita quando o snapshot novo está ausente', async () => {
    const { result } = render()
    await settle()
    server.publish(
      manifestFor(availableSnapshot({ dataVersion: DATA_VERSION_B }), 2),
    )

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(result.current.accepted?.manifest.revision).toBe(1)
    expect(result.current.failure?.reason).toBe('snapshot_missing')
  })

  it('deve aceitar a mesma revisão numa nova tentativa depois da falha', async () => {
    const { result } = render()
    await settle()
    const next = availableSnapshot({ dataVersion: DATA_VERSION_B })
    server.publish(manifestFor(next, 2))
    await advance(LOCAL_POLL_INTERVAL_MS)
    server.publish(manifestFor(next, 2), next)

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(result.current.accepted?.manifest.revision).toBe(2)
    expect(result.current.failure).toBeUndefined()
  })

  it('deve pausar a consulta com a página oculta e retomar ao voltar', async () => {
    render()
    await settle()
    setVisibility('hidden')

    await advance(LOCAL_POLL_INTERVAL_MS * 3)
    const whileHidden = manifestCalls()
    act(() => setVisibility('visible'))
    await settle()

    expect(whileHidden).toBe(1)
    expect(manifestCalls()).toBe(2)
  })

  it('deve cancelar a leitura e os temporizadores ao desmontar', async () => {
    const { unmount } = render()
    await settle()

    unmount()
    await advance(LOCAL_POLL_INTERVAL_MS * 3)

    expect(manifestCalls()).toBe(1)
  })

  it('deve descartar a resposta que chega depois de desmontar', async () => {
    const pending = Promise.withResolvers<Response>()
    const signals: AbortSignal[] = []
    const fetcher = ((_url: string, init?: RequestInit) => {
      signals.push(init!.signal!)
      return pending.promise
    }) as typeof fetch
    const { result, unmount } = renderHook(() => usePublication({ fetcher }))

    unmount()
    pending.resolve(
      new Response(JSON.stringify(manifestFor(pendingSnapshot()))),
    )
    await settle()

    expect(signals[0].aborted).toBe(true)
    expect(result.current.accepted).toBeUndefined()
  })
})
