import type { ResultSnapshot } from '@eleicoes/validation'

import type { StatusIcon } from './components/StatusIndicator.tsx'
import { formatPercentage } from './format.ts'

interface StatusInput {
  snapshot: ResultSnapshot | undefined
  scopeName: string
  isChecking: boolean
  hasFailure: boolean
}

export interface HeaderStatus {
  percentage?: string
  display: string
  label: string
  icon: StatusIcon
  text: string
  blinking: boolean
}

const COMPLETE_PERCENTAGE = 100

const hasNotStarted = (snapshot: ResultSnapshot) =>
  snapshot.availability === 'pending' ||
  (snapshot.totalization.status === 'not_started' &&
    Number(snapshot.sections.totalizedPercentage) === 0)

const isFinished = (snapshot: ResultSnapshot) =>
  snapshot.totalization.status === 'finished' ||
  Number(snapshot.sections.totalizedPercentage) >= COMPLETE_PERCENTAGE

function indicator(
  input: StatusInput,
): Pick<HeaderStatus, 'icon' | 'text' | 'blinking'> {
  const { snapshot } = input
  if (!snapshot) {
    return input.hasFailure
      ? {
          icon: 'ring',
          text: 'Não foi possível carregar os dados',
          blinking: false,
        }
      : { icon: 'spin', text: 'Verificando atualizações.', blinking: false }
  }
  if (input.hasFailure) {
    return { icon: 'ring', text: 'Não foi possível atualizar', blinking: false }
  }
  if (hasNotStarted(snapshot)) {
    return { icon: 'ring', text: 'Apuração não iniciada', blinking: false }
  }
  if (isFinished(snapshot)) {
    return { icon: 'full', text: 'Apuração finalizada', blinking: false }
  }
  return { icon: 'full', text: 'Apuração em andamento', blinking: true }
}

export function describeHeaderStatus(input: StatusInput): HeaderStatus {
  const status = indicator(input)
  if (!input.snapshot) {
    return {
      ...status,
      display: '—',
      label: 'Carregando seções apuradas…',
    }
  }
  const percentage = input.snapshot.sections.totalizedPercentage
  return {
    ...status,
    percentage,
    display: formatPercentage(percentage),
    label: `seções apuradas · ${input.scopeName}`,
  }
}

export const ROUND_LABEL = { 1: 'Primeiro turno', 2: 'Segundo turno' } as const

export interface ResultSource {
  description: string
  site?: string
}

export const RESULT_SOURCES: Record<
  ResultSnapshot['sourceEnvironment'],
  ResultSource
> = {
  synthetic: {
    description: 'dados sintéticos de demonstração, sem valor oficial',
  },
  official: {
    description:
      'Tribunal Superior Eleitoral (TSE), divulgação oficial dos resultados das Eleições 2026',
    site: 'https://resultados.tse.jus.br/',
  },
  simulated: {
    description:
      'ambiente de simulação da divulgação do TSE, sem valor oficial',
    site: 'https://resultados-sim.tse.jus.br/',
  },
}
