export const BRAZILIAN_STATE_CODES = [
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

export const CANONICAL_UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export const CHANNEL_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CHANNEL_MAX_LENGTH = 64

export const SNAPSHOT_PATH_PATTERN = /^snapshots\/[0-9a-f-]{36}\.json$/

export const RULE_MESSAGES = {
  sourceFileWithHost: 'source.file não pode ter esquema nem host',
  sourceFileWithQuery: 'source.file não pode ter query string',
  productionWithoutOfficialSource:
    'produção só publica dado do ambiente oficial (DA-13)',
  governorWithNationalScope: 'governador não tem abrangência Brasil',
  snapshotPathMismatch: 'current.path precisa ser snapshots/<dataVersion>.json',
  availableWithoutRelease: 'available exige votação liberada pela origem',
  availableNotStarted: 'available exige totalização iniciada',
  pendingReasonMismatch: 'pendingReason não corresponde aos indicadores',
  sectionsOverTotal: 'seções totalizadas passam do total',
  duplicateCandidate: 'candidatura repetida',
  duplicateScope: 'UF repetida no resumo',
} as const
