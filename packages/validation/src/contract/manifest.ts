import { z } from 'zod'

import {
  CHANNEL_MAX_LENGTH,
  CHANNEL_PATTERN,
  RULE_MESSAGES,
  SNAPSHOT_PATH_PATTERN,
} from './constants.js'
import {
  checkContextRules,
  dataVersionSchema,
  PUBLICATION_CONTEXT_FIELDS,
  publicationContextShape,
  utcTimestampSchema,
  type SnapshotEnvelope,
} from './envelope.js'

export const channelSchema = z
  .string()
  .max(CHANNEL_MAX_LENGTH)
  .regex(CHANNEL_PATTERN)

export const snapshotPathFor = (dataVersion: string) =>
  `snapshots/${dataVersion}.json`

const currentShape = {
  dataVersion: dataVersionSchema,
  path: z.string().regex(SNAPSHOT_PATH_PATTERN),
  publishedAt: utcTimestampSchema,
}

const manifestShape = {
  contractVersion: z.literal(1),
  channel: channelSchema,
  revision: z.int().positive(),
  ...publicationContextShape,
  checkedAt: utcTimestampSchema.exactOptional(),
}

type ManifestFields = z.infer<z.ZodObject<typeof manifestShape>> & {
  current: z.infer<z.ZodObject<typeof currentShape>>
}

function checkManifestRules(
  manifest: ManifestFields,
  ctx: z.RefinementCtx,
): void {
  checkContextRules(manifest, ctx)
  if (manifest.current.path !== snapshotPathFor(manifest.current.dataVersion)) {
    ctx.addIssue({
      code: 'custom',
      path: ['current', 'path'],
      message: RULE_MESSAGES.snapshotPathMismatch,
    })
  }
}

export const publishManifestSchema = z
  .strictObject({ ...manifestShape, current: z.strictObject(currentShape) })
  .superRefine(checkManifestRules)

export const readManifestSchema = z
  .object({ ...manifestShape, current: z.object(currentShape) })
  .superRefine(checkManifestRules)

export type Manifest = z.infer<typeof publishManifestSchema>

export function findSnapshotMismatches(
  manifest: Manifest,
  snapshot: SnapshotEnvelope,
): string[] {
  const mismatches: string[] = PUBLICATION_CONTEXT_FIELDS.filter(
    (field) => manifest[field] !== snapshot[field],
  )
  if (manifest.current.dataVersion !== snapshot.dataVersion) {
    mismatches.unshift('dataVersion')
  }
  return mismatches
}

export type ManifestUpdateDecision =
  'newer' | 'same' | 'stale' | 'conflict' | 'incomparable'

export function decideManifestUpdate(
  accepted: Manifest | undefined,
  received: Manifest,
): ManifestUpdateDecision {
  if (accepted === undefined) {
    return 'newer'
  }
  const isSameSequence =
    accepted.channel === received.channel &&
    PUBLICATION_CONTEXT_FIELDS.every(
      (field) => accepted[field] === received[field],
    )
  if (!isSameSequence) {
    return 'incomparable'
  }
  if (received.revision !== accepted.revision) {
    return received.revision > accepted.revision ? 'newer' : 'stale'
  }
  return JSON.stringify(received) === JSON.stringify(accepted)
    ? 'same'
    : 'conflict'
}
