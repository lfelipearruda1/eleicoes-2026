import { ArrowLeft } from 'lucide-react'
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
  candidates: {
    candidateId: string
    ballotName: string
    party?: string
    tone: CandidateTone
  }[]
  ufResults: Record<string, UfMapResult>
  scope: Scope
  onSelectUf: (code: string) => void
  onShowNational: () => void
}

export function MapSection({
  candidates,
  ufResults,
  scope,
  onSelectUf,
  onShowNational,
}: MapSectionProps) {
  const isBrasil = scope.kind === 'national'
  const [view, setView] = useState<MapView>('map')
  return (
    <section aria-label="Mapa do Brasil" className={styles.section}>
      <div className={styles.toolbar}>
        <ViewToggle view={view} onChange={setView} />
        <button
          type="button"
          onClick={onShowNational}
          aria-current={isBrasil ? 'page' : 'false'}
          className={`${styles.brasil} ${isBrasil ? styles.brasilCurrent : ''}`}
        >
          <ArrowLeft aria-hidden="true" size={15} strokeWidth={2.4} />
          Visão Brasil
        </button>
      </div>
      {view === 'map' ? (
        <div className={styles.mapWrap}>
          <BrazilMap
            results={ufResults}
            scope={scope}
            onSelectUf={onSelectUf}
          />
          <div className={styles.legendSlot}>
            <MapLegend
              candidates={candidates}
              showUndecided={Object.values(ufResults).some(
                (result) => result.undecided,
              )}
            />
          </div>
        </div>
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
