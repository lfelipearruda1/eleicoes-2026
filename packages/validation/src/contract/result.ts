import { z } from 'zod'

import { RULE_MESSAGES } from './constants.js'
import { checkContextRules, envelopeShape, sourceShape } from './envelope.js'

export const countSchema = z.string().regex(/^(0|[1-9]\d*)$/)
export const sourceIdSchema = z.string().regex(/^\d+$/)
export const percentageSchema = z.string().regex(/^\d{1,3}\.\d{2}$/)
export const CANDIDATE_PHOTOS_DIRECTORY = 'fotos'
export const candidatePhotoSchema = z.string().regex(/^fotos\/\d{1,20}\.jpeg$/)
export const candidatePhotoPath = (candidateId: string) =>
  `${CANDIDATE_PHOTOS_DIRECTORY}/${candidateId}.jpeg`
const sourceClockSchema = {
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
}

export const PENDING_REASONS = [
  'votes_not_released',
  'totalization_not_started',
] as const

export const VOTE_DESTINATIONS = [
  'valid',
  'valid_party',
  'annulled',
  'annulled_sub_judice',
] as const

export const TOTALIZATION_STATUSES = [
  'not_started',
  'in_progress',
  'finished',
] as const

function buildSchema(strict: boolean) {
  const object = (strict ? z.strictObject : z.object) as typeof z.object
  const candidateIdentity = {
    candidateId: sourceIdSchema,
    number: sourceIdSchema,
    ballotName: z.string().min(1),
    photo: candidatePhotoSchema.exactOptional(),
    party: z
      .string()
      .regex(/^[\p{Lu}\p{N}][\p{Lu}\p{N} -]{0,19}$/u)
      .exactOptional(),
  }
  const common = {
    ...envelopeShape,
    source: object(sourceShape),
    votesReleased: z.boolean(),
    totalization: object({
      status: z.enum(TOTALIZATION_STATUSES),
      finalIndicator: z.boolean(),
    }),
    sections: object({
      total: countSchema,
      totalized: countSchema,
      totalizedPercentage: percentageSchema,
    }),
    origin: object({
      electionCode: sourceIdSchema,
      generationId: sourceIdSchema,
      generatedAt: object(sourceClockSchema),
      totalizedAt: object(sourceClockSchema).exactOptional(),
    }),
  }
  return z
    .discriminatedUnion('availability', [
      object({
        ...common,
        availability: z.literal('pending'),
        pendingReason: z.enum(PENDING_REASONS),
        candidates: z.array(object(candidateIdentity)),
      }),
      object({
        ...common,
        availability: z.literal('available'),
        votes: object({
          total: countSchema,
          valid: countSchema,
          contestant: countSchema,
        }),
        candidates: z.array(
          object({
            ...candidateIdentity,
            votes: countSchema,
            contestantVotesPercentage: percentageSchema,
            voteDestination: z.enum(VOTE_DESTINATIONS).exactOptional(),
          }),
        ),
      }),
    ])
    .superRefine((snapshot, ctx) => {
      checkContextRules(snapshot, ctx)
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: 'custom', path, message })
      const notStarted = snapshot.totalization.status === 'not_started'
      if (snapshot.availability === 'available' && !snapshot.votesReleased) {
        issue(['votesReleased'], RULE_MESSAGES.availableWithoutRelease)
      }
      if (snapshot.availability === 'available' && notStarted) {
        issue(['totalization', 'status'], RULE_MESSAGES.availableNotStarted)
      }
      if (
        snapshot.availability === 'pending' &&
        (snapshot.pendingReason === 'votes_not_released') ===
          snapshot.votesReleased
      ) {
        issue(['pendingReason'], RULE_MESSAGES.pendingReasonMismatch)
      }
      if (
        snapshot.availability === 'pending' &&
        snapshot.pendingReason === 'totalization_not_started' &&
        !notStarted
      ) {
        issue(['pendingReason'], RULE_MESSAGES.pendingReasonMismatch)
      }
      if (
        BigInt(snapshot.sections.totalized) > BigInt(snapshot.sections.total)
      ) {
        issue(['sections', 'totalized'], RULE_MESSAGES.sectionsOverTotal)
      }
      for (const key of ['candidateId', 'number'] as const) {
        const values = snapshot.candidates.map((candidate) => candidate[key])
        if (new Set(values).size !== values.length) {
          issue(['candidates'], RULE_MESSAGES.duplicateCandidate)
        }
      }
    })
}

export const publishResultSnapshotSchema = buildSchema(true)

export const readResultSnapshotSchema = buildSchema(false)

export type ResultSnapshot = z.infer<typeof publishResultSnapshotSchema>
