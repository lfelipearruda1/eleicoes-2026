import { BRAZILIAN_STATE_CODES } from '@eleicoes/validation'
import { z } from 'zod'

import { TSE_NATIONAL_SCOPE, TSE_OFFICE_CODES } from '../constants.js'
import { CollectorError } from '../error.js'

export type Office = keyof typeof TSE_OFFICE_CODES

const countSchema = z.string().regex(/^\d+$/)
const percentSchema = z.string().regex(/^\d{1,3},\d{2}$/)
const dateSchema = z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/)
const timeSchema = z.string().regex(/^\d{2}:\d{2}:\d{2}$/)
const flagSchema = z.enum(['s', 'n'])

const TOTALIZATION_STATUS = {
  n: 'not_started',
  p: 'in_progress',
  f: 'finished',
} as const

const VOTE_DESTINATION = {
  valido: 'valid',
  'valido (legenda)': 'valid_party',
  anulado: 'annulled',
  'anulado sub judice': 'annulled_sub_judice',
} as const

const KNOWN_SCOPES = new Set<string>([
  TSE_NATIONAL_SCOPE,
  ...BRAZILIAN_STATE_CODES.map((code) => code.toLowerCase()),
])

export const isKnownScope = (scope: string) => KNOWN_SCOPES.has(scope)

const destinationKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

const destinationSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value.trim() === '') return undefined
    const destination =
      VOTE_DESTINATION[destinationKey(value) as keyof typeof VOTE_DESTINATION]
    if (!destination) {
      ctx.addIssue({ code: 'custom', message: `dvt "${value}" desconhecido` })
      return z.NEVER
    }
    return destination
  })

const candidateSchema = z.object({
  n: countSchema,
  sqcand: countSchema,
  nmu: z.string().min(1),
  vap: countSchema,
  pvap: percentSchema,
  dvt: destinationSchema,
})

const resultSchema = z.object({
  ele: countSchema,
  t: z.enum(['1', '2']),
  cdabr: z.string(),
  dg: dateSchema,
  hg: timeSchema,
  idg: countSchema,
  dt: dateSchema.or(z.literal('')),
  ht: timeSchema.or(z.literal('')),
  dv: flagSchema,
  tf: flagSchema,
  and: z.enum(['n', 'p', 'f']),
  carg: z.array(
    z.object({
      cd: z.string(),
      agr: z.array(
        z.object({
          par: z.array(z.object({ cand: z.array(candidateSchema) })),
        }),
      ),
    }),
  ),
  s: z.object({ ts: countSchema, st: countSchema, pst: percentSchema }),
  v: z.object({ tv: countSchema, vvc: countSchema, vv: countSchema }),
})

export interface ExpectedResult {
  election: string
  round: number
  office: Office
  scope: string
}

const officeOf = (code: string) =>
  (Object.keys(TSE_OFFICE_CODES) as Office[]).find(
    (office) => TSE_OFFICE_CODES[office] === code,
  )

export function parseResult(document: unknown, expected?: ExpectedResult) {
  const parsed = resultSchema.safeParse(document)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.'))
    throw new CollectorError(
      'INVALID_TSE_RESULT',
      [...new Set(fields)].join(', '),
    )
  }
  const result = parsed.data
  if (expected && result.ele !== expected.election) {
    throw new CollectorError('TSE_RESULT_MISMATCH', `eleição ${result.ele}`)
  }
  if (expected && result.t !== String(expected.round)) {
    throw new CollectorError('TSE_RESULT_MISMATCH', `turno ${result.t}`)
  }
  const scope = expected?.scope ?? result.cdabr
  if (result.cdabr !== scope || !isKnownScope(scope)) {
    throw new CollectorError(
      'TSE_RESULT_MISMATCH',
      `abrangência ${result.cdabr}`,
    )
  }
  if ((result.dt === '') !== (result.ht === '')) {
    throw new CollectorError('INVALID_TSE_RESULT', 'dt, ht')
  }
  const knownOffices = result.carg.filter((entry) => officeOf(entry.cd))
  const office = expected
    ? result.carg.find(
        (entry) => entry.cd === TSE_OFFICE_CODES[expected.office],
      )
    : knownOffices.length === 1
      ? knownOffices[0]
      : undefined
  const officeName = office && officeOf(office.cd)
  if (!office || !officeName) {
    throw new CollectorError(
      'TSE_RESULT_MISMATCH',
      expected
        ? `cargo ${TSE_OFFICE_CODES[expected.office]} ausente`
        : 'cargo não identificado',
    )
  }
  if (officeName === 'governor' && scope === TSE_NATIONAL_SCOPE) {
    throw new CollectorError('TSE_RESULT_MISMATCH', 'governador no Brasil')
  }

  return {
    election: result.ele,
    round: Number(result.t),
    scope,
    office: officeName,
    votesReleased: result.dv === 's',
    totalizationStatus: TOTALIZATION_STATUS[result.and],
    finalIndicator: result.tf === 's',
    generation: { id: result.idg, date: result.dg, time: result.hg },
    totalizedAt:
      result.dt === '' ? undefined : { date: result.dt, time: result.ht },
    sections: {
      total: result.s.ts,
      totalized: result.s.st,
      totalizedPercent: result.s.pst,
    },
    votes: {
      total: result.v.tv,
      valid: result.v.vv,
      contestant: result.v.vvc,
    },
    candidates: office.agr
      .flatMap((group) => group.par.flatMap((party) => party.cand))
      .map((candidate) => ({
        candidateId: candidate.sqcand,
        number: candidate.n,
        ballotName: candidate.nmu,
        votes: candidate.vap,
        contestantVotesPercent: candidate.pvap,
        voteDestination: candidate.dvt,
      })),
  }
}

export type ResultSummary = ReturnType<typeof parseResult>
