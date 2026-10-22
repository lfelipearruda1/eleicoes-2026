// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrazilMap } from '../../src/features/map/components/BrazilMap.tsx'
import { NATIONAL_SCOPE } from '../../src/features/map/ufs.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderMap(focusVisible: boolean) {
  const matches = Element.prototype.matches
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
    this: Element,
    selector: string,
  ) {
    return selector === ':focus-visible'
      ? focusVisible
      : matches.call(this, selector)
  })
  render(
    <BrazilMap results={{}} scope={NATIONAL_SCOPE} onSelectUf={() => {}} />,
  )
  return screen.getByRole('button', { name: /^Minas Gerais \(MG\)/ })
}

describe('BrazilMap: tooltip', () => {
  it('deve fechar o tooltip quando o mouse sai do estado clicado', () => {
    const minasGerais = renderMap(false)

    fireEvent.mouseEnter(minasGerais)
    expect(screen.queryByText('Minas Gerais')).not.toBeNull()
    fireEvent.click(minasGerais)
    fireEvent.focus(minasGerais)
    fireEvent.mouseLeave(minasGerais)

    expect(screen.queryByText('Minas Gerais')).toBeNull()
  })

  it('deve mostrar o tooltip para quem navega pelo teclado', () => {
    const minasGerais = renderMap(true)

    fireEvent.focus(minasGerais)

    expect(screen.queryByText('Minas Gerais')).not.toBeNull()
  })
})
