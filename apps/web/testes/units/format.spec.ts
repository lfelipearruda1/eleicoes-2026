import { describe, expect, it } from 'vitest'

import {
  formatCount,
  formatPercentage,
  formatSourceClock,
} from '../../src/features/president/format.ts'

describe('formatCount', () => {
  it.each([
    ['0', '0'],
    ['999', '999'],
    ['1000', '1.000'],
    ['158745502', '158.745.502'],
  ])('deve agrupar %s como %s', (value, expected) => {
    const result = formatCount(value)

    expect(result).toBe(expected)
  })

  it('deve preservar contagem maior que o inteiro seguro', () => {
    const result = formatCount('9007199254740993')

    expect(result).toBe('9.007.199.254.740.993')
  })
})

describe('formatPercentage', () => {
  it('deve trocar só o separador, sem arredondar', () => {
    const result = formatPercentage('33.33')

    expect(result).toBe('33,33%')
  })
})

describe('formatSourceClock', () => {
  it('deve mostrar a data e a hora da origem como recebidas', () => {
    const result = formatSourceClock({ date: '15/10/2026', time: '09:38:12' })

    expect(result).toBe('15/10/2026 09:38:12')
  })
})
