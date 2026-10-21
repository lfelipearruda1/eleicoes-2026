// @vitest-environment jsdom
import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  availableSnapshot,
  manifestFor,
  pendingSnapshot,
  TEST_STALE_AFTER_MS,
  NATIONAL_PATH,
} from './fixtures.ts'
import { setupPresidentPage } from './pageHarness.tsx'

const { page, renderPage, results } = setupPresidentPage()

describe('PresidentPage — atualidade e comunicação', () => {
  const COLLECTED_MS = Date.parse(availableSnapshot().collectedAt)
  const STALE_COLLECTION =
    'A última coleta registrada ocorreu há mais de 2 minutos. Não há confirmação de atualização posterior.'

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(COLLECTED_MS + TEST_STALE_AFTER_MS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve manter os números e mostrar o aviso de coleta antiga como status', async () => {
    await renderPage()

    expect(results().getByRole('status').textContent).toBe(STALE_COLLECTION)
    expect(results().getByText('60,00%')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('deve não mostrar aviso de atualidade com coleta recente', async () => {
    vi.setSystemTime(COLLECTED_MS + 1_000)

    await renderPage()

    expect(results().queryByRole('status')).toBeNull()
  })

  it('deve manter "aguardando" em pending e acrescentar o aviso sem votos', async () => {
    page.server.publish(manifestFor(pendingSnapshot()), pendingSnapshot())

    await renderPage()

    expect(
      screen.getByText('Aguardando liberação dos votos · dados de 18:00'),
    ).toBeTruthy()
    expect(results().getByRole('status').textContent).toBe(STALE_COLLECTION)
    expect(results().queryByText(/%$/)).toBeNull()
  })

  it('deve manter "apuração concluída" em finished e só avisar a idade', async () => {
    const finished = availableSnapshot({
      totalization: { status: 'finished', finalIndicator: true },
    })
    page.server.publish(manifestFor(finished), finished)

    await renderPage()

    expect(screen.getByText('Apuração concluída · dados de 18:00')).toBeTruthy()
    expect(results().getByRole('status').textContent).toBe(STALE_COLLECTION)
  })

  it('deve falar de verificação da origem quando há checkedAt antigo', async () => {
    const checkedAt = '2026-10-25T21:00:30Z'
    vi.setSystemTime(Date.parse(checkedAt) + TEST_STALE_AFTER_MS)
    page.server.publish(
      manifestFor(availableSnapshot(), 1, { checkedAt }),
      availableSnapshot(),
    )

    await renderPage()

    expect(results().getByRole('status').textContent).toBe(
      'Sem verificação recente da origem. Exibindo o último resultado disponível.',
    )
    expect(
      screen.getByText(/Verificação da origem: 25\/10\/2026, 18:00:30/),
    ).toBeTruthy()
  })

  it('deve mostrar falha de comunicação e idade como avisos separados', async () => {
    await renderPage()
    page.server.files[`${NATIONAL_PATH}manifest.json`] = new TypeError('rede')

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const alert = await screen.findByRole('alert')

    expect(alert.textContent).toContain(
      'Não foi possível consultar os resultados. Exibindo a última versão válida.',
    )
    expect(results().getByRole('status').textContent).toBe(STALE_COLLECTION)
    expect(results().getByText('60,00%')).toBeTruthy()
  })

  it('deve rotular a leitura do navegador sem chamá-la de verificação da origem', async () => {
    await renderPage()

    expect(screen.getByText(/Última leitura pelo navegador:/)).toBeTruthy()
    expect(screen.queryByText(/Última verificação/)).toBeNull()
  })
})
