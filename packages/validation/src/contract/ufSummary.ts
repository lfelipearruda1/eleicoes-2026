import { z } from 'zod'

import { BRAZILIAN_STATE_CODES, RULE_MESSAGES } from './constants.js'
import {
  checkContextRules,
  dataVersionSchema,
  envelopeShape,
  sourceShape,
  utcTimestampSchema,
} from './envelope.js'
import {
  countSchema,
  percentageSchema,
  sourceIdSchema,
  TOTALIZATION_STATUSES,
  VOTE_DESTINATIONS,
} from './result.js'

function buildSchema(strict: boolean) {
  const object = (strict ? z.strictObject : z.object) as typeof z.object
  const ufCommon = {
    scope: z.enum(BRAZILIAN_STATE_CODES),
    dataVersion: dataVersionSchema,
    collectedAt: utcTimestampSchema,
    totalizationStatus: z.enum(TOTALIZATION_STATUSES),
    sections: object({
      total: countSchema,
      totalized: countSchema,
      totalizedPercentage: percentageSchema,
    }),
  }
  const ufSchema = z.discriminatedUnion('availability', [
    object({
      ...ufCommon,
      availability: z.literal('pending'),
      candidates: z.array(object({ candidateId: sourceIdSchema })),
    }),
    object({
      ...ufCommon,
      availability: z.literal('available'),
      candidates: z.array(
        object({
          candidateId: sourceIdSchema,
          votes: countSchema,
          contestantVotesPercentage: percentageSchema,
          voteDestination: z.enum(VOTE_DESTINATIONS).exactOptional(),
        }),
      ),
    }),
  ])
  return object({
    ...envelopeShape,
    kind: z.literal('uf-summary'),
    office: z.literal('president'),
    scope: z.literal('BR'),
    availability: z.literal('available'),
    source: object(sourceShape),
    ufs: z.array(ufSchema),
  }).superRefine((summary, ctx) => {
    checkContextRules(summary, ctx)
    const scopes = summary.ufs.map((uf) => uf.scope)
    if (new Set(scopes).size !== scopes.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['ufs'],
        message: RULE_MESSAGES.duplicateScope,
      })
    }
  })
}

export const publishUfSummarySchema = buildSchema(true)

export const readUfSummarySchema = buildSchema(false)

export type UfSummarySnapshot = z.infer<typeof publishUfSummarySchema>
