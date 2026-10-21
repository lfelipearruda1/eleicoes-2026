import { useEffect, useState } from 'react'

import { NATIONAL_SCOPE, UFS, type Scope } from '../ufs.ts'

function parse(): Scope {
  const hash = window.location.hash.toUpperCase()
  const uf = UFS.find((candidate) => hash === `#/UF/${candidate.code}`)
  return uf ? { kind: 'uf', uf } : NATIONAL_SCOPE
}

export function useUfRoute() {
  const [scope, setScope] = useState(parse)

  useEffect(() => {
    const onHashChange = () => setScope(parse())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const showNational = () => {
    window.location.hash = '#/'
  }
  const showUf = (code: string) => {
    window.location.hash = `#/uf/${code}`
  }

  return { scope, showNational, showUf }
}
