// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AnimatedNumber } from '../../src/features/president/components/AnimatedNumber.tsx'

afterEach(cleanup)

describe('AnimatedNumber', () => {
  it('deve mostrar o valor inicial sem animação', () => {
    render(<AnimatedNumber value="45,26%" />)

    expect(screen.getByText('45,26%')).toBeTruthy()
  })

  it('deve partir do valor anterior e chegar exatamente ao novo', async () => {
    const { rerender } = render(<AnimatedNumber value="1.000 votos" />)

    rerender(<AnimatedNumber value="9.007.199.254.740.993 votos" />)

    expect(screen.getByText('1.000 votos')).toBeTruthy()
    expect(
      await screen.findByText(
        '9.007.199.254.740.993 votos',
        {},
        { timeout: 3_000 },
      ),
    ).toBeTruthy()
  })

  it('deve trocar sem animar o texto que não começa por número', async () => {
    const { rerender } = render(<AnimatedNumber value="—" />)

    rerender(<AnimatedNumber value="50,00%" />)

    expect(await screen.findByText('50,00%')).toBeTruthy()
  })
})
