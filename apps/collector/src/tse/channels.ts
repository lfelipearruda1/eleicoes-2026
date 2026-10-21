import { channelSchema } from '@eleicoes/validation'

import { CollectorError } from '../error.js'
import type { ResultTarget } from './ea11.js'

const CHANNEL_OFFICE = { president: 'presidente', governor: 'governador' }

function checkedChannel(prefix: string, channel: string): string {
  if (!channelSchema.safeParse(channel).success) {
    throw new CollectorError(
      'INVALID_ARGUMENTS',
      `prefixo de canal "${prefix}" inválido: use minúsculas, dígitos e hífens`,
    )
  }
  return channel
}

export function channelFor(
  prefix: string,
  target: ResultTarget,
  round: number,
): string {
  return checkedChannel(
    prefix,
    `${prefix}-${CHANNEL_OFFICE[target.office]}-${target.scope}-${round}t`,
  )
}

export function summaryChannelFor(prefix: string, round: number): string {
  return checkedChannel(prefix, `${prefix}-mapa-presidente-${round}t`)
}
