import type { PresidentialSnapshot } from '@eleicoes/validation'

import type { StatusIcon } from './components/StatusIndicator.tsx'
import { formatPercentage } from './format.ts'

interface StatusInput {
  snapshot: PresidentialSnapshot | undefined
  ufName: string | undefined
  isChecking: boolean
  hasFailure: boolean
}

export interface HeaderStatus {
  percentage: string | undefined
  display: string
  label: string
  icon: StatusIcon
  text: string
}

const sourceClock = (snapshot: PresidentialSnapshot) => {
  const clock = snapshot.origin.totalizedAt ?? snapshot.origin.generatedAt
  return { time: clock.time.slice(0, 5), date: clock.date }
}

function indicator(input: StatusInput): Pick<HeaderStatus, 'icon' | 'text'> {
  const { snapshot } = input
  if (input.isChecking || (!snapshot && !input.hasFailure)) {
    return { icon: 'spin', text: 'Verificando atualizações.' }
  }
  if (!snapshot)
    return { icon: 'ring', text: 'Não foi possível carregar os dados' }
  const { time, date } = sourceClock(snapshot)
  if (input.hasFailure) {
    return {
      icon: 'ring',
      text: `Não foi possível atualizar · dados de ${time}`,
    }
  }
  if (snapshot.availability === 'pending') {
    return snapshot.pendingReason === 'votes_not_released'
      ? {
          icon: 'ring',
          text: `Aguardando liberação dos votos · dados de ${time}`,
        }
      : { icon: 'ring', text: 'Aguardando apuração' }
  }
  if (snapshot.totalization.status === 'finished') {
    return { icon: 'full', text: `Apuração concluída · dados de ${time}` }
  }
  return {
    icon: 'ring',
    text: `Apuração em andamento · dados de ${time} · ${date}`,
  }
}

export function describeHeaderStatus(input: StatusInput): HeaderStatus {
  const status = indicator(input)
  if (!input.snapshot) {
    return {
      ...status,
      percentage: undefined,
      display: '—',
      label: 'Carregando seções apuradas…',
    }
  }
  if (input.ufName) {
    return {
      ...status,
      percentage: undefined,
      display: '—',
      label: `Seções apuradas · ${input.ufName} · indisponível`,
    }
  }
  const percentage = input.snapshot.sections.totalizedPercentage
  return {
    ...status,
    percentage,
    display: formatPercentage(percentage),
    label: 'seções apuradas · Brasil',
  }
}

export const ROUND_LABEL = { 1: 'Primeiro turno', 2: 'Segundo turno' } as const

export const PROVENANCE: Record<
  PresidentialSnapshot['sourceEnvironment'],
  string
> = {
  synthetic: 'Demonstração — dados fictícios, sem valor oficial.',
  official:
    'Captura oficial do TSE reprocessada localmente; autenticidade não verificada.',
  simulated: 'Ambiente simulado do TSE, sem valor oficial.',
}

export const SOURCE_LABEL: Record<
  PresidentialSnapshot['sourceEnvironment'],
  string
> = {
  synthetic: 'dados sintéticos',
  official: 'TSE',
  simulated: 'TSE (simulado)',
}
