// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PresidentPage } from '../../src/features/president/components/PresidentPage.tsx'
import {
  availableSnapshot,
  fakeServer,
  manifestFor,
  pendingSnapshot,
} from './fixtures.ts'

let server: ReturnType<typeof fakeServer>

beforeEach(() => {
  window.location.hash = ''
  server = fakeServer()
  server.publish(manifestFor(availableSnapshot()), availableSnapshot())
})

afterEach(cleanup)

const renderPage = async () => {
  const view = render(<PresidentPage fetcher={server.fetcher} />)
  await screen.findByRole('heading', { name: 'Presidente' })
  return view
}

const results = () => within(screen.getByRole('region', { name: 'Brasil' }))

describe('PresidentPage', () => {
  it('deve mostrar o carregamento antes da primeira leitura', () => {
    render(<PresidentPage fetcher={server.fetcher} />)

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

  it('deve manter visível o aviso de dados sintéticos', async () => {
    await renderPage()

    expect(
      screen.getByText('Demonstração — dados sintéticos, sem valor oficial.'),
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
    render(<PresidentPage fetcher={server.fetcher} />)
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
      'Não foi possível atualizar. Exibindo o último resultado disponível.',
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
