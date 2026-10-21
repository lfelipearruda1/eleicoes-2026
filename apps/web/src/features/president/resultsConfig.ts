import { channelSchema } from '@eleicoes/validation'

export const DEV_BRIDGE_PATH = '/publications/'
export const LOCAL_STALE_AFTER_MS = 120_000

export interface ResultsEnv {
  DEV: boolean
  VITE_RESULTS_BASE_URL?: string
  VITE_RESULTS_CHANNEL?: string
  VITE_RESULTS_STALE_AFTER_MS?: string
  VITE_RESULTS_LOOPBACK_HOSTS?: string
  VITE_RESULTS_BLOCKED_DOMAINS?: string
}

export interface ResultsEndpoint {
  channelRoot: URL
  channel: string | undefined
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

function readEndpoint(env: ResultsEnv, page: URL): ResultsEndpoint | string[] {
  const rawBase = present(env.VITE_RESULTS_BASE_URL)
  if (!rawBase) {
    return env.DEV
      ? {
          channelRoot: new URL(DEV_BRIDGE_PATH, page.origin),
          channel: undefined,
        }
      : ['VITE_RESULTS_BASE_URL não foi definida neste build.']
  }
  const rules = readHostRules(env)
  if (Array.isArray(rules)) return rules
  const problems: string[] = []
  const base = readBase(rawBase, page, rules)
  if (typeof base === 'string') problems.push(base)
  const channel = channelSchema.safeParse(present(env.VITE_RESULTS_CHANNEL))
  if (!channel.success) {
    problems.push(
      'VITE_RESULTS_CHANNEL precisa ser um canal válido (minúsculas, dígitos e hífens).',
    )
  }
  if (typeof base === 'string' || !channel.success) return problems
  return {
    channelRoot: new URL(`${channel.data}/`, base),
    channel: channel.data,
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
  endpoint: ResultsEndpoint,
  relativePath: string,
): URL | undefined {
  const root = endpoint.channelRoot
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
