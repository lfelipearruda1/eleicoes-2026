import { ChevronDown } from 'lucide-react'

import { UFS } from '../../map/ufs.ts'
import styles from './UfSelect.module.css'

interface UfSelectProps {
  selectedUf: string | undefined
  onSelectUf: (code: string | undefined) => void
}

export function UfSelect({ selectedUf, onSelectUf }: UfSelectProps) {
  return (
    <span className={styles.wrapper}>
      <select
        aria-label="Escolher UF"
        value={selectedUf ?? ''}
        onChange={(event) => onSelectUf(event.target.value || undefined)}
        className={styles.select}
      >
        <option value="">
          {selectedUf ? 'Trocar de UF' : 'Escolha uma UF'}
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
