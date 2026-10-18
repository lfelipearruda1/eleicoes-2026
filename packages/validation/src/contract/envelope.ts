import { z } from 'zod'

// Contrato: docs/dados/contrato.md, seção "Envelope comum de snapshot".

const FEDERATIVE_UNITS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

// UUID v4 canônico, só minúsculas. z.uuid() aceita maiúsculas, o contrato não.
const UUID_V4_LOWERCASE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// z.iso.datetime() sem opções já exige UTC com Z, segundos e fração opcional.
const utcTimestampSchema = z.iso.datetime()

export const dataVersionSchema = z.string().regex(UUID_V4_LOWERCASE)

const sourceFileSchema = z
  .string()
  .min(1)
  .refine((value) => !value.includes('://'), 'sem esquema nem host')
  .refine((value) => !value.includes('?'), 'sem query string')

const sourceShape = { file: sourceFileSchema }

const envelopeShape = {
  contractVersion: z.literal(1),
  dataVersion: dataVersionSchema,
  environment: z.enum(['local', 'staging', 'production']),
  sourceEnvironment: z.enum(['official', 'simulated']),
  round: z.literal([1, 2]),
  office: z.enum(['president', 'governor']),
  scope: z.enum(['BR', ...FEDERATIVE_UNITS]),
  availability: z.enum(['available', 'pending', 'not_applicable', 'unknown']),
  collectedAt: utcTimestampSchema,
  sourceTime: utcTimestampSchema.exactOptional(),
}

type EnvelopeFields = z.infer<z.ZodObject<typeof envelopeShape>>

function checkCrossFieldRules(
  envelope: EnvelopeFields,
  ctx: z.RefinementCtx,
): void {
  if (
    envelope.environment === 'production' &&
    envelope.sourceEnvironment !== 'official'
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['sourceEnvironment'],
      message: 'produção só publica dado do ambiente oficial (DA-13)',
    })
  }
  if (envelope.office === 'governor' && envelope.scope === 'BR') {
    ctx.addIssue({
      code: 'custom',
      path: ['scope'],
      message: 'governador não tem abrangência Brasil',
    })
  }
}

// Publicação: o que nós produzimos não carrega chave fora do contrato.
export const publishEnvelopeSchema = z
  .strictObject({ ...envelopeShape, source: z.strictObject(sourceShape) })
  .superRefine(checkCrossFieldRules)

// Leitura: chave desconhecida (campo opcional de versão compatível) é descartada.
export const readEnvelopeSchema = z
  .object({ ...envelopeShape, source: z.object(sourceShape) })
  .superRefine(checkCrossFieldRules)

export type SnapshotEnvelope = z.infer<typeof publishEnvelopeSchema>
