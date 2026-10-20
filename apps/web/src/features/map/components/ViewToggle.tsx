import styles from './ViewToggle.module.css'

export type MapView = 'map' | 'list'

const OPTIONS: { value: MapView; label: string }[] = [
  { value: 'map', label: 'Mapa' },
  { value: 'list', label: 'Lista' },
]

export function ViewToggle({
  view,
  onChange,
}: {
  view: MapView
  onChange: (view: MapView) => void
}) {
  return (
    <div role="group" aria-label="Formato de exibição" className={styles.group}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={view === option.value}
          onClick={() => onChange(option.value)}
          className={`${styles.option} ${view === option.value ? styles.active : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
