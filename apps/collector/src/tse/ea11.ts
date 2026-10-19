import { z } from 'zod'

import {
  TSE_CONFIG_PATH,
  TSE_NATIONAL_SCOPE,
  TSE_PRESIDENT_OFFICE_CODE,
  TSE_RESULT_DIRECTORY_TEMPLATE,
  TSE_RESULT_FILE_TYPE,
  TSE_SOURCES,
} from '../constants.js'
import { CollectorError } from '../error.js'

export type SourceName = keyof typeof TSE_SOURCES

const digitsSchema = z.string().regex(/^\d{1,6}$/)

const configSchema = z.object({
  arq: z.array(z.object({ tp: z.string(), dir: z.string() })),
  pl: z.array(
    z.object({
      cd: digitsSchema,
      c: z.string().regex(/^ele\d{4}$/),
      e: z.array(
        z.object({
          cd: digitsSchema,
          nm: z.string(),
          t: z.string(),
          abr: z.array(
            z.object({
              cd: z.string(),
              cp: z.array(z.object({ cd: z.string() })),
            }),
          ),
        }),
      ),
    }),
  ),
})

export interface ElectionSelection {
  cycle: string
  pleito: string
  election: string
  name: string
}

export function configUrl(source: SourceName): URL {
  const { host, environment } = TSE_SOURCES[source]
  const path = TSE_CONFIG_PATH.replace('{environment}', environment)
  return new URL(`https://${host}${path}`)
}

export function parseElectionConfig(document: unknown) {
  const parsed = configSchema.safeParse(document)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.'))
    throw new CollectorError(
      'INVALID_TSE_CONFIG',
      [...new Set(fields)].join(', '),
    )
  }
  const resultDirectory = parsed.data.arq.find(
    (entry) => entry.tp === TSE_RESULT_FILE_TYPE,
  )?.dir
  if (resultDirectory !== TSE_RESULT_DIRECTORY_TEMPLATE) {
    throw new CollectorError('TSE_LAYOUT_CHANGED', String(resultDirectory))
  }
  return parsed.data
}

export function selectPresidentialElection(
  config: ReturnType<typeof parseElectionConfig>,
  round: number,
  requestedElection?: string,
): ElectionSelection {
  const matches = config.pl.flatMap((pleito) =>
    pleito.e
      .filter(
        (election) =>
          election.t === String(round) &&
          election.abr.some(
            (scope) =>
              scope.cd === TSE_NATIONAL_SCOPE &&
              scope.cp.some(
                (office) => office.cd === TSE_PRESIDENT_OFFICE_CODE,
              ),
          ),
      )
      .map((election) => ({
        cycle: pleito.c,
        pleito: pleito.cd,
        election: election.cd,
        name: election.nm,
      })),
  )
  const selected = requestedElection
    ? matches.filter((match) => match.election === requestedElection)
    : matches
  if (selected.length === 0) {
    const detail = requestedElection
      ? `turno ${round}, eleição ${requestedElection}`
      : `turno ${round}`
    throw new CollectorError('ELECTION_NOT_FOUND', detail)
  }
  if (selected.length > 1) {
    const options = selected.map((match) => `${match.election} (${match.name})`)
    throw new CollectorError('ELECTION_AMBIGUOUS', options.join('; '))
  }
  return selected[0]
}

export function presidentialResultUrl(
  source: SourceName,
  selection: ElectionSelection,
): URL {
  const { host, environment } = TSE_SOURCES[source]
  const office = TSE_PRESIDENT_OFFICE_CODE.padStart(4, '0')
  const election = selection.election.padStart(6, '0')
  const scope = TSE_NATIONAL_SCOPE
  const file = `${scope}-c${office}-e${election}-${TSE_RESULT_FILE_TYPE}.json`
  return new URL(
    `https://${host}/${environment}/${selection.cycle}/${selection.election}/dados/${scope}/${file}`,
  )
}
