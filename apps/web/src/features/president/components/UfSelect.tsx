import { ChevronDown } from 'lucide-react'

import { UFS, type Scope } from '../../map/ufs.ts'
import styles from './UfSelect.module.css'

interface UfSelectProps {
  scope: Scope
  onShowNational: () => void
  onShowUf: (code: string) => void
}

export function UfSelect({ scope, onShowNational, onShowUf }: UfSelectProps) {
  return (
    <span className={styles.wrapper}>
      <select
        aria-label="Escolher UF"
        value={scope.kind === 'uf' ? scope.uf.code : ''}
        onChange={(event) => {
          const code = event.target.value
          if (code === '') return onShowNational()
          onShowUf(code)
        }}
        className={styles.select}
      >
        <option value="">
          {scope.kind === 'uf' ? 'Trocar de UF' : 'Escolha uma UF'}
        </option>
        {UFS.map((uf) => (
          <option key={uf.code} value={uf.code}>
            {uf.name} ({uf.code})
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={styles.chevron}
        strokeWidth={2.5}
      />
    </span>
  )
}
