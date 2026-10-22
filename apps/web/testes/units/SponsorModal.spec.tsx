// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SponsorModal } from '../../src/features/sponsor/components/SponsorModal.tsx'

beforeEach(() => {
  sessionStorage.clear()
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(cleanup)

const dialog = () => screen.getByRole('dialog', { hidden: true })

describe('SponsorModal', () => {
  it('deve abrir o anúncio na primeira visita da sessão', () => {
    render(<SponsorModal />)

    expect(dialog().hasAttribute('open')).toBe(true)
    expect(screen.getByRole('heading', { name: 'Em breve' })).toBeTruthy()
  })

  it('deve levar ao Instagram da Casa Sarto em nova aba', () => {
    render(<SponsorModal />)

    const link = screen.getByRole('link', { name: /Siga nosso Instagram/ })

    expect(link.getAttribute('href')).toBe(
      'https://www.instagram.com/casasarto.co/',
    )
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('deve fechar pelo X e não abrir de novo ao recarregar na mesma sessão', () => {
    const first = render(<SponsorModal />)

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(dialog().hasAttribute('open')).toBe(false)
    first.unmount()
    render(<SponsorModal />)

    expect(dialog().hasAttribute('open')).toBe(false)
  })
})
