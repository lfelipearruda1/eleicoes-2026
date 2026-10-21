import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import {
  TSE_CAPTURE_FILES,
  TSE_MAX_RESPONSE_BYTES,
  TSE_MIN_REQUEST_INTERVAL_MS,
  TSE_NATIONAL_SCOPE,
  TSE_SOURCES,
} from '../constants.js'
import { CollectorError } from '../error.js'
import { hasErrorCode, readLimitedFile } from '../publication/storage.js'
import {
  createRunDirectory,
  readCapture,
  readLastValid,
  writeCaptureFile,
  writeLastValid,
} from './capture.js'
import {
  configUrl,
  parseElectionConfig,
  parseTarget,
  resultFileUrl,
  selectElection,
  type ResultTarget,
  type SourceName,
} from './ea11.js'
import { parseResult, type ResultSummary } from './ea20.js'
import {
  httpGet,
  parseJsonBody,
  type Transport,
  type Validator,
} from './http.js'

export interface TseOnceOptions {
  source: string
  round: string
  output: string
  election?: string
  office?: string
  scope?: string
  transport?: Transport
  now?: () => Date
  minIntervalMs?: number
}

type SampleOrigin = 'live' | 'previous-capture' | 'replay'

const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

export function parseSource(source: string): SourceName {
  if (!Object.hasOwn(TSE_SOURCES, source)) {
    throw new CollectorError('UNKNOWN_SOURCE', source)
  }
  if (!TSE_SOURCES[source as SourceName].confirmed) {
    throw new CollectorError('SOURCE_NOT_CONFIRMED', source)
  }
  return source as SourceName
}

export function parseRound(round: string): number {
  if (round !== '1' && round !== '2') {
    throw new CollectorError('INVALID_ROUND', round)
  }
  return Number(round)
}

function describeResult(summary: ResultSummary) {
  return {
    office: summary.office,
    scope: summary.scope,
    candidates: summary.candidates.length,
    sections: summary.sections,
    generation: summary.generation,
  }
}

export interface SessionOptions {
  source: SourceName
  output: string
  transport?: Transport
  now?: () => Date
  minIntervalMs?: number
  signal?: AbortSignal
}

export async function openTseSession(options: SessionOptions) {
  const { source } = options
  const now = options.now ?? (() => new Date())
  const minIntervalMs = options.minIntervalMs ?? TSE_MIN_REQUEST_INTERVAL_MS
  const sourceDirectory = path.join(path.resolve(options.output), source)
  const lastValid = await readLastValid(sourceDirectory)
  let lastRequestStart = 0

  const fetchCopy = async (
    url: URL,
    runDirectory: string,
    captureName: string,
    request: Record<string, unknown>,
  ) => {
    await sleep(
      Math.max(0, lastRequestStart + minIntervalMs - Date.now()),
      undefined,
      { signal: options.signal },
    )
    lastRequestStart = Date.now()
    const previous = lastValid[url.href]
    const previousBody =
      previous && (await readCapture(sourceDirectory, previous.capture))
    const validator: Validator | undefined = previousBody
      ? previous.validator
      : undefined
    Object.assign(request, { url: url.href, requestedAt: now().toISOString() })
    const response = await httpGet(url, {
      allowedHost: TSE_SOURCES[source].host,
      validator,
      transport: options.transport,
    }).catch((error: unknown) => {
      request.error =
        error instanceof CollectorError ? error.code : 'UNEXPECTED'
      throw error
    })
    request.status = response.status
    if (response.status === 304) {
      if (!previous || !previousBody) {
        throw new CollectorError('NOT_MODIFIED_WITHOUT_COPY', url.href)
      }
      request.reusedCapture = previous.capture
      return {
        body: previousBody,
        origin: 'previous-capture' as SampleOrigin,
        entry: previous,
      }
    }
    Object.assign(request, response.validator)
    const entry = {
      capture: `${path.basename(runDirectory)}/${captureName}`,
      validator: response.validator,
    }
    return { body: response.body, origin: 'live' as SampleOrigin, entry }
  }

  const accept = async (
    url: URL,
    copy: Awaited<ReturnType<typeof fetchCopy>>,
    runDirectory: string,
    captureName: string,
  ) => {
    if (copy.origin === 'live') {
      await writeCaptureFile(runDirectory, captureName, copy.body)
    }
    lastValid[url.href] = copy.entry
    await writeLastValid(sourceDirectory, lastValid)
  }

  const newRunDirectory = () => createRunDirectory(sourceDirectory, now())

  return { source, fetchCopy, accept, newRunDirectory }
}

