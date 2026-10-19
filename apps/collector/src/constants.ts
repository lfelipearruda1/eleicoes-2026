export const MAX_DOCUMENT_BYTES = 1024 * 1024
export const MANIFEST_FILE = 'manifest.json'
export const SNAPSHOTS_DIR = 'snapshots'
export const LOCK_FILE = '.publish.lock'
export const TEMP_FILE_PREFIX = '.tmp-'

export const DEMO_CHANNEL = 'demo-local-presidente-br-2t'
export const DEMO_NOTICE =
  'Demonstração local do protocolo de publicação. Sem resultados eleitorais.'

export const EXIT_CODE = { success: 0, failure: 1, usage: 2 } as const

export const HELP = `Uso: collector <comando> [opções]

  publish  --out <pasta> --channel <canal> --input <arquivo.json>
  inspect  --out <pasta> --channel <canal>
  demo     [--out <pasta>]`

export const USAGE_ERRORS = [
  'MISSING_OPTIONS',
  'UNKNOWN_COMMAND',
  'INVALID_ARGUMENTS',
]

export const ERROR_MESSAGES = {
  MISSING_OPTIONS: (options: string) =>
    `faltam as opções ${options}. Use --help`,
  UNKNOWN_COMMAND: (name: string) =>
    `o comando "${name}" não existe. Use --help`,
  INVALID_ARGUMENTS: (detail: string) => `${detail}. Use --help`,
  INVALID_CHANNEL: (channel: string) =>
    `canal "${channel}" inválido: use minúsculas, dígitos e hífens, até 64 caracteres`,
  INVALID_JSON: (path: string) => `${path} não contém JSON válido`,
  INVALID_DOCUMENT: (fields: string) =>
    `documento fora do contrato de publicação nos campos: ${fields}`,
  DOCUMENT_TOO_LARGE: (path: string) =>
    `${path} passa do limite de ${MAX_DOCUMENT_BYTES} bytes`,
  UNSUPPORTED_ENVIRONMENT: (environment: string) =>
    `o publicador local só aceita environment "local", recebeu "${environment}"`,
  SYMBOLIC_LINK: (path: string) =>
    `${path} é link simbólico ou não é um diretório/arquivo comum`,
  CHANNEL_LOCKED: (lockPath: string) =>
    `outra publicação está em andamento. Se nenhuma estiver, apague ${lockPath} depois de conferir o canal`,
  NOT_FOUND: (path: string) => `${path} não existe`,
  CORRUPTED_FILE: (path: string) =>
    `${path} está corrompido ou fora do contrato; o canal não é reiniciado automaticamente`,
  FOREIGN_MANIFEST: (path: string) => `${path} pertence a outro canal`,
  MANIFEST_MISSING: (channelDirectory: string) =>
    `${channelDirectory} tem snapshots mas não tem manifesto; o canal não é reiniciado automaticamente`,
  SNAPSHOT_MISMATCH: (fields: string) =>
    `o snapshot não corresponde ao manifesto nos campos: ${fields}`,
  CHANNEL_MISMATCH: (fields: string) =>
    `o documento não pertence a este canal; difere em: ${fields}`,
  VERSION_CONFLICT: (dataVersion: string) =>
    `dataVersion ${dataVersion} já foi publicado com outro conteúdo`,
  VERSION_NOT_CURRENT: (dataVersion: string) =>
    `dataVersion ${dataVersion} já existe e não é o atual; republique com um dataVersion novo`,
  REVISION_LIMIT: (revision: string) =>
    `revisão ${revision} chegou ao limite de inteiro seguro; use um canal novo`,
} as const
