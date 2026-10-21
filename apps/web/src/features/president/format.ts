export const formatCount = (value: string) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const formatPercentage = (value: string) => `${value.replace('.', ',')}%`

const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'America/Sao_Paulo',
})

export const formatInstant = (value: string | Date) =>
  `${brasiliaTime.format(new Date(value))} (horário de Brasília)`

export const formatSourceClock = (clock: { date: string; time: string }) =>
  `${clock.date} ${clock.time}`

const brasiliaClock = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'medium',
  timeZone: 'America/Sao_Paulo',
})

export const formatClockTime = (value: Date) => brasiliaClock.format(value)

const DURATION_UNITS = [
  [3_600_000, 'hora', 'horas'],
  [60_000, 'minuto', 'minutos'],
  [1_000, 'segundo', 'segundos'],
] as const

export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms} milissegundos`
  const [size, one, many] =
    DURATION_UNITS.find(([unit]) => ms % unit === 0) ?? DURATION_UNITS[2]
  const count = Math.floor(ms / size)
  return `${count} ${count === 1 ? one : many}`
}
