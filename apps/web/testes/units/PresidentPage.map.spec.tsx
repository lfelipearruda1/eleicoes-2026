// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { availableSnapshot, manifestFor } from './fixtures.ts'
import { setupPresidentPage } from './pageHarness.tsx'

const { page, renderPage } = setupPresidentPage()

describe('PresidentPage — mapa por UF', () => {
  const SUMMARY_CHANNEL = 'demo-sintetico-mapa-presidente-2t'

  function publishSummary() {
    const national = availableSnapshot()
    const summary = {
      ...national,
      kind: 'uf-summary',
      dataVersion: '2d9e1c74-5b3a-4f4c-9e6d-8a0b3c4d5e6f',
      ufs: [
        {
          scope: 'SP',
          dataVersion: '3e0f2d85-6c4b-4a5d-8f7e-9b1c4d5e6f70',
          collectedAt: national.collectedAt,
          availability: 'available',
          totalizationStatus: 'in_progress',
          sections: national.sections,
          candidates: [
            {
              candidateId: '900000000001',
              votes: '7000',
              contestantVotesPercentage: '70.00',
            },
            {
              candidateId: '900000000002',
              votes: '3000',
              contestantVotesPercentage: '30.00',
            },
          ],
        },
      ],
    }
    const manifest = manifestFor(national, 1, {
      channel: SUMMARY_CHANNEL,
      current: {
        dataVersion: summary.dataVersion,
        path: `snapshots/${summary.dataVersion}.json`,
        publishedAt: '2026-10-25T21:01:00Z',
      },
    })
    page.server.files[`/publications/${SUMMARY_CHANNEL}/manifest.json`] =
      manifest
    page.server.files[
      `/publications/${SUMMARY_CHANNEL}/snapshots/${summary.dataVersion}.json`
    ] = summary
  }

  it('deve descrever no mapa a candidatura à frente em cada UF do resumo', async () => {
    publishSummary()

    await renderPage()

    expect(
      await screen.findByRole('button', {
        name: 'São Paulo (SP): CANDIDATURA SINTÉTICA A à frente com 70,00%',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Bahia (BA): dados indisponíveis' }),
    ).toBeTruthy()
  })

  it('deve mostrar os percentuais da UF na lista textual', async () => {
    publishSummary()
    await renderPage()
    await screen.findByRole('button', { name: /São Paulo \(SP\): .*à frente/ })

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))

    const row = screen.getByRole('row', {
      name: 'São Paulo: CANDIDATURA SINTÉTICA A à frente com 70,00%',
    })
    expect(within(row).getByText('70,00%')).toBeTruthy()
    expect(within(row).getByText('30,00%')).toBeTruthy()
  })
})
