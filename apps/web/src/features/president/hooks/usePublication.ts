import { useCallback, useEffect, useRef, useState } from 'react'

import { assessFreshness, nextFreshnessChangeAt } from '../freshness.ts'
import type { ResultSnapshot, SnapshotEnvelope } from '@eleicoes/validation'

import {
  readPublication,
  type AcceptedPublication,
  type RejectionReason,
  type SnapshotSchema,
} from '../publication.ts'
import { LOCAL_POLL_INTERVAL_MS, type ChannelSource } from '../resultsConfig.ts'

export const FRESHNESS_RECHECK_MAX_MS = 60_000
export const MISSING_CHANNEL_POLL_INTERVAL_MS = 60_000

export type FailureReason = RejectionReason | 'unreachable'

export interface UpdateFailure {
  reason: FailureReason
  at: Date
}

interface ChannelRead<T extends SnapshotEnvelope> {
  channel: string
  accepted?: AcceptedPublication<T>
  failure?: UpdateFailure
  lastReadAt?: Date
}

export function usePublication<T extends SnapshotEnvelope = ResultSnapshot>({
  source,
  staleAfterMs,
  intervalMs = LOCAL_POLL_INTERVAL_MS,
  fetcher = fetch,
  missingIntervalMs = intervalMs,
  schema,
}: {
  source: ChannelSource | undefined
  staleAfterMs: number
  intervalMs?: number
  fetcher?: typeof fetch
  missingIntervalMs?: number
  schema?: SnapshotSchema<T>
}) {
  const [read, setRead] = useState<ChannelRead<T>>()
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const attemptRef = useRef<(manual: boolean) => void>(() => {})
  const own = read && read.channel === source?.channel ? read : undefined
  const accepted = own?.accepted
  const failure = own?.failure
  const lastReadAt = own?.lastReadAt

  useEffect(() => {
    if (!source) return
    const { channel } = source
    const ownRead = (previous: ChannelRead<T> | undefined): ChannelRead<T> =>
      previous?.channel === channel ? previous : { channel }
    const fail = (failure: UpdateFailure) =>
      setRead((previous) => ({ ...ownRead(previous), failure }))
    const succeed = (publication?: AcceptedPublication<T>) =>
      setRead((previous) => {
        const accepted = publication ?? ownRead(previous).accepted
        return {
          channel,
          lastReadAt: new Date(),
          ...(accepted && { accepted }),
        }
      })
    let disposed = false
    let awaitingChannel = false
    let inFlight: AbortController | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: AcceptedPublication<T> | undefined

    const schedule = () => {
      clearTimeout(timer)
      if (disposed || document.visibilityState !== 'visible') return
      const wait = awaitingChannel ? missingIntervalMs : intervalMs
      timer = setTimeout(() => void attempt(), wait)
    }

    const attempt = async (manual = false) => {
      if (disposed || inFlight) return
      clearTimeout(timer)
      const controller = new AbortController()
      inFlight = controller
      setIsLoading(true)
      setIsChecking(manual)
      try {
        const result = await readPublication(
          current,
          controller.signal,
          source,
          fetcher,
          schema,
        )
        if (controller.signal.aborted) return
        setNowMs(Date.now())
        if (result.outcome === 'rejected') {
          awaitingChannel = !current && result.reason === 'manifest_missing'
          fail({ reason: result.reason, at: new Date() })
          return
        }
        awaitingChannel = false
        if (result.outcome === 'same') return succeed()
        current = result.publication
        succeed(result.publication)
      } catch {
        if (!controller.signal.aborted) {
          setNowMs(Date.now())
          fail({ reason: 'unreachable', at: new Date() })
        }
      } finally {
        inFlight = undefined
        if (!disposed) {
          setIsLoading(false)
          setIsChecking(false)
          schedule()
        }
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNowMs(Date.now())
        void attempt()
        return
      }
      clearTimeout(timer)
    }

    attemptRef.current = (manual) => void attempt(manual)
    document.addEventListener('visibilitychange', onVisibilityChange)
    void attempt()
    return () => {
      disposed = true
      inFlight?.abort()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      attemptRef.current = () => {}
    }
  }, [source, intervalMs, missingIntervalMs, fetcher, schema])

  const freshness = accepted && assessFreshness(accepted, nowMs, staleAfterMs)
  const changesAt = freshness && nextFreshnessChangeAt(freshness, staleAfterMs)

  useEffect(() => {
    if (changesAt === undefined) return
    const wait = Math.min(
      Math.max(changesAt - Date.now(), 0),
      FRESHNESS_RECHECK_MAX_MS,
    )
    const timer = setTimeout(() => setNowMs(Date.now()), wait)
    return () => clearTimeout(timer)
  }, [changesAt, nowMs])

  const refresh = useCallback(() => attemptRef.current(true), [])

  return {
    accepted,
    freshness,
    isLoading,
    isChecking,
    failure,
    lastReadAt,
    refresh,
  }
}
