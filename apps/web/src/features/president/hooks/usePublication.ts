import { useCallback, useEffect, useRef, useState } from 'react'

import {
  readPublication,
  type AcceptedPublication,
  type RejectionReason,
} from '../publication.ts'

export const LOCAL_POLL_INTERVAL_MS = 5_000

export type FailureReason = RejectionReason | 'unreachable'

export interface UpdateFailure {
  reason: FailureReason
  at: Date
}

export function usePublication({
  intervalMs = LOCAL_POLL_INTERVAL_MS,
  fetcher = fetch,
}: { intervalMs?: number; fetcher?: typeof fetch } = {}) {
  const [accepted, setAccepted] = useState<AcceptedPublication>()
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [failure, setFailure] = useState<UpdateFailure>()
  const [lastReadAt, setLastReadAt] = useState<Date>()
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
          fetcher,
        )
        if (controller.signal.aborted) return
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
  }, [intervalMs, fetcher])

  const refresh = useCallback(() => attemptRef.current(true), [])

  return { accepted, isLoading, isChecking, failure, lastReadAt, refresh }
}
