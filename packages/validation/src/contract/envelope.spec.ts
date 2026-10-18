import { describe, expect, it } from 'vitest'
import {
  dataVersionSchema,
  publishEnvelopeSchema,
  readEnvelopeSchema,
} from '../index.js'

// Dados sintéticos: não representam apuração, arquivo nem caminho reais do TSE.
const SYNTHETIC_DATA_VERSION = '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d'

function syntheticEnvelope(): Record<string, unknown> {
  return {
    contractVersion: 1,
    dataVersion: SYNTHETIC_DATA_VERSION,
    environment: 'local',
    sourceEnvironment: 'simulated',
    round: 2,
    office: 'president',
    scope: 'BR',
    availability: 'available',
    collectedAt: '2026-10-25T21:04:19Z',
    source: { file: 'sintetico/exemplo.json' },
  }
}

function issuePaths(input: unknown): string[] {
  const result = publishEnvelopeSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues.map((issue) => issue.path.join('.'))
}

describe('dataVersionSchema', () => {
  it('deve aceitar UUID v4 canônico em minúsculas', () => {
    // Arrange
    const input = SYNTHETIC_DATA_VERSION

    // Act
    const result = dataVersionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it.each([
    { label: 'UUID v1', input: '6fa459ea-ee8a-11ca-9a0c-0305e82c3301' },
    { label: 'UUID v7', input: '01890a5d-ac96-7740-9c4b-6e8f1a2b3c4d' },
    {
      label: 'variante fora de 8–b',
      input: '0b7c9a52-3f1e-4d2a-7c4b-6e8f1a2b3c4d',
    },
    {
      label: 'letras maiúsculas',
      input: '0B7C9A52-3F1E-4D2A-9C4B-6E8F1A2B3C4D',
    },
    {
      label: 'uma maiúscula no início',
      input: '0B7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d',
    },
    {
      label: 'uma maiúscula no fim',
      input: '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4D',
    },
    { label: 'espaço ao redor', input: ` ${SYNTHETIC_DATA_VERSION} ` },
    { label: 'sem hífens', input: '0b7c9a523f1e4d2a9c4b6e8f1a2b3c4d' },
    { label: 'entre chaves', input: `{${SYNTHETIC_DATA_VERSION}}` },
    { label: 'texto vazio', input: '' },
    { label: 'número', input: 4 },
  ])('deve recusar $label', ({ input }) => {
    // Act
    const result = dataVersionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe('publishEnvelopeSchema', () => {
  it('deve aceitar o envelope mínimo sem sourceTime e devolver os mesmos valores', () => {
    // Arrange
    const input = syntheticEnvelope()

    // Act
    const result = publishEnvelopeSchema.parse(input)

    // Assert
    expect(result).toEqual(input)
    expect('sourceTime' in result).toBe(false)
  })

  it('deve aceitar sourceTime presente em UTC', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), sourceTime: '2026-10-25T21:03:00Z' }

    // Act
    const result = publishEnvelopeSchema.parse(input)

    // Assert
    expect(result.sourceTime).toBe('2026-10-25T21:03:00Z')
  })

  it.each([
    'contractVersion',
    'dataVersion',
    'environment',
    'sourceEnvironment',
    'round',
    'office',
    'scope',
    'availability',
    'collectedAt',
    'source',
  ])('deve recusar o envelope sem %s, apontando o campo', (field) => {
    // Arrange
    const input = syntheticEnvelope()
    delete input[field]

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual([field])
  })

  it('deve recusar source sem file, apontando o campo aninhado', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), source: {} }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual(['source.file'])
  })

  it.each([
    'contractVersion',
    'dataVersion',
    'environment',
    'sourceEnvironment',
    'round',
    'office',
    'scope',
    'availability',
    'collectedAt',
    'sourceTime',
    'source',
  ])('deve recusar null em %s', (field) => {
    // Arrange
    const input = { ...syntheticEnvelope(), [field]: null }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual([field])
  })

  it('deve recusar sourceTime com chave presente e valor undefined', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), sourceTime: undefined }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual(['sourceTime'])
  })

  it.each([
    { label: 'texto "1"', value: '1' },
    { label: 'zero', value: 0 },
    { label: 'versão 2, não suportada', value: 2 },
    { label: 'fração', value: 1.5 },
  ])('deve recusar contractVersion $label', ({ value }) => {
    // Arrange
    const input = { ...syntheticEnvelope(), contractVersion: value }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual(['contractVersion'])
  })

  it.each([1, 2])('deve aceitar round %s', (round) => {
    // Arrange
    const input = { ...syntheticEnvelope(), round }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it.each([
    { label: 'texto "2"', value: '2' },
    { label: 'zero', value: 0 },
    { label: 'três', value: 3 },
    { label: 'fração', value: 2.5 },
  ])('deve recusar round $label sem conversão', ({ value }) => {
    // Arrange
    const input = { ...syntheticEnvelope(), round: value }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual(['round'])
  })

  it.each([
    { field: 'environment', value: 'local' },
    { field: 'environment', value: 'staging' },
    { field: 'sourceEnvironment', value: 'official' },
    { field: 'sourceEnvironment', value: 'simulated' },
    { field: 'office', value: 'president' },
    { field: 'availability', value: 'available' },
    { field: 'availability', value: 'pending' },
    { field: 'availability', value: 'not_applicable' },
    { field: 'availability', value: 'unknown' },
  ])('deve aceitar $field = $value', ({ field, value }) => {
    // Arrange
    const input = { ...syntheticEnvelope(), [field]: value }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it.each([
    { field: 'environment', value: 'Local' },
    { field: 'environment', value: 'homologacao' },
    { field: 'sourceEnvironment', value: 'oficial' },
    { field: 'office', value: 'senator' },
    { field: 'availability', value: 'closed' },
    { field: 'availability', value: 'AVAILABLE' },
    { field: 'availability', value: '' },
  ])('deve recusar $field = "$value"', ({ field, value }) => {
    // Arrange
    const input = { ...syntheticEnvelope(), [field]: value }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual([field])
  })

  it.each(['BR', 'DF', 'SP', 'AC', 'TO'])('deve aceitar scope %s', (scope) => {
    // Arrange
    const input = { ...syntheticEnvelope(), scope }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it.each(['sp', 'br', 'Df', 'XX', 'ZZ', ''])(
    'deve recusar scope "%s"',
    (scope) => {
      // Arrange
      const input = { ...syntheticEnvelope(), scope }

      // Act
      const paths = issuePaths(input)

      // Assert
      expect(paths).toEqual(['scope'])
    },
  )

  it('deve aceitar governor com abrangência de UF', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), office: 'governor', scope: 'DF' }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('deve recusar governor com abrangência BR', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), office: 'governor', scope: 'BR' }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual(['scope'])
  })

  it('deve aceitar production com dado official', () => {
    // Arrange
    const input = {
      ...syntheticEnvelope(),
      environment: 'production',
      sourceEnvironment: 'official',
    }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('deve recusar production com dado simulated', () => {
    // Arrange
    const input = {
      ...syntheticEnvelope(),
      environment: 'production',
      sourceEnvironment: 'simulated',
    }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual(['sourceEnvironment'])
  })

  it.each([
    { label: 'deslocamento -03:00', value: '2026-10-25T18:04:19-03:00' },
    { label: 'sem fuso', value: '2026-10-25T21:04:19' },
    { label: 'só data', value: '2026-10-25' },
    { label: 'sem segundos', value: '2026-10-25T21:04Z' },
    { label: 'data impossível', value: '2026-02-30T10:00:00Z' },
    { label: 'número de época', value: 1793048659000 },
  ])(
    'deve recusar horário com $label em collectedAt e sourceTime',
    ({ value }) => {
      // Arrange
      const withBadCollectedAt = { ...syntheticEnvelope(), collectedAt: value }
      const withBadSourceTime = { ...syntheticEnvelope(), sourceTime: value }

      // Act
      const collectedAtPaths = issuePaths(withBadCollectedAt)
      const sourceTimePaths = issuePaths(withBadSourceTime)

      // Assert
      expect(collectedAtPaths).toEqual(['collectedAt'])
      expect(sourceTimePaths).toEqual(['sourceTime'])
    },
  )

  it('deve aceitar horário com fração de segundo', () => {
    // Arrange
    const input = {
      ...syntheticEnvelope(),
      collectedAt: '2026-10-25T21:04:19.512Z',
    }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('deve aceitar collectedAt anterior a sourceTime, sem impor ordem', () => {
    // Arrange
    const input = {
      ...syntheticEnvelope(),
      collectedAt: '2026-10-25T21:00:00Z',
      sourceTime: '2026-10-25T21:30:00Z',
    }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it.each([
    { label: 'vazio', value: '' },
    {
      label: 'com esquema e host',
      value: 'https://exemplo.invalid/sintetico.json',
    },
    { label: 'com query string', value: 'sintetico/exemplo.json?v=1' },
  ])('deve recusar source.file $label', ({ value }) => {
    // Arrange
    const input = { ...syntheticEnvelope(), source: { file: value } }

    // Act
    const paths = issuePaths(input)

    // Assert
    expect(paths).toEqual(['source.file'])
  })

  it('deve recusar chave desconhecida no topo do envelope', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), winner: 'sintetico' }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys')
  })

  it('deve recusar chave desconhecida em source, inclusive generationId ainda provisório', () => {
    // Arrange
    const input = {
      ...syntheticEnvelope(),
      source: { file: 'sintetico/exemplo.json', generationId: 'sintetico' },
    }

    // Act
    const result = publishEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['source'])
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys')
  })
})

describe('readEnvelopeSchema', () => {
  it('deve descartar chaves desconhecidas no topo e em source sem alterar a entrada', () => {
    // Arrange
    const input = {
      ...syntheticEnvelope(),
      winner: 'sintetico',
      source: { file: 'sintetico/exemplo.json', generationId: 'sintetico' },
    }
    const snapshotOfInput = JSON.parse(JSON.stringify(input))

    // Act
    const result = readEnvelopeSchema.parse(input)

    // Assert
    expect(result).toEqual(syntheticEnvelope())
    expect('winner' in result).toBe(false)
    expect('generationId' in result.source).toBe(false)
    expect(input).toEqual(snapshotOfInput)
  })

  it('deve recusar valor desconhecido de enum conhecido', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), availability: 'closed' }

    // Act
    const result = readEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['availability'])
  })

  it('deve recusar contractVersion não suportado mesmo com os demais campos válidos', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), contractVersion: 2 }

    // Act
    const result = readEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['contractVersion'])
  })

  it('deve recusar campo obrigatório aninhado ausente', () => {
    // Arrange
    const input = {
      ...syntheticEnvelope(),
      source: { generationId: 'sintetico' },
    }

    // Act
    const result = readEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['source', 'file'])
  })

  it('deve aplicar as regras cruzadas também na leitura', () => {
    // Arrange
    const input = { ...syntheticEnvelope(), office: 'governor', scope: 'BR' }

    // Act
    const result = readEnvelopeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['scope'])
  })
})
