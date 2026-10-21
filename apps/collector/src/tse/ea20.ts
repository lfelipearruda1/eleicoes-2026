import { z } from 'zod'

import { TSE_NATIONAL_SCOPE, TSE_PRESIDENT_OFFICE_CODE } from '../constants.js'
import { CollectorError } from '../error.js'

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

const candidateSchema = z.object({
  n: countSchema,
  sqcand: countSchema,
  nmu: z.string().min(1),
  vap: countSchema,
  pvap: percentSchema,
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
}

export function parsePresidentialResult(
  document: unknown,
  expected?: ExpectedResult,
) {
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
  if (result.cdabr !== TSE_NATIONAL_SCOPE) {
    throw new CollectorError(
      'TSE_RESULT_MISMATCH',
      `abrangência ${result.cdabr}`,
    )
  }
  if ((result.dt === '') !== (result.ht === '')) {
    throw new CollectorError('INVALID_TSE_RESULT', 'dt, ht')
  }
  const office = result.carg.find(
    (entry) => entry.cd === TSE_PRESIDENT_OFFICE_CODE,
  )
  if (!office) {
    throw new CollectorError(
      'TSE_RESULT_MISMATCH',
      `cargo ${TSE_PRESIDENT_OFFICE_CODE} ausente`,
    )
  }

  return {
    election: result.ele,
    round: Number(result.t),
    scope: result.cdabr,
    office: office.cd,
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
      })),
  }
}

export type PresidentialSummary = ReturnType<typeof parsePresidentialResult>
