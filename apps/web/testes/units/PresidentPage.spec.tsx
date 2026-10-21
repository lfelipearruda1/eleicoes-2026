// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigurationNotice } from '../../src/features/president/components/ConfigurationNotice.tsx'
import { PresidentPage } from '../../src/features/president/components/PresidentPage.tsx'
import {
  availableSnapshot,
  fakeServer,
  manifestFor,
  pendingSnapshot,
  TEST_ENDPOINT,
  TEST_STALE_AFTER_MS,
} from './fixtures.ts'

let server: ReturnType<typeof fakeServer>

beforeEach(() => {
  window.location.hash = ''
  server = fakeServer()
  server.publish(manifestFor(availableSnapshot()), availableSnapshot())
})

afterEach(cleanup)

const renderPage = async () => {
  const view = render(
    <PresidentPage
      endpoint={TEST_ENDPOINT}
      staleAfterMs={TEST_STALE_AFTER_MS}
      fetcher={server.fetcher}
    />,
  )
  await screen.findByRole('heading', { name: 'Presidente' })
  return view
}

const results = () => within(screen.getByRole('region', { name: 'Brasil' }))

describe('PresidentPage', () => {
  it('deve mostrar o carregamento antes da primeira leitura', () => {
    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={server.fetcher}
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
    server.publish(manifestFor(pendingSnapshot()), pendingSnapshot())

    await renderPage()

    expect(results().getAllByText('Aguardando votos')).toHaveLength(2)
    expect(results().queryByText(/%$/)).toBeNull()
  })

  it('deve avisar junto do resultado que os dados são fictícios', async () => {
    await renderPage()

    expect(
      results().getByText('Demonstração — dados fictícios, sem valor oficial.'),
    ).toBeTruthy()
  })

  it('deve mostrar os horários de publicação e de coleta no horário de Brasília', async () => {
    await renderPage()

    expect(
      screen.getByText(
        'Publicação: 25/10/2026, 18:01:00 (horário de Brasília) · Coleta: 25/10/2026, 18:00:05 (horário de Brasília)',
      ),
    ).toBeTruthy()
  })

  it('deve mostrar as 27 UFs do mapa como indisponíveis', async () => {
    await renderPage()

    const ufs = screen.getAllByRole('button', {
      name: /: dados indisponíveis$/,
    })
    expect(ufs).toHaveLength(27)
  })

  it('deve abrir a UF pelo mapa sem inventar resultado', async () => {
    await renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'São Paulo (SP): dados indisponíveis',
      }),
    )
    await screen.findByRole('heading', { name: 'São Paulo' })

    expect(window.location.hash).toBe('#/uf/SP')
    expect(
      screen.getByText('Dados indisponíveis nesta demonstração.'),
    ).toBeTruthy()
  })

  it('deve abrir a UF pelo teclado no mapa', async () => {
    await renderPage()

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Acre (AC): dados indisponíveis' }),
      { key: 'Enter' },
    )
    await screen.findByRole('heading', { name: 'Acre' })

    expect(window.location.hash).toBe('#/uf/AC')
  })

  it('deve voltar à visão Brasil pelo botão do cabeçalho', async () => {
    window.location.hash = '#/uf/DF'
    render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={server.fetcher}
      />,
    )
    await screen.findByRole('heading', {
      name: 'Presidente em Distrito Federal',
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Visão Brasil' })[0])
    await screen.findByRole('heading', { name: 'Brasil' })

    expect(window.location.hash).toBe('#/')
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
  })

  it('deve preservar o resultado e avisar quando a atualização falha', async () => {
    await renderPage()
    server.files['/publications/manifest.json'] = new TypeError('rede')

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const notice = await screen.findByRole('alert')

    expect(notice.textContent).toContain(
      'Não foi possível consultar os resultados. Exibindo a última versão válida.',
    )
    expect(results().getByText('60,00%')).toBeTruthy()
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
    server.publish(manifestFor(snapshot), snapshot)

    const { container } = await renderPage()

    expect(container.querySelector('img')).toBeNull()
    expect(results().getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
  })

  it('deve renderizar sem atributos de estilo inline', async () => {
    const { container } = await renderPage()

    expect(container.querySelectorAll('[style]')).toHaveLength(0)
  })
})

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
    server.publish(manifestFor(pendingSnapshot()), pendingSnapshot())

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
    server.publish(manifestFor(finished), finished)

    await renderPage()

    expect(screen.getByText('Apuração concluída · dados de 18:00')).toBeTruthy()
    expect(results().getByRole('status').textContent).toBe(STALE_COLLECTION)
  })

  it('deve falar de verificação da origem quando há checkedAt antigo', async () => {
    const checkedAt = '2026-10-25T21:00:30Z'
    vi.setSystemTime(Date.parse(checkedAt) + TEST_STALE_AFTER_MS)
    server.publish(
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
    server.files['/publications/manifest.json'] = new TypeError('rede')

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

describe('ConfigurationNotice', () => {
  it('deve explicar a configuração ausente sem resultados', () => {
    const problems = ['VITE_RESULTS_BASE_URL não foi definida neste build.']

    render(<ConfigurationNotice problems={problems} />)

    expect(
      screen.getByRole('heading', {
        name: 'Origem dos resultados não configurada',
      }),
    ).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain(
      'não fará consultas',
    )
    expect(screen.getByText(problems[0])).toBeTruthy()
  })
})
