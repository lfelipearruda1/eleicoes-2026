// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ThemeToggle } from '../../src/features/theme/ThemeToggle.tsx'
import { THEME_STORAGE_KEY } from '../../src/features/theme/theme.ts'

beforeEach(() => {
  sessionStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(cleanup)

describe('ThemeToggle', () => {
  it('deve começar no modo claro', () => {
    render(<ThemeToggle />)

    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(
      screen.getByRole('button', { name: 'Ativar modo escuro' }),
    ).toBeTruthy()
  })

  it('deve alternar entre escuro e claro e lembrar a escolha na aba', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo escuro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(sessionStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo claro' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(sessionStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('deve manter o modo escuro ao recarregar a mesma aba', () => {
    sessionStorage.setItem(THEME_STORAGE_KEY, 'dark')

    render(<ThemeToggle />)

    expect(
      screen.getByRole('button', { name: 'Ativar modo claro' }),
    ).toBeTruthy()
  })
})
