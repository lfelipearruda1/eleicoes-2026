import type { CollectorError } from '../../src/error.js'

export async function errorOf(
  promise: Promise<unknown>,
): Promise<CollectorError> {
  try {
    await promise
  } catch (error) {
    return error as CollectorError
  }
  throw new Error('a operação deveria falhar')
}

export function thrownBy(action: () => unknown): CollectorError {
  try {
    action()
  } catch (error) {
    return error as CollectorError
  }
  throw new Error('a operação deveria falhar')
}
