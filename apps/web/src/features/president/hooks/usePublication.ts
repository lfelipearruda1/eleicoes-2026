import { useCallback, useEffect, useRef, useState } from 'react'

import { assessFreshness, nextFreshnessChangeAt } from '../freshness.ts'
import {
  readPublication,
  type AcceptedPublication,
  type RejectionReason,
} from '../publication.ts'
import type { ResultsEndpoint } from '../resultsConfig.ts'

export const LOCAL_POLL_INTERVAL_MS = 5_000
export const FRESHNESS_RECHECK_MAX_MS = 60_000

export type FailureReason = RejectionReason | 'unreachable'

export interface UpdateFailure {
  reason: FailureReason
  at: Date
}

export function usePublication({
  endpoint,
  staleAfterMs,
  intervalMs = LOCAL_POLL_INTERVAL_MS,
  fetcher = fetch,
}: {
  endpoint: ResultsEndpoint
  staleAfterMs: number
  intervalMs?: number
  fetcher?: typeof fetch
}) {
  const [accepted, setAccepted] = useState<AcceptedPublication>()
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [failure, setFailure] = useState<UpdateFailure>()
  const [lastReadAt, setLastReadAt] = useState<Date>()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const attemptRef = useRef<(manual: boolean) => void>(() => {})

  useEffect(() => {
    let disposed = false
    let inFlight: AbortController | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: AcceptedPublication | undefined

    const schedule = () => {
      clearTimeout(timer)
      if (disposed || document.visibilityState !== 'visible') return
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
          endpoint,
          fetcher,
        )
        if (controller.signal.aborted) return
        setNowMs(Date.now())
        if (result.outcome === 'rejected') {
          setFailure({ reason: result.reason, at: new Date() })
          return
        }
        setFailure(undefined)
        setLastReadAt(new Date())
        if (result.outcome === 'accepted') {
          current = result.publication
          setAccepted(result.publication)
        }
      } catch {
        if (!controller.signal.aborted) {
          setNowMs(Date.now())
          setFailure({ reason: 'unreachable', at: new Date() })
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
  }, [endpoint, intervalMs, fetcher])

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
