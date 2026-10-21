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

  it('deve mostrar a hora da origem como recebida, sem conversão de fuso', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: availableSnapshot(),
    })

    expect(status.text).toBe(
      'Apuração em andamento · dados de 18:00 · 25/10/2026',
    )
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

  it('deve indicar falha preservando a hora dos dados exibidos', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: availableSnapshot(),
      hasFailure: true,
    })

    expect(status.text).toBe('Não foi possível atualizar · dados de 18:00')
  })

  it('deve indicar a verificação manual em andamento', () => {
    const status = describeHeaderStatus({
      ...base,
      snapshot: availableSnapshot(),
      isChecking: true,
    })

    expect(status).toMatchObject({
      icon: 'spin',
      text: 'Verificando atualizações.',
    })
  })

  it('deve diferenciar votação não liberada de apuração não iniciada', () => {
    const notReleased = describeHeaderStatus({
      ...base,
      snapshot: pendingSnapshot(),
    })
    const notStarted = describeHeaderStatus({
      ...base,
      snapshot: pendingSnapshot({
        votesReleased: true,
        pendingReason: 'totalization_not_started',
        totalization: { status: 'not_started', finalIndicator: false },
      }),
    })

    expect(notReleased.text).toBe(
      'Aguardando liberação dos votos · dados de 18:00',
    )
    expect(notStarted.text).toBe('Aguardando apuração')
  })

  it('deve indicar apuração concluída só com totalização finalizada', () => {
    const snapshot = availableSnapshot({
      totalization: { status: 'finished', finalIndicator: true },
    })

    const status = describeHeaderStatus({ ...base, snapshot })

    expect(status).toMatchObject({
      icon: 'full',
      text: 'Apuração concluída · dados de 18:00',
    })
  })
})
