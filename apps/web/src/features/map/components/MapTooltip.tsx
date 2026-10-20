import { MAP_GEOMETRY, type Uf } from '../ufs.ts'
import styles from './MapTooltip.module.css'

const WIDTH = 306
const HEIGHT = 104
const VIEW_RIGHT = 1050
const VIEW_BOTTOM = 1040

export function MapTooltip({ uf }: { uf: Uf }) {
  const { cx, cy } = MAP_GEOMETRY[uf.code]
  const x = cx + WIDTH + 24 > VIEW_RIGHT ? cx - WIDTH - 24 : cx + 24
  const y = Math.max(0, Math.min(cy - 26, VIEW_BOTTOM - HEIGHT))
  return (
    <g
      aria-hidden="true"
      className={styles.tooltip}
      transform={`translate(${x} ${y})`}
    >
      <rect className={styles.box} width={WIDTH} height={HEIGHT} rx={21} />
      <text className={styles.name} x={21} y={42}>
        {uf.name}
      </text>
      <text className={styles.code} x={WIDTH - 21} y={42}>
        {uf.code}
      </text>
      <circle className={styles.dot} cx={26} cy={74} r={5} />
      <text className={styles.line} x={42} y={80}>
        Dados indisponíveis
      </text>
    </g>
  )
}
