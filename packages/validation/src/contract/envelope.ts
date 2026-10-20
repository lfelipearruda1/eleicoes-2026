import { z } from 'zod'

import {
  BRAZILIAN_STATE_CODES,
  CANONICAL_UUID_V4_PATTERN,
  RULE_MESSAGES,
} from './constants.js'

export const utcTimestampSchema = z.iso.datetime()

export const dataVersionSchema = z.string().regex(CANONICAL_UUID_V4_PATTERN)

export const publicationContextShape = {
  environment: z.enum(['local', 'staging', 'production']),
  sourceEnvironment: z.enum(['official', 'simulated', 'synthetic']),
  round: z.literal([1, 2]),
  office: z.enum(['president', 'governor']),
  scope: z.enum(['BR', ...BRAZILIAN_STATE_CODES]),
}

export type PublicationContext = z.infer<
  z.ZodObject<typeof publicationContextShape>
>

export const PUBLICATION_CONTEXT_FIELDS = Object.keys(
  publicationContextShape,
) as (keyof PublicationContext)[]

export function checkContextRules(
  context: PublicationContext,
  ctx: z.RefinementCtx,
): void {
  if (
    context.environment === 'production' &&
    context.sourceEnvironment !== 'official'
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['sourceEnvironment'],
      message: RULE_MESSAGES.productionWithoutOfficialSource,
    })
  }
  if (context.office === 'governor' && context.scope === 'BR') {
    ctx.addIssue({
      code: 'custom',
      path: ['scope'],
      message: RULE_MESSAGES.governorWithNationalScope,
    })
  }
}

export const sourceShape = {
  file: z
    .string()
    .min(1)
    .refine((value) => !value.includes('://'), RULE_MESSAGES.sourceFileWithHost)
    .refine((value) => !value.includes('?'), RULE_MESSAGES.sourceFileWithQuery),
}

export const envelopeShape = {
  contractVersion: z.literal(1),
  dataVersion: dataVersionSchema,
  ...publicationContextShape,
  availability: z.enum(['available', 'pending', 'not_applicable', 'unknown']),
  collectedAt: utcTimestampSchema,
  sourceTime: utcTimestampSchema.exactOptional(),
}

export const publishEnvelopeSchema = z
  .strictObject({ ...envelopeShape, source: z.strictObject(sourceShape) })
  .superRefine(checkContextRules)

export const readEnvelopeSchema = z
  .object({ ...envelopeShape, source: z.object(sourceShape) })
  .superRefine(checkContextRules)

export type SnapshotEnvelope = z.infer<typeof publishEnvelopeSchema>
