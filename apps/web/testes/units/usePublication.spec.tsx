// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  FRESHNESS_RECHECK_MAX_MS,
  usePublication,
} from '../../src/features/president/hooks/usePublication.ts'
import {
  channelSource,
  LOCAL_POLL_INTERVAL_MS,
} from '../../src/features/president/resultsConfig.ts'
import {
  availableSnapshot,
  DATA_VERSION_B,
  fakeServer,
  manifestFor,
  pendingSnapshot,
  TEST_SOURCE,
  TEST_STALE_AFTER_MS,
  NATIONAL_PATH,
  TEST_ENDPOINT,
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
  renderHook(() =>
    usePublication({
      source: TEST_SOURCE,
      staleAfterMs: TEST_STALE_AFTER_MS,
      fetcher: server.fetcher,
    }),
  )

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
    server.files[`${NATIONAL_PATH}manifest.json`] = new TypeError('rede')

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
    const { result, unmount } = renderHook(() =>
      usePublication({
        source: TEST_SOURCE,
        staleAfterMs: TEST_STALE_AFTER_MS,
        fetcher,
      }),
    )

    unmount()
    pending.resolve(
      new Response(JSON.stringify(manifestFor(pendingSnapshot()))),
    )
    await settle()

    expect(signals[0].aborted).toBe(true)
    expect(result.current.accepted).toBeUndefined()
  })
})

