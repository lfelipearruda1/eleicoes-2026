import type { ResultSnapshot } from '@eleicoes/validation'

export const DEV_BRIDGE_PATH = '/publications/'
export const DEV_NATIONAL_CHANNEL = 'demo-sintetico-presidente-br-2t'
export const LOCAL_STALE_AFTER_MS = 120_000

const NATIONAL_CHANNEL = /^([a-z0-9]+(?:-[a-z0-9]+)*)-presidente-br-([12])t$/
const CHANNEL_OFFICE = { president: 'presidente', governor: 'governador' }

export interface ResultsEnv {
  DEV: boolean
  VITE_RESULTS_BASE_URL?: string
  VITE_RESULTS_CHANNEL?: string
  VITE_RESULTS_STALE_AFTER_MS?: string
  VITE_RESULTS_LOOPBACK_HOSTS?: string
  VITE_RESULTS_BLOCKED_DOMAINS?: string
}

export interface ResultsEndpoint {
  root: URL
  channelPrefix: string
  round: string
}

export interface ChannelSource {
  channelRoot: URL
  channel: string
  office: ResultSnapshot['office']
  scope: string
}

export type ResultsConfig =
  | { status: 'ready'; endpoint: ResultsEndpoint; staleAfterMs: number }
  | { status: 'invalid'; problems: string[] }

const POSITIVE_INTEGER = /^[1-9][0-9]*$/

const present = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const isHostname = (entry: string) =>
  URL.canParse(`http://${entry}`) &&
  new URL(`http://${entry}`).hostname === entry.toLowerCase()

function readHostList(
  name: string,
  raw: string | undefined,
): Set<string> | string {
  const entries = (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (!entries.every(isHostname)) {
    return `${name} precisa ser uma lista de hosts separados por vírgula.`
  }
  return new Set(entries.map((entry) => entry.toLowerCase()))
}

const isInDomain = (hostname: string, domains: Set<string>) =>
  [...domains].some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  )

interface HostRules {
  loopbackHosts: Set<string>
  blockedDomains: Set<string>
}

function readHostRules(env: ResultsEnv): HostRules | string[] {
  const loopbackHosts = readHostList(
    'VITE_RESULTS_LOOPBACK_HOSTS',
    env.VITE_RESULTS_LOOPBACK_HOSTS,
  )
  const blockedDomains = present(env.VITE_RESULTS_BLOCKED_DOMAINS)
    ? readHostList(
        'VITE_RESULTS_BLOCKED_DOMAINS',
        env.VITE_RESULTS_BLOCKED_DOMAINS,
      )
    : 'VITE_RESULTS_BLOCKED_DOMAINS precisa listar os domínios que a base não pode usar.'
  if (typeof loopbackHosts === 'string' || typeof blockedDomains === 'string') {
    return [loopbackHosts, blockedDomains].filter(
      (rule): rule is string => typeof rule === 'string',
    )
  }
  return { loopbackHosts, blockedDomains }
}

function readBase(raw: string, page: URL, rules: HostRules): URL | string {
  if (!URL.canParse(raw)) {
    return 'VITE_RESULTS_BASE_URL precisa ser um endereço absoluto.'
  }
  const base = new URL(raw)
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    return 'VITE_RESULTS_BASE_URL precisa usar https.'
  }
  if (base.username || base.password) {
    return 'VITE_RESULTS_BASE_URL não pode conter usuário ou senha.'
  }
  if (raw.includes('?') || raw.includes('#')) {
    return 'VITE_RESULTS_BASE_URL não pode conter query string nem fragmento.'
  }
  if (isInDomain(base.hostname, rules.blockedDomains)) {
    return 'VITE_RESULTS_BASE_URL aponta para um domínio bloqueado em VITE_RESULTS_BLOCKED_DOMAINS.'
  }
  const isLoopbackDemo =
    rules.loopbackHosts.has(base.hostname) &&
    rules.loopbackHosts.has(page.hostname)
  if (base.protocol === 'http:' && !isLoopbackDemo) {
    return 'VITE_RESULTS_BASE_URL precisa usar https; http só vale com a página e os dados em loopback.'
  }
  if (!base.pathname.endsWith('/')) base.pathname = `${base.pathname}/`
  return base
}

function readNationalChannel(raw: string | undefined) {
  const match = raw === undefined ? null : NATIONAL_CHANNEL.exec(raw)
  if (!match || raw === undefined || raw.length > 64) {
    return 'VITE_RESULTS_CHANNEL precisa ser o canal nacional de presidente, no formato <prefixo>-presidente-br-<turno>t.'
  }
  return { channelPrefix: match[1], round: match[2] }
}

function readEndpoint(env: ResultsEnv, page: URL): ResultsEndpoint | string[] {
  const rawBase = present(env.VITE_RESULTS_BASE_URL)
  const rawChannel = present(env.VITE_RESULTS_CHANNEL)
  if (!rawBase && !env.DEV) {
    return ['VITE_RESULTS_BASE_URL não foi definida neste build.']
  }
  const channel = readNationalChannel(
    rawChannel ?? (rawBase ? undefined : DEV_NATIONAL_CHANNEL),
  )
  if (!rawBase) {
    return typeof channel === 'string'
      ? [channel]
      : { root: new URL(DEV_BRIDGE_PATH, page.origin), ...channel }
  }
  const rules = readHostRules(env)
  if (Array.isArray(rules)) return rules
  const base = readBase(rawBase, page, rules)
  const problems = [base, channel].filter(
    (item): item is string => typeof item === 'string',
  )
  if (typeof base === 'string' || typeof channel === 'string') return problems
  return { root: base, ...channel }
}

export function channelSource(
  endpoint: ResultsEndpoint,
  office: ChannelSource['office'],
  scope: string,
): ChannelSource {
  const channel = `${endpoint.channelPrefix}-${CHANNEL_OFFICE[office]}-${scope.toLowerCase()}-${endpoint.round}t`
  return {
    channelRoot: new URL(`${channel}/`, endpoint.root),
    channel,
    office,
    scope,
  }
}

function readStaleAfter(env: ResultsEnv): number | string {
  const raw = present(env.VITE_RESULTS_STALE_AFTER_MS)
  if (!raw) {
    return env.DEV
      ? LOCAL_STALE_AFTER_MS
      : 'VITE_RESULTS_STALE_AFTER_MS não foi definida neste build.'
  }
  const value = Number(raw)
  if (!POSITIVE_INTEGER.test(raw) || !Number.isSafeInteger(value)) {
    return 'VITE_RESULTS_STALE_AFTER_MS precisa ser um inteiro positivo de milissegundos.'
  }
  return value
}

export function readResultsConfig(
  env: ResultsEnv,
  pageUrl: string,
): ResultsConfig {
  const endpoint = readEndpoint(env, new URL(pageUrl))
  const staleAfterMs = readStaleAfter(env)
  const problems = [
    ...(Array.isArray(endpoint) ? endpoint : []),
    ...(typeof staleAfterMs === 'string' ? [staleAfterMs] : []),
  ]
  if (Array.isArray(endpoint) || typeof staleAfterMs === 'string') {
    return { status: 'invalid', problems }
  }
  return { status: 'ready', endpoint, staleAfterMs }
}

export function resolveInChannel(
  source: ChannelSource,
  relativePath: string,
): URL | undefined {
  const root = source.channelRoot
  const url = new URL(relativePath, root)
  const staysInChannel =
    url.origin === root.origin &&
    url.pathname.startsWith(root.pathname) &&
    url.pathname.length > root.pathname.length &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  return staysInChannel ? url : undefined
}
