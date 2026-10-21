import type { UfMapResult } from '../ufResults.ts'
import { MAP_GEOMETRY, type Uf } from '../ufs.ts'
import styles from './MapTooltip.module.css'

const WIDTH = 340
const LINE_HEIGHT = 30
const VIEW_RIGHT = 1050
const VIEW_BOTTOM = 1040

export function MapTooltip({
  uf,
  result,
}: {
  uf: Uf
  result: UfMapResult | undefined
}) {
  const lines = result?.tooltip ?? ['Dados indisponíveis']
  const height = 74 + LINE_HEIGHT * lines.length
  const { cx, cy } = MAP_GEOMETRY[uf.code]
  const x = cx + WIDTH + 24 > VIEW_RIGHT ? cx - WIDTH - 24 : cx + 24
  const y = Math.max(0, Math.min(cy - 26, VIEW_BOTTOM - height))
  return (
    <g
      aria-hidden="true"
      className={styles.tooltip}
      transform={`translate(${x} ${y})`}
    >
      <rect className={styles.box} width={WIDTH} height={height} rx={21} />
      <text className={styles.name} x={21} y={42}>
        {uf.name}
      </text>
      <text className={styles.code} x={WIDTH - 21} y={42}>
        {uf.code}
      </text>
      <circle
        className={`${styles.dot} ${result?.tone ? styles[result.tone] : ''}`}
        cx={26}
        cy={74}
        r={5}
      />
      {lines.map((line, index) => (
        <text
          key={line}
          className={index === 0 ? styles.line : styles.detail}
          x={42}
          y={80 + LINE_HEIGHT * index}
        >
          {line}
        </text>
      ))}
    </g>
  )
}