describe('usePublication — atualidade dos dados', () => {
  const COLLECTED_MS = Date.parse(pendingSnapshot().collectedAt)
  const snapshotCalls = () =>
    server.calls.filter((url) => url.includes('/snapshots/')).length

  it('deve avisar ao passar do limiar mesmo sem nova consulta', async () => {
    vi.setSystemTime(COLLECTED_MS)
    const { result } = render()
    await settle()
    const before = result.current.freshness?.state
    setVisibility('hidden')

    await advance(FRESHNESS_RECHECK_MAX_MS)
    await advance(TEST_STALE_AFTER_MS - FRESHNESS_RECHECK_MAX_MS)

    expect(before).toBe('recent')
    expect(manifestCalls()).toBe(1)
    expect(result.current.freshness?.state).toBe('stale')
  })

  it('deve manter o aviso quando o servidor devolve o mesmo manifesto', async () => {
    vi.setSystemTime(COLLECTED_MS + TEST_STALE_AFTER_MS)
    const { result } = render()
    await settle()

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(manifestCalls()).toBe(2)
    expect(result.current.failure).toBeUndefined()
    expect(result.current.freshness?.state).toBe('stale')
  })

  it('deve separar falha de rede, disponibilidade e idade dos dados', async () => {
    vi.setSystemTime(COLLECTED_MS + TEST_STALE_AFTER_MS)
    const { result } = render()
    await settle()
    const manifest = server.files[`${NATIONAL_PATH}manifest.json`]
    server.files[`${NATIONAL_PATH}manifest.json`] = new TypeError('rede')
    await advance(LOCAL_POLL_INTERVAL_MS)
    const duringFailure = {
      reason: result.current.failure?.reason,
      availability: result.current.accepted?.snapshot.availability,
      freshness: result.current.freshness?.state,
    }
    server.files[`${NATIONAL_PATH}manifest.json`] = manifest

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(duringFailure).toEqual({
      reason: 'unreachable',
      availability: 'pending',
      freshness: 'stale',
    })
    expect(result.current.failure).toBeUndefined()
    expect(result.current.freshness?.state).toBe('stale')
  })

  it('deve renovar pela revisão maior com checkedAt sem baixar o snapshot de novo', async () => {
    vi.setSystemTime(COLLECTED_MS + TEST_STALE_AFTER_MS)
    const { result } = render()
    await settle()
    const checkedAt = new Date(Date.now()).toISOString()
    server.publish(manifestFor(pendingSnapshot(), 2, { checkedAt }))

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(result.current.accepted?.manifest.revision).toBe(2)
    expect(snapshotCalls()).toBe(1)
    expect(result.current.freshness).toMatchObject({
      reference: 'checkedAt',
      referenceAt: checkedAt,
      state: 'recent',
    })
  })

  it('deve ignorar checkedAt de revisão conflitante', async () => {
    vi.setSystemTime(COLLECTED_MS + TEST_STALE_AFTER_MS)
    const { result } = render()
    await settle()
    const checkedAt = new Date(Date.now()).toISOString()
    server.publish(manifestFor(pendingSnapshot(), 1, { checkedAt }))

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(result.current.failure?.reason).toBe('conflict')
    expect(result.current.freshness).toMatchObject({
      reference: 'collectedAt',
      state: 'stale',
    })
  })

  it('deve manter o aviso quando uma captura antiga é republicada agora', async () => {
    vi.setSystemTime(COLLECTED_MS + TEST_STALE_AFTER_MS)
    const { result } = render()
    await settle()
    const republished = availableSnapshot({ dataVersion: DATA_VERSION_B })
    const manifest = manifestFor(republished, 2)
    server.publish(
      {
        ...manifest,
        current: {
          ...manifest.current,
          publishedAt: new Date(Date.now()).toISOString(),
        },
      },
      republished,
    )

    await advance(LOCAL_POLL_INTERVAL_MS)

    expect(result.current.accepted?.manifest.revision).toBe(2)
    expect(result.current.freshness?.state).toBe('stale')
  })

  it('deve passar de indeterminado a recente quando o relógio alcança a referência', async () => {
    vi.setSystemTime(COLLECTED_MS - 10_000)
    const { result } = render()
    await settle()
    const before = result.current.freshness?.state
    setVisibility('hidden')

    await advance(10_000)

    expect(before).toBe('undetermined')
    expect(result.current.freshness?.state).toBe('recent')
  })

  it('deve recalcular ao voltar de uma aba oculta', async () => {
    vi.setSystemTime(COLLECTED_MS)
    const { result } = render()
    await settle()
    act(() => setVisibility('hidden'))
    vi.setSystemTime(COLLECTED_MS + TEST_STALE_AFTER_MS * 10)
    const whileHidden = result.current.freshness?.state

    act(() => setVisibility('visible'))

    expect(whileHidden).toBe('recent')
    expect(result.current.freshness?.state).toBe('stale')
  })

  it('deve limpar todos os temporizadores ao desmontar', async () => {
    vi.setSystemTime(COLLECTED_MS)
    const { unmount } = render()
    await settle()

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('usePublication — canais de UF', () => {
  const SP = channelSource(TEST_ENDPOINT, 'president', 'SP')
  const GOVERNOR_SP = channelSource(TEST_ENDPOINT, 'governor', 'SP')
  const channelCalls = (channel: string) =>
    server.calls.filter((url) => url.includes(`/${channel}/manifest.json`))
      .length

  it('deve ficar parado sem canal', async () => {
    renderHook(() =>
      usePublication({
        source: undefined,
        staleAfterMs: TEST_STALE_AFTER_MS,
        fetcher: server.fetcher,
      }),
    )

    await advance(LOCAL_POLL_INTERVAL_MS * 3)

    expect(server.calls).toEqual([])
  })

  it('deve parar de consultar o canal ausente quando pedido', async () => {
    const { result } = renderHook(() =>
      usePublication({
        source: GOVERNOR_SP,
        staleAfterMs: TEST_STALE_AFTER_MS,
        fetcher: server.fetcher,
        stopWhenMissing: true,
      }),
    )
    await settle()

    await advance(LOCAL_POLL_INTERVAL_MS * 3)

    expect(channelCalls(GOVERNOR_SP.channel)).toBe(1)
    expect(result.current.accepted).toBeUndefined()
  })

  it('deve continuar consultando o canal ausente sem a opção', async () => {
    renderHook(() =>
      usePublication({
        source: GOVERNOR_SP,
        staleAfterMs: TEST_STALE_AFTER_MS,
        fetcher: server.fetcher,
      }),
    )
    await settle()

    await advance(LOCAL_POLL_INTERVAL_MS * 2)

    expect(channelCalls(GOVERNOR_SP.channel)).toBe(3)
  })

  it('deve não mostrar dados do canal anterior ao trocar de canal', async () => {
    const { result, rerender } = renderHook(
      ({ source }) =>
        usePublication({
          source,
          staleAfterMs: TEST_STALE_AFTER_MS,
          fetcher: server.fetcher,
        }),
      { initialProps: { source: TEST_SOURCE } },
    )
    await settle()
    const national = result.current.accepted

    rerender({ source: SP })

    expect(national?.manifest.channel).toBe(TEST_SOURCE.channel)
    expect(result.current.accepted).toBeUndefined()
    expect(result.current.failure).toBeUndefined()
  })
})
