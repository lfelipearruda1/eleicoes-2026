// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

describe('PresidentPage', () => {
  it('deve mostrar o carregamento antes da primeira leitura', () => {
    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={page.server.fetcher}
      />,
    )

    expect(screen.getByText('Carregando resultados…')).toBeTruthy()
  })

  it('deve renderizar todas as candidaturas do snapshot nacional', async () => {
    await renderPage()

    expect(results().getAllByRole('listitem')).toHaveLength(3)
    expect(results().getByText('6.000 votos')).toBeTruthy()
    expect(results().getByText('60,00%')).toBeTruthy()
  })

  it('deve mostrar pending sem votos nem percentuais', async () => {
    page.server.publish(manifestFor(pendingSnapshot()), pendingSnapshot())

    await renderPage()

    expect(results().getAllByText('Aguardando votos')).toHaveLength(2)
    expect(results().queryByText(/%$/)).toBeNull()
  })

  it('deve mostrar no rodapé só a fonte, sem procedência nem horários', async () => {
    await renderPage()

    const footer = screen.getByRole('contentinfo')
    expect(footer.textContent).toBe(
      'Fonte: dados sintéticos de demonstração, sem valor oficial',
    )
    expect(footer.querySelector('a')).toBeNull()
  })

  it('deve apontar no rodapé a divulgação oficial do TSE para dado oficial', async () => {
    const official = availableSnapshot({ sourceEnvironment: 'official' })
    page.server.publish(manifestFor(official), official)

    await renderPage()

    const footer = screen.getByRole('contentinfo')
    expect(footer.textContent).toContain(
      'Tribunal Superior Eleitoral (TSE), divulgação oficial dos resultados',
    )
    expect(
      within(footer)
        .getByRole('link', { name: /resultados\.tse\.jus\.br/ })
        .getAttribute('href'),
    ).toBe('https://resultados.tse.jus.br/')
  })

  it('deve mostrar as 27 UFs do mapa como indisponíveis', async () => {
    await renderPage()

    const ufs = screen.getAllByRole('button', {
      name: /: dados indisponíveis$/,
    })
    expect(ufs).toHaveLength(27)
  })

  it('deve abrir a UF pelo mapa e mostrar o resultado presidencial dela', async () => {
    publishUf('SP', '7.000')
    await renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'São Paulo (SP): dados indisponíveis',
      }),
    )
    await screen.findByRole('heading', { name: 'São Paulo' })

    expect(window.location.pathname).toBe('/sp')
    expect(await results().findByText('7.000 votos')).toBeTruthy()
  })

  it('deve trocar de UF sem passar pelo carregamento nem desmontar as candidaturas', async () => {
    publishUf('SP', '7.000')
    await renderPage()
    const nationalCandidates = results().getAllByRole('listitem')

    window.history.pushState(null, '', '/sp')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await screen.findByRole('heading', { name: 'São Paulo' })

    expect(screen.queryByText('Carregando resultados…')).toBeNull()
    expect(results().getAllByRole('listitem')[0]).toBe(nationalCandidates[0])
    expect(await results().findByText('7.000 votos')).toBeTruthy()
  })

  it('deve abrir o link antigo #/uf/BA e trocar o endereço por /ba', async () => {
    publishUf('BA', '5.000')
    window.history.replaceState(null, '', '/#/uf/BA')

    await renderPage()

    expect(await screen.findByRole('heading', { name: 'Bahia' })).toBeTruthy()
    expect(window.location.pathname).toBe('/ba')
    expect(window.location.hash).toBe('')
  })

  it('deve voltar para a UF anterior pelo botão voltar do navegador', async () => {
    await renderPage()

    fireEvent.click(
      screen.getByRole('button', { name: 'Acre (AC): dados indisponíveis' }),
    )
    await screen.findByRole('heading', { name: 'Acre' })
    window.history.back()

    expect(await screen.findByRole('heading', { name: 'Brasil' })).toBeTruthy()
    expect(window.location.pathname).toBe('/')
  })

  it('deve abrir a UF pelo teclado no mapa', async () => {
    await renderPage()

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Acre (AC): dados indisponíveis' }),
      { key: 'Enter' },
    )
    await screen.findByRole('heading', { name: 'Acre' })

    expect(window.location.pathname).toBe('/ac')
  })

  it('deve mostrar governador abaixo de presidente na UF com 2º turno', async () => {
    publishUf('DF', '1.111', '2.222')
    window.history.replaceState(null, '', '/df')

    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={page.server.fetcher}
      />,
    )
    const governor = await screen.findByRole('heading', {
      name: 'Governador',
    })

    const president = screen.getByRole('heading', {
      name: 'Presidente',
    })
    expect(
      president.compareDocumentPosition(governor) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(results().getByText('1.111 votos')).toBeTruthy()
    expect(results().getByText('2.222 votos')).toBeTruthy()
  })

  it('deve manter o card de governador entre UFs com disputa e tirá-lo na UF sem disputa', async () => {
    publishUf('DF', '1.111', '2.222')
    publishUf('AC', '3.333', '4.444')
    publishUf('SP', '7.000')
    window.history.replaceState(null, '', '/df')
    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={page.server.fetcher}
      />,
    )
    await screen.findByRole('heading', {
      name: 'Governador',
    })

    window.history.pushState(null, '', '/ac')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByRole('heading', { name: 'Acre' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Governador' })).toBeTruthy()
    expect(await screen.findByText('4.444 votos')).toBeTruthy()

    window.history.pushState(null, '', '/sp')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await screen.findByText('7.000 votos')
    await vi.waitFor(() =>
      expect(screen.queryByRole('heading', { name: /^Governador/ })).toBeNull(),
    )
  })

  it('deve mostrar só presidente, sem mensagem, na UF sem 2º turno de governador', async () => {
    publishUf('SP', '7.000')
    window.history.replaceState(null, '', '/sp')

    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={page.server.fetcher}
      />,
    )
    await screen.findByRole('heading', { name: 'São Paulo' })
    await act(async () => {})

    expect(results().getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(results().queryByText(/governador/i)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(
      page.server.calls.filter((url) => url.includes('governador-sp')),
    ).toHaveLength(1)
  })

  it('deve mostrar as seções apuradas da UF aberta no cabeçalho', async () => {
    publishUf('SP', '7.000')
    window.history.replaceState(null, '', '/sp')

    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={page.server.fetcher}
      />,
    )

    expect(await screen.findByText('seções apuradas · São Paulo')).toBeTruthy()
  })

  it('deve voltar à visão Brasil pelo botão do painel', async () => {
    publishUf('DF', '1.111', '2.222')
    window.history.replaceState(null, '', '/df')
    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={page.server.fetcher}
      />,
    )
    await screen.findByRole('heading', {
      name: 'Presidente',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Visão Brasil' }))
    await screen.findByRole('heading', { name: 'Brasil' })

    expect(window.location.pathname).toBe('/')
    expect(screen.getByRole('heading', { name: 'Presidente' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /^Governador/ })).toBeNull()
  })

  it('deve trocar o mapa pela lista textual das UFs', async () => {
    await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))

    expect(
      screen.getByRole('table', { name: 'Resultado presidencial por UF' }),
    ).toBeTruthy()
    expect(
      screen.getAllByRole('row', { name: /: dados indisponíveis$/ }),
    ).toHaveLength(27)
    expect(screen.queryByRole('list', { name: 'Legenda' })).toBeNull()
  })

  it('deve avisar quando não há resultado para mostrar e a leitura falha', async () => {
    page.server.files[`${NATIONAL_PATH}manifest.json`] = new TypeError('rede')

    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={page.server.fetcher}
      />,
    )
    const notice = await screen.findByRole('alert')

    expect(notice.textContent).toContain(
      'Não foi possível carregar os resultados.',
    )
  })

  it('deve renderizar nome com marcação como texto', async () => {
    const snapshot = pendingSnapshot({
      candidates: [
        {
          candidateId: '1',
          number: '1',
          ballotName: '<img src=x onerror=alert(1)>',
        },
      ],
    })
    page.server.publish(manifestFor(snapshot), snapshot)

    const { container } = await renderPage()

    expect(container.querySelector('main img')).toBeNull()
    expect(results().getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
  })

  it('deve renderizar sem atributos de estilo inline', async () => {
    const { container } = await renderPage()

    expect(container.querySelectorAll('[style]')).toHaveLength(0)
  })
})
