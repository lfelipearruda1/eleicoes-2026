export const formatCount = (value: string) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const formatPercentage = (value: string) => `${value.replace('.', ',')}%`

const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'America/Sao_Paulo',
})

// Só para horários do contrato em UTC (sufixo Z) ou do relógio do navegador.
export const formatInstant = (value: string | Date) =>
  `${brasiliaTime.format(new Date(value))} (horário de Brasília)`

// Data e hora brutas da origem: fuso não confirmado, exibidas como recebidas.
export const formatSourceClock = (clock: { date: string; time: string }) =>
  `${clock.date} ${clock.time}`

const brasiliaClock = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'medium',
  timeZone: 'America/Sao_Paulo',
})

// Hora do relógio do navegador, no horário de Brasília (hh:mm:ss).
export const formatClockTime = (value: Date) => brasiliaClock.format(value)
