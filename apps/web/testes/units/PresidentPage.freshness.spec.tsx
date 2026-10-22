// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PresidentPage } from '../../src/features/president/components/PresidentPage.tsx'
import {
  availableSnapshot,
  manifestFor,
  pendingSnapshot,
  TEST_ENDPOINT,
  TEST_STALE_AFTER_MS,
  NATIONAL_PATH,
} from './fixtures.ts'
import { setupPresidentPage } from './pageHarness.tsx'

const { page, renderPage, results, publishUf } = setupPresidentPage()

const GOVERNOR_DF_PATH = '/publications/demo-sintetico-governador-df-2t/'

async function renderDistritoFederal() {
  publishUf('DF', '1.111', '2.222')
  window.location.hash = '#/uf/DF'
  render(
    <PresidentPage
      endpoint={TEST_ENDPOINT}
      staleAfterMs={TEST_STALE_AFTER_MS}
      fetcher={page.server.fetcher}
    />,
  )
  await screen.findByRole('heading', { name: 'Governador em Distrito Federal' })
}

const breakConnection = (manifestPath: string) => {
  page.server.files[`${manifestPath}manifest.json`] = new TypeError('rede')
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('PresidentPage — painel sem avisos', () => {
  const COLLECTED_MS = Date.parse(availableSnapshot().collectedAt)

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(COLLECTED_MS + TEST_STALE_AFTER_MS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve mostrar os números sem aviso no painel com coleta antiga', async () => {
    await renderPage()

    expect(results().getByText('60,00%')).toBeTruthy()
    expect(results().queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('deve mostrar "Apuração não iniciada" no cabeçalho em pending', async () => {
    page.server.publish(manifestFor(pendingSnapshot()), pendingSnapshot())

    await renderPage()

    expect(screen.getByText('Apuração não iniciada')).toBeTruthy()
    expect(results().queryByRole('status')).toBeNull()
    expect(results().queryByText(/%$/)).toBeNull()
  })

  it('deve mostrar "Apuração finalizada" no cabeçalho em finished', async () => {
    const finished = availableSnapshot({
      totalization: { status: 'finished', finalIndicator: true },
    })
    page.server.publish(manifestFor(finished), finished)

    await renderPage()

    expect(screen.getByText('Apuração finalizada')).toBeTruthy()
  })

  it('deve indicar a falha só no cabeçalho e manter os números', async () => {
    await renderPage()

    breakConnection(NATIONAL_PATH)

    expect(await screen.findByText('Não foi possível atualizar')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(results().getByText('60,00%')).toBeTruthy()
  })

  it('deve manter o governador sem aviso com coleta antiga', async () => {
    await renderDistritoFederal()

    expect(results().getByText('2.222 votos')).toBeTruthy()
    expect(results().queryByRole('status')).toBeNull()
  })

  it('deve manter o último resultado do governador quando a leitura falha', async () => {
    await renderDistritoFederal()
    const governorReads = () =>
      page.server.calls.filter((url) => url.startsWith(GOVERNOR_DF_PATH)).length
    const before = governorReads()

    breakConnection(GOVERNOR_DF_PATH)
    await vi.waitFor(() => expect(governorReads()).toBeGreaterThan(before))

    expect(screen.queryByRole('alert')).toBeNull()
    expect(results().getByText('2.222 votos')).toBeTruthy()
    expect(results().getByText('1.111 votos')).toBeTruthy()
  })
})
