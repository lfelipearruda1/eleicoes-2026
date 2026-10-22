export const MAX_DOCUMENT_BYTES = 1024 * 1024
export const MANIFEST_FILE = 'manifest.json'
export const SNAPSHOTS_DIR = 'snapshots'
export const LOCK_FILE = '.publish.lock'
export const TEMP_FILE_PREFIX = '.tmp-'

export const DEMO_CHANNEL_PREFIX = 'demo-'
export const DEMO_CHANNEL = 'demo-sintetico-presidente-br-2t'
export const DEMO_NOTICE =
  'Demonstração com capturas sintéticas. Não é resultado eleitoral de 2026.'

export const EXIT_CODE = { success: 0, failure: 1, usage: 2 } as const

export const HELP = `Uso: collector <comando> [opções]

  publish     --out <pasta> --channel <canal> --input <arquivo.json>
  inspect     --out <pasta> --channel <canal>
  president-publish  --capture <pasta da captura> --output <pasta> --channel <canal>
  president-demo     [--output <pasta>]
  tse-once    --source official --round <1|2> --output <pasta> [--election <código>]
              [--office president|governor] [--scope br|<uf>]
  tse-watch   --source official --round <1|2> --output <pasta> --publications <pasta>
              [--channel-prefix <oficial|simulado>] [--interval-ms 30000] [--once]
  summary-publish --publications <pasta> --prefix <prefixo> --round <1|2>
  tse-replay  --input <arquivo EA20> --output <pasta>`

export const TSE_SOURCES = {
  official: {
    confirmed: true,
    host: 'resultados.tse.jus.br',
    environment: 'oficial',
    channelPrefix: 'oficial',
  },
  simulated: {
    confirmed: false,
    host: 'resultados-sim.tse.jus.br',
    environment: 'simulado2026',
    channelPrefix: 'simulado',
  },
} as const

export const TSE_CONFIG_PATH = '/{environment}/comum/config/ele-c.json'
export const TSE_RESULT_DIRECTORY_TEMPLATE =
  '<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>'
export const TSE_RESULT_FILE_TYPE = 'u'
export const TSE_PHOTO_DIRECTORY_TEMPLATE =
  '<base>/<ambiente>/<ciclo>/<cd_eleicao>/fotos/<uf>'
export const TSE_PHOTO_FILE_TYPE = 'ft'
export const TSE_MAX_PHOTO_BYTES = 512 * 1024
export const TSE_PHOTO_RETRY_MS = 10 * 60_000
export const TSE_OFFICE_CODES = { president: '1', governor: '3' } as const
export const TSE_NATIONAL_SCOPE = 'br'

export const TSE_WATCH_DEFAULTS = {
  intervalMs: 30_000,
  blockPauseMs: 11 * 60_000,
  checkedAtMinIntervalMs: 60_000,
} as const

export const TSE_REQUEST_TIMEOUT_MS = 15_000
export const TSE_MAX_RESPONSE_BYTES = 5 * 1024 * 1024
export const TSE_MIN_REQUEST_INTERVAL_MS = 1_000

export const TSE_CAPTURE_FILES = {
  config: 'config.json',
  result: 'result.json',
  rejected: 'result.rejected.json',
  metadata: 'metadata.json',
  summary: 'summary.json',
  lastValid: 'last-valid.json',
} as const

export const USAGE_ERRORS = [
  'MISSING_OPTIONS',
  'UNKNOWN_COMMAND',
  'INVALID_ARGUMENTS',
  'INVALID_ROUND',
  'UNKNOWN_SOURCE',
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
  INVALID_ROUND: (round: string) => `turno "${round}" inválido: use 1 ou 2`,
  UNKNOWN_SOURCE: (source: string) =>
    `origem "${source}" desconhecida: use official ou simulated`,
  SOURCE_NOT_CONFIRMED: (source: string) =>
    `a origem ${source} não tem endereço confirmado para esta execução`,
  URL_NOT_ALLOWED: (url: string) =>
    `${url} não é permitido: só HTTPS, host da origem, sem porta nem credenciais`,
  REMOTE_REDIRECT: (location: string) =>
    `a origem respondeu com redirecionamento para ${location}; não foi seguido. Confirme o destino antes de mudar a configuração`,
  REMOTE_BLOCKED: (detail: string) =>
    `a origem recusou o acesso (${detail}); as consultas a esse host foram encerradas`,
  REMOTE_NOT_FOUND: (url: string) =>
    `${url} não existe na origem (404); revise a URL antes de tentar de novo`,
  REMOTE_HTTP_ERROR: (detail: string) => `a origem respondeu ${detail}`,
  REMOTE_TIMEOUT: (url: string) =>
    `${url} não terminou de responder em ${TSE_REQUEST_TIMEOUT_MS} ms`,
  REMOTE_TRANSPORT: (url: string) => `falha de rede ao consultar ${url}`,
  RESPONSE_TOO_LARGE: (url: string) =>
    `${url} passou de ${TSE_MAX_RESPONSE_BYTES} bytes; leitura cancelada e limite mantido`,
  RESPONSE_NOT_JSON: (url: string) =>
    `${url} não devolveu JSON (HTML ou conteúdo malformado)`,
  NOT_MODIFIED_WITHOUT_COPY: (url: string) =>
    `${url} respondeu 304, mas não há cópia válida local; nenhum resultado foi produzido`,
  INVALID_TSE_CONFIG: (fields: string) =>
    `a configuração de eleições (EA11) não tem o formato esperado nos campos: ${fields}`,
  TSE_LAYOUT_CHANGED: (detail: string) =>
    `o diretório de resultados da configuração mudou (${detail}); confirme a nova nomenclatura`,
  ELECTION_NOT_FOUND: (detail: string) =>
    `a configuração não lista eleição para ${detail}`,
  ELECTION_AMBIGUOUS: (options: string) =>
    `mais de uma eleição corresponde; escolha com --election: ${options}`,
  INVALID_TSE_RESULT: (fields: string) =>
    `o resultado (EA20) não tem o formato esperado nos campos: ${fields}`,
  TSE_RESULT_MISMATCH: (detail: string) =>
    `o resultado recebido não corresponde ao solicitado: ${detail}`,
  INVALID_CAPTURE: (detail: string) =>
    `captura sem proveniência suficiente: ${detail}`,
  TSE_RESULT_CONTRADICTION: (detail: string) =>
    `indicadores do resultado (EA20) contraditórios: ${detail}; entrada não publicada`,
  CHANNEL_SOURCE_MISMATCH: (detail: string) =>
    `canal incompatível com a origem: ${detail}`,
  REVISION_LIMIT: (revision: string) =>
    `revisão ${revision} chegou ao limite de inteiro seguro; use um canal novo`,
} as const
