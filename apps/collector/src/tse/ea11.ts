import { z } from 'zod'

import {
  TSE_CONFIG_PATH,
  TSE_NATIONAL_SCOPE,
  TSE_OFFICE_CODES,
  TSE_RESULT_DIRECTORY_TEMPLATE,
  TSE_RESULT_FILE_TYPE,
  TSE_SOURCES,
} from '../constants.js'
import { CollectorError } from '../error.js'
import { isKnownScope, type Office } from './ea20.js'

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

export interface ResultTarget {
  office: Office
  scope: string
}

export function parseTarget(office: string, scope: string): ResultTarget {
  if (!Object.hasOwn(TSE_OFFICE_CODES, office)) {
    throw new CollectorError(
      'INVALID_ARGUMENTS',
      `cargo "${office}" inválido: use president ou governor`,
    )
  }
  if (!isKnownScope(scope)) {
    throw new CollectorError(
      'INVALID_ARGUMENTS',
      `abrangência "${scope}" inválida: use br ou a sigla da UF em minúsculas`,
    )
  }
  if (office === 'governor' && scope === TSE_NATIONAL_SCOPE) {
    throw new CollectorError(
      'INVALID_ARGUMENTS',
      'governador exige a sigla de uma UF',
    )
  }
  return { office: office as Office, scope }
}

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

export function selectElection(
  config: ReturnType<typeof parseElectionConfig>,
  round: number,
  target: ResultTarget,
  requestedElection?: string,
): ElectionSelection {
  const configScope =
    target.office === 'president' ? TSE_NATIONAL_SCOPE : target.scope
  const matches = config.pl.flatMap((pleito) =>
    pleito.e
      .filter(
        (election) =>
          election.t === String(round) &&
          election.abr.some(
            (scope) =>
              scope.cd === configScope &&
              scope.cp.some(
                (office) => office.cd === TSE_OFFICE_CODES[target.office],
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
    const contest = `${target.office} em ${configScope}, turno ${round}`
    const detail = requestedElection
      ? `${contest}, eleição ${requestedElection}`
      : contest
    throw new CollectorError('ELECTION_NOT_FOUND', detail)
  }
  if (selected.length > 1) {
    const options = selected.map((match) => `${match.election} (${match.name})`)
    throw new CollectorError('ELECTION_AMBIGUOUS', options.join('; '))
  }
  return selected[0]
}

export function resultFileUrl(
  source: SourceName,
  selection: ElectionSelection,
  target: ResultTarget,
): URL {
  const { office: officeName, scope } = parseTarget(target.office, target.scope)
  const { host, environment } = TSE_SOURCES[source]
  const office = TSE_OFFICE_CODES[officeName].padStart(4, '0')
  const election = selection.election.padStart(6, '0')
  const file = `${scope}-c${office}-e${election}-${TSE_RESULT_FILE_TYPE}.json`
  return new URL(
    `https://${host}/${environment}/${selection.cycle}/${selection.election}/dados/${scope}/${file}`,
  )
}
