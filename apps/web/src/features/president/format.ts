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
