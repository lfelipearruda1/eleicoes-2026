import { useState } from 'react'

import type { UfMapResult } from '../ufResults.ts'
import { CALLOUTS, MAP_GEOMETRY, UFS, type Uf } from '../ufs.ts'
import styles from './BrazilMap.module.css'
import { MapTooltip } from './MapTooltip.tsx'

interface BrazilMapProps {
  results: Record<string, UfMapResult>
  selectedUf: string | undefined
  onSelectUf: (code: string) => void
}

const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(' ')

const describeUf = (uf: Uf, result: UfMapResult | undefined) =>
  `${uf.name} (${uf.code}): ${result?.description ?? 'dados indisponíveis'}`

const fillClass = (result: UfMapResult | undefined) =>
  result?.tone ? styles[result.tone] : result?.undecided && styles.undecided

function UfLabel({
  uf,
  isSelected,
  isDimmed,
  onSelect,
}: {
  uf: Uf
  isSelected: boolean
  isDimmed: boolean
  onSelect: () => void
}) {
  const { cx: x, cy: y } = MAP_GEOMETRY[uf.code]
  const callout = CALLOUTS[uf.code]
  if (callout) {
    const [lx, ly] = callout
    return (
      <g
        aria-hidden="true"
        className={cx(styles.callout, isDimmed && styles.labelDimmed)}
        onClick={onSelect}
      >
        <line className={styles.calloutLine} x1={x} y1={y} x2={lx} y2={ly} />
        <rect
          className={isSelected ? styles.selectedPill : styles.calloutPill}
          x={lx - 25}
          y={ly - 14}
          width={50}
          height={28}
          rx={14}
        />
        <text
          className={cx(styles.calloutText, isSelected && styles.selectedText)}
          x={lx}
          y={ly}
        >
          {uf.code}
        </text>
      </g>
    )
  }
  if (isSelected) {
    return (
      <g aria-hidden="true" className={styles.label}>
        <rect
          className={styles.selectedPill}
          x={x - 28}
          y={y - 16}
          width={56}
          height={32}
          rx={16}
        />
        <text className={cx(styles.label, styles.selectedText)} x={x} y={y}>
          {uf.code}
        </text>
      </g>
    )
  }
  return (
    <text
      aria-hidden="true"
      className={cx(styles.label, isDimmed && styles.labelDimmed)}
      x={x}
      y={y}
    >
      {uf.code}
    </text>
  )
}

export function BrazilMap({ results, selectedUf, onSelectUf }: BrazilMapProps) {
  const [hovered, setHovered] = useState<string>()
  const [focused, setFocused] = useState<string>()
  const tooltipUf = UFS.find((uf) => uf.code === (hovered ?? focused))

  const outline = (code: string | undefined, className: string, key: string) =>
    code && <path key={key} className={className} d={MAP_GEOMETRY[code].d} />

  return (
    <svg
      viewBox="-6 -6 1056 1046"
      role="group"
      aria-label="Mapa do Brasil com as 27 UFs. Use Tab para percorrer e Enter para abrir."
      className={styles.map}
    >
      <defs>
        <pattern
          id="pat-na"
          patternUnits="userSpaceOnUse"
          width={8}
          height={8}
          patternTransform="rotate(45)"
        >
          <rect className={styles.unavailableBase} width={8} height={8} />
          <rect className={styles.unavailableStripe} width={2} height={8} />
        </pattern>
      </defs>
      <g>
        {UFS.map((uf) => (
          <path
            key={uf.code}
            d={MAP_GEOMETRY[uf.code].d}
            fill="url(#pat-na)"
            className={cx(
              styles.uf,
              fillClass(results[uf.code]),
              selectedUf && selectedUf !== uf.code && styles.ufDimmed,
            )}
            tabIndex={0}
            role="button"
            aria-label={describeUf(uf, results[uf.code])}
            aria-pressed={selectedUf === uf.code}
            onClick={() => onSelectUf(uf.code)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onSelectUf(uf.code)
            }}
            onMouseEnter={() => setHovered(uf.code)}
            onMouseLeave={() => setHovered(undefined)}
            onFocus={() => setFocused(uf.code)}
            onBlur={() => setFocused(undefined)}
          />
        ))}
      </g>
      <g>
        {hovered !== selectedUf &&
          outline(hovered, styles.outlineHover, 'hover')}
        {outline(selectedUf, styles.outlineSelectedBack, 'selected-back')}
        {outline(selectedUf, styles.outlineSelected, 'selected')}
        {outline(focused, styles.outlineFocus, 'focus')}
      </g>
      <g>
        {UFS.map((uf) => (
          <UfLabel
            key={uf.code}
            uf={uf}
            isSelected={selectedUf === uf.code}
            isDimmed={selectedUf !== undefined && selectedUf !== uf.code}
            onSelect={() => onSelectUf(uf.code)}
          />
        ))}
      </g>
      {tooltipUf && (
        <MapTooltip uf={tooltipUf} result={results[tooltipUf.code]} />
      )}
    </svg>
  )
}
