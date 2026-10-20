import { useEffect, useState } from 'react'

import { findUf } from '../ufs.ts'

const UF_HASH = /^#\/uf\/([a-z]{2})$/i

const parse = () =>
  findUf(UF_HASH.exec(window.location.hash)?.[1]?.toUpperCase())?.code

export function useUfRoute() {
  const [selected, setSelected] = useState(parse)

  useEffect(() => {
    const onHashChange = () => setSelected(parse())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const select = (code: string | undefined) => {
    window.location.hash = code ? `#/uf/${code}` : '#/'
  }

  return { selected, select }
}
