import { useState } from 'react'

import type { CandidateTone } from '../../president/candidates.ts'
import type { UfMapResult } from '../ufResults.ts'
import type { Scope } from '../ufs.ts'
import { BrazilMap } from './BrazilMap.tsx'
import { MapLegend } from './MapLegend.tsx'
import styles from './MapSection.module.css'
import { UfList } from './UfList.tsx'
import { ViewToggle, type MapView } from './ViewToggle.tsx'

interface MapSectionProps {
  candidates: { candidateId: string; ballotName: string; tone: CandidateTone }[]
  ufResults: Record<string, UfMapResult>
  scope: Scope
  onSelectUf: (code: string) => void
}

export function MapSection({
  candidates,
  ufResults,
  scope,
  onSelectUf,
}: MapSectionProps) {
  const [view, setView] = useState<MapView>('map')
  return (
    <section aria-label="Mapa do Brasil" className={styles.section}>
      <div className={styles.toolbar}>
        <ViewToggle view={view} onChange={setView} />
        <MapLegend
          candidates={candidates}
          showUndecided={Object.values(ufResults).some(
            (result) => result.undecided,
          )}
        />
      </div>
      {view === 'map' ? (
        <>
          <div className={styles.mapWrap}>
            <BrazilMap
              results={ufResults}
              scope={scope}
              onSelectUf={onSelectUf}
            />
          </div>
          <p className={styles.hint}>
            Selecione uma UF para ver os resultados. O resultado nacional é a
            soma dos votos, não a área do mapa.
          </p>
        </>
      ) : (
        <UfList
          candidateNames={candidates}
          results={ufResults}
          scope={scope}
          onSelectUf={onSelectUf}
        />
      )}
    </section>
  )
}
