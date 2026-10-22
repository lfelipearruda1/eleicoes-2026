export const formatCount = (value: string) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const formatPercentage = (value: string) => `${value.replace('.', ',')}%`

export const formatSourceClock = (clock: { date: string; time: string }) =>
  `${clock.date} ${clock.time}`
