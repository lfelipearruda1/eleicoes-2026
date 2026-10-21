export function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`fixture sem o item ${index}`)
  return item
}
