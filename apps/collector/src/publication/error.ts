import { ERROR_MESSAGES } from '../constants.js'

export type ErrorCode = keyof typeof ERROR_MESSAGES

export class PublicationError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, detail: string, cause?: unknown) {
    super(ERROR_MESSAGES[code](detail), { cause })
    this.code = code
  }
}
