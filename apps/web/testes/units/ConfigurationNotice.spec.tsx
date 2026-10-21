// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ConfigurationNotice } from '../../src/features/president/components/ConfigurationNotice.tsx'
import { itemAt } from './fixtures.ts'

afterEach(cleanup)

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
    expect(screen.getByText(itemAt(problems, 0))).toBeTruthy()
  })
})