export type TseSession = Awaited<ReturnType<typeof openTseSession>>

export async function fetchElectionConfig(session: TseSession) {
  const runDirectory = await session.newRunDirectory()
  const url = configUrl(session.source)
  const request: Record<string, unknown> = {}
  const metadata = {
    source: session.source,
    sourceEnvironment: TSE_SOURCES[session.source].environment,
    requests: [request],
    validation: 'not-validated',
  }
  try {
    const copy = await session.fetchCopy(
      url,
      runDirectory,
      TSE_CAPTURE_FILES.config,
      request,
    )
    const config = parseElectionConfig(parseJsonBody(copy.body, url.href))
    await session.accept(url, copy, runDirectory, TSE_CAPTURE_FILES.config)
    metadata.validation = 'valid'
    return { config, request }
  } finally {
    await writeCaptureFile(
      runDirectory,
      TSE_CAPTURE_FILES.metadata,
      toJson(metadata),
    )
  }
}

export async function collectTarget(
  session: TseSession,
  configCopy: Awaited<ReturnType<typeof fetchElectionConfig>>,
  round: number,
  target: ResultTarget,
  requestedElection?: string,
) {
  const runDirectory = await session.newRunDirectory()
  const request: Record<string, unknown> = {}
  const metadata: Record<string, unknown> = {
    source: session.source,
    sourceEnvironment: TSE_SOURCES[session.source].environment,
    office: target.office,
    round,
    scope: target.scope,
    requests: [configCopy.request, request],
    validation: 'not-validated',
  }
  try {
    const selection = selectElection(
      configCopy.config,
      round,
      target,
      requestedElection,
    )
    metadata.election = selection
    const url = resultFileUrl(session.source, selection, target)
    const copy = await session.fetchCopy(
      url,
      runDirectory,
      TSE_CAPTURE_FILES.result,
      request,
    )
    metadata.sampleOrigin = copy.origin
    let summary: ResultSummary
    try {
      summary = parseResult(parseJsonBody(copy.body, url.href), {
        election: selection.election,
        round,
        ...target,
      })
    } catch (error) {
      metadata.validation = 'rejected'
      if (copy.origin === 'live') {
        await writeCaptureFile(
          runDirectory,
          TSE_CAPTURE_FILES.rejected,
          copy.body,
        )
      }
      throw error
    }
    await session.accept(url, copy, runDirectory, TSE_CAPTURE_FILES.result)
    await writeCaptureFile(
      runDirectory,
      TSE_CAPTURE_FILES.summary,
      toJson(summary),
    )
    metadata.validation = 'valid'
    return {
      runDirectory,
      validation: 'valid',
      sampleOrigin: copy.origin,
      election: selection,
      requests: metadata.requests,
      result: describeResult(summary),
    }
  } finally {
    await writeCaptureFile(
      runDirectory,
      TSE_CAPTURE_FILES.metadata,
      toJson(metadata),
    )
  }
}

export async function runTseOnce(options: TseOnceOptions) {
  const source = parseSource(options.source)
  const round = parseRound(options.round)
  const target = parseTarget(
    options.office ?? 'president',
    options.scope ?? TSE_NATIONAL_SCOPE,
  )
  const session = await openTseSession({ ...options, source })
  const configCopy = await fetchElectionConfig(session)
  return collectTarget(session, configCopy, round, target, options.election)
}

export async function runTseReplay(options: {
  input: string
  output: string
  now?: () => Date
}) {
  const inputPath = path.resolve(options.input)
  const content = await readLimitedFile(
    inputPath,
    TSE_MAX_RESPONSE_BYTES,
  ).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) {
      throw new CollectorError('NOT_FOUND', inputPath)
    }
    throw error
  })
  const runDirectory = await createRunDirectory(
    path.join(path.resolve(options.output), 'replay'),
    (options.now ?? (() => new Date()))(),
  )
  const metadata: Record<string, unknown> = {
    sampleOrigin: 'replay' satisfies SampleOrigin,
    input: inputPath,
    validation: 'rejected',
  }
  try {
    const summary = parseResult(parseJsonBody(content, inputPath))
    await writeCaptureFile(
      runDirectory,
      TSE_CAPTURE_FILES.summary,
      toJson(summary),
    )
    metadata.validation = 'valid'
    return {
      runDirectory,
      validation: 'valid',
      result: describeResult(summary),
    }
  } finally {
    await writeCaptureFile(
      runDirectory,
      TSE_CAPTURE_FILES.metadata,
      toJson(metadata),
    )
  }
}
