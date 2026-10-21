import { setTimeout as sleep } from 'node:timers/promises'

import { BRAZILIAN_STATE_CODES } from '@eleicoes/validation'

import {
  DEMO_CHANNEL_PREFIX,
  TSE_NATIONAL_SCOPE,
  TSE_OFFICE_CODES,
  TSE_WATCH_DEFAULTS,
} from '../constants.js'
import { CollectorError } from '../error.js'
import { publishResultCapture } from '../president/publish.js'
import { channelFor } from './channels.js'
import { publishUfSummary } from './summary.js'
import type { parseElectionConfig, ResultTarget } from './ea11.js'
import type { Transport } from './http.js'
import {
  collectTarget,
  fetchElectionConfig,
  openTseSession,
  parseRound,
  parseSource,
  type TseSession,
} from './run.js'

type ElectionConfig = ReturnType<typeof parseElectionConfig>

export type WatchEvent = Record<string, unknown> & { event: string }

export interface WatchOptions {
  source: string
  round: string
  output: string
  publications: string
  channelPrefix?: string
  intervalMs?: number
  blockPauseMs?: number
  minIntervalMs?: number
  checkedAtMinIntervalMs?: number
  maxCycles?: number
  signal?: AbortSignal
  transport?: Transport
  now?: () => Date
  log?: (event: WatchEvent) => void
}

const targetKey = (target: ResultTarget) => `${target.office}-${target.scope}`

const isAbort = (error: unknown) => (error as Error)?.name === 'AbortError'

export function listTargets(
  config: ElectionConfig,
  round: number,
): ResultTarget[] {
  const scopesWith = (officeCode: string) =>
    config.pl.flatMap((pleito) =>
      pleito.e
        .filter((election) => election.t === String(round))
        .flatMap((election) =>
          election.abr
            .filter((scope) =>
              scope.cp.some((office) => office.cd === officeCode),
            )
            .map((scope) => scope.cd),
        ),
    )
  const hasPresident = scopesWith(TSE_OFFICE_CODES.president).includes(
    TSE_NATIONAL_SCOPE,
  )
  const states = BRAZILIAN_STATE_CODES.map((code) => code.toLowerCase())
  const governorScopes = new Set(scopesWith(TSE_OFFICE_CODES.governor))
  return [
    ...(hasPresident
      ? [TSE_NATIONAL_SCOPE, ...states].map((scope) => ({
          office: 'president' as const,
          scope,
        }))
      : []),
    ...states
      .filter((scope) => governorScopes.has(scope))
      .map((scope) => ({ office: 'governor' as const, scope })),
  ]
}

interface CycleContext {
  session: TseSession
  round: number
  prefix: string
  publications: string
  disabled: Set<string>
  options: WatchOptions
  log: (event: WatchEvent) => void
}

async function runCycle(context: CycleContext, cycle: number) {
  const { session, round, log } = context
  const { signal } = context.options
  const counts: Record<string, number> = {}
  const count = (status: string) => {
    counts[status] = (counts[status] ?? 0) + 1
  }
  const configCopy = await fetchElectionConfig(session).catch(
    (error: unknown) => {
      if (isAbort(error)) throw error
      log({ event: 'config_failed', cycle, code: codeOf(error) })
      return error instanceof CollectorError && error.code === 'REMOTE_BLOCKED'
        ? ('blocked' as const)
        : ('failed' as const)
    },
  )
  if (typeof configCopy === 'string') return { status: configCopy, counts }

  for (const target of listTargets(configCopy.config, round)) {
    if (signal?.aborted) break
    const key = targetKey(target)
    if (context.disabled.has(key)) {
      count('skipped')
      continue
    }
    try {
      const run = await collectTarget(session, configCopy, round, target)
      const published = await publishResultCapture({
        capture: run.runDirectory,
        output: context.publications,
        channel: channelFor(context.prefix, target, round),
        checkedAtMinIntervalMs: context.options.checkedAtMinIntervalMs,
      })
      count(published.status)
      log({
        event: 'target',
        cycle,
        target: key,
        status: published.status,
        origin: run.sampleOrigin,
        revision: published.revision,
      })
    } catch (error) {
      if (isAbort(error)) throw error
      const code = codeOf(error)
      count('failed')
      log({ event: 'target_failed', cycle, target: key, code })
      if (code === 'REMOTE_BLOCKED')
        return { status: 'blocked' as const, counts }
      if (code === 'REMOTE_NOT_FOUND') {
        context.disabled.add(key)
        log({ event: 'target_disabled', cycle, target: key })
      }
    }
  }
  await publishUfSummary({
    publications: context.publications,
    prefix: context.prefix,
    round,
  })
    .then((summary) => log({ event: 'summary', cycle, ...summary }))
    .catch((error: unknown) =>
      log({ event: 'summary_failed', cycle, code: codeOf(error) }),
    )
  return { status: 'completed' as const, counts }
}

const codeOf = (error: unknown) =>
  error instanceof CollectorError ? error.code : 'UNEXPECTED'

export async function watchTse(options: WatchOptions) {
  const source = parseSource(options.source)
  const round = parseRound(options.round)
  const prefix = options.channelPrefix ?? TSE_WATCH_DEFAULTS.channelPrefix
  if (prefix.startsWith(DEMO_CHANNEL_PREFIX)) {
    throw new CollectorError(
      'INVALID_ARGUMENTS',
      `a coleta oficial não publica em canal com o prefixo "${DEMO_CHANNEL_PREFIX}"`,
    )
  }
  channelFor(prefix, { office: 'president', scope: TSE_NATIONAL_SCOPE }, round)
  const intervalMs = options.intervalMs ?? TSE_WATCH_DEFAULTS.intervalMs
  const blockPauseMs = options.blockPauseMs ?? TSE_WATCH_DEFAULTS.blockPauseMs
  const log = options.log ?? (() => {})
  const session = await openTseSession({ ...options, source })
  const context: CycleContext = {
    session,
    round,
    prefix,
    publications: options.publications,
    disabled: new Set(),
    options: {
      ...options,
      checkedAtMinIntervalMs:
        options.checkedAtMinIntervalMs ??
        TSE_WATCH_DEFAULTS.checkedAtMinIntervalMs,
    },
    log,
  }
  const maxCycles = options.maxCycles ?? Number.POSITIVE_INFINITY
  let cycles = 0
  let stopped = false

  while (cycles < maxCycles && !options.signal?.aborted) {
    cycles += 1
    const startedAt = Date.now()
    log({ event: 'cycle_start', cycle: cycles })
    const report = await runCycle(context, cycles).catch((error: unknown) => {
      if (isAbort(error)) return undefined
      throw error
    })
    if (!report) {
      stopped = true
      break
    }
    log({
      event: 'cycle_end',
      cycle: cycles,
      status: report.status,
      durationMs: Date.now() - startedAt,
      ...report.counts,
    })
    if (cycles >= maxCycles) break
    const waitMs = report.status === 'blocked' ? blockPauseMs : intervalMs
    log({ event: 'wait', cycle: cycles, waitMs, reason: report.status })
    stopped = await sleep(waitMs, false, { signal: options.signal }).catch(
      () => true,
    )
    if (stopped) break
  }
  log({
    event: 'stopped',
    cycles,
    bySignal: stopped || !!options.signal?.aborted,
  })
  return { cycles, disabled: [...context.disabled] }
}
