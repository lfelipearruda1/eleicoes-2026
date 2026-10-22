import { useEffect, useState } from 'react'

import { NATIONAL_SCOPE, UFS, type Scope } from '../ufs.ts'

const LEGACY_HASH_ROUTE = /^#\/uf\/([a-z]{2})$/i

const pathFor = (scope: Scope) =>
  scope.kind === 'uf' ? `/${scope.uf.code.toLowerCase()}` : '/'

function scopeOf(code: string): Scope {
  const uf = UFS.find((candidate) => candidate.code === code.toUpperCase())
  return uf ? { kind: 'uf', uf } : NATIONAL_SCOPE
}

function readRoute(): Scope {
  const { pathname, hash, search } = window.location
  const legacyCode = LEGACY_HASH_ROUTE.exec(hash)?.[1]
  const scope = scopeOf(legacyCode ?? pathname.replaceAll('/', ''))
  const path = pathFor(scope)
  if (pathname !== path || hash !== '') {
    window.history.replaceState(null, '', `${path}${search}`)
  }
  return scope
}

export function useUfRoute() {
  const [scope, setScope] = useState(readRoute)

  useEffect(() => {
    const onPopState = () => setScope(readRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (next: Scope) => {
    const path = pathFor(next)
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
    setScope(next)
  }

  return {
    scope,
    showNational: () => navigate(NATIONAL_SCOPE),
    showUf: (code: string) => navigate(scopeOf(code)),
  }
}
