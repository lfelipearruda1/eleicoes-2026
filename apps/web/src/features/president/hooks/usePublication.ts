import { useCallback, useEffect, useRef, useState } from 'react'

import { assessFreshness, nextFreshnessChangeAt } from '../freshness.ts'
import type { ResultSnapshot, SnapshotEnvelope } from '@eleicoes/validation'

import {
  readPublication,
  type AcceptedPublication,
  type RejectionReason,
  type SnapshotSchema,
} from '../publication.ts'
import type { ChannelSource } from '../resultsConfig.ts'

export const LOCAL_POLL_INTERVAL_MS = 5_000
export const FRESHNESS_RECHECK_MAX_MS = 60_000

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
  stopWhenMissing = false,
  schema,
}: {
  source: ChannelSource | undefined
  staleAfterMs: number
  intervalMs?: number
  fetcher?: typeof fetch
  stopWhenMissing?: boolean
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
    const update = (change: Omit<ChannelRead<T>, 'channel'>) =>
      setRead((previous) => ({
        ...(previous?.channel === channel ? previous : {}),
        channel,
        ...change,
      }))
    let disposed = false
    let stopped = false
    let inFlight: AbortController | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: AcceptedPublication<T> | undefined

    const schedule = () => {
      clearTimeout(timer)
      if (disposed || stopped || document.visibilityState !== 'visible') {
        return
      }
      timer = setTimeout(() => void attempt(), intervalMs)
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
          stopped =
            stopWhenMissing && !current && result.reason === 'manifest_missing'
          update({ failure: { reason: result.reason, at: new Date() } })
          return
        }
        if (result.outcome === 'accepted') current = result.publication
        update({
          failure: undefined,
          lastReadAt: new Date(),
          ...(result.outcome === 'accepted' && {
            accepted: result.publication,
          }),
        })
      } catch {
        if (!controller.signal.aborted) {
          setNowMs(Date.now())
          update({ failure: { reason: 'unreachable', at: new Date() } })
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
  }, [source, intervalMs, fetcher, stopWhenMissing, schema])

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
