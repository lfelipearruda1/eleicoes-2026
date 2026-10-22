import { describe, expect, it } from 'vitest'

import { describeHeaderStatus } from '../../src/features/president/status.ts'
import { availableSnapshot, pendingSnapshot } from './fixtures.ts'

const base = { scopeName: 'Brasil', isChecking: false, hasFailure: false }

describe('describeHeaderStatus', () => {
  it('deve indicar carregamento sem percentual antes da primeira leitura', () => {
    const status = describeHeaderStatus({ ...base, snapshot: undefined })

    expect(status).toMatchObject({
      display: '—',
      icon: 'spin',
      label: 'Carregando seções apuradas…',
    })
  })

  it('deve mostrar o percentual de seções publicado para o Brasil', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: availableSnapshot(),
    })

    expect(status).toMatchObject({
      display: '50,00%',
      label: 'seções apuradas · Brasil',
    })
  })

  it('deve piscar "Apuração em andamento" sem hora nem data', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: availableSnapshot(),
    })

    expect(status).toMatchObject({
      text: 'Apuração em andamento',
      blinking: true,
    })
  })

  it('deve mostrar as seções apuradas da UF aberta', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: availableSnapshot({ scope: 'AC' }),
      scopeName: 'Acre',
    })

    expect(status).toMatchObject({
      percentage: '50.00',
      display: '50,00%',
      label: 'seções apuradas · Acre',
    })
  })

  it('deve aguardar os dados da UF sem mostrar os do Brasil', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: undefined,
      scopeName: 'Acre',
    })

    expect(status.display).toBe('—')
    expect(status).not.toHaveProperty('percentage')
  })

  it('deve indicar falha sem hora e sem piscar', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: availableSnapshot(),
      hasFailure: true,
    })

    expect(status).toMatchObject({
      text: 'Não foi possível atualizar',
      blinking: false,
    })
  })

  it('deve manter "Apuração em andamento" enquanto verifica atualizações', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: availableSnapshot(),
      isChecking: true,
    })

    expect(status).toMatchObject({
      text: 'Apuração em andamento',
      blinking: true,
    })
  })

  it('deve mostrar "Apuração em andamento" antes de a apuração começar', () => {
    const notReleased = describeHeaderStatus({
      ...base,
      snapshot: pendingSnapshot(),
    })

    expect(notReleased).toMatchObject({
      text: 'Apuração em andamento',
      blinking: true,
    })
  })

  it('deve parar de piscar e indicar "Apuração finalizada" com totalização finalizada', () => {
    const snapshot = availableSnapshot({
      totalization: { status: 'finished', finalIndicator: true },
    })

    const status = describeHeaderStatus({ ...base, snapshot })

    expect(status).toMatchObject({
      icon: 'full',
      text: 'Apuração finalizada',
      blinking: false,
    })
  })

  it('deve indicar "Apuração finalizada" ao chegar em 100% das seções', () => {
    const snapshot = availableSnapshot()
    snapshot.sections.totalizedPercentage = '100.00'

    const status = describeHeaderStatus({ ...base, snapshot })

    expect(status).toMatchObject({
      text: 'Apuração finalizada',
      blinking: false,
    })
  })
})
