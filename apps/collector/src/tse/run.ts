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

function parseSource(source: string): SourceName {
  if (!Object.hasOwn(TSE_SOURCES, source)) {
    throw new CollectorError('UNKNOWN_SOURCE', source)
  }
  if (!TSE_SOURCES[source as SourceName].confirmed) {
    throw new CollectorError('SOURCE_NOT_CONFIRMED', source)
  }
  return source as SourceName
}

function parseRound(round: string): number {
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

export async function runTseOnce(options: TseOnceOptions) {
  const source = parseSource(options.source)
  const round = parseRound(options.round)
  const target = parseTarget(
    options.office ?? 'president',
    options.scope ?? TSE_NATIONAL_SCOPE,
  )
  const now = options.now ?? (() => new Date())
  const minIntervalMs = options.minIntervalMs ?? TSE_MIN_REQUEST_INTERVAL_MS
  const sourceDirectory = path.join(path.resolve(options.output), source)
  const runDirectory = await createRunDirectory(sourceDirectory, now())
  const runId = path.basename(runDirectory)
  const lastValid = await readLastValid(sourceDirectory)
  const requests: Record<string, unknown>[] = []
  const metadata: Record<string, unknown> = {
    source,
    sourceEnvironment: TSE_SOURCES[source].environment,
    office: target.office,
    round,
    scope: target.scope,
    requests,
    validation: 'not-validated',
  }
  let lastRequestStart = 0

  const fetchCopy = async (url: URL, captureName: string) => {
    await sleep(Math.max(0, lastRequestStart + minIntervalMs - Date.now()))
    lastRequestStart = Date.now()
    const previous = lastValid[url.href]
    const previousBody =
      previous && (await readCapture(sourceDirectory, previous.capture))
    const validator: Validator | undefined = previousBody
      ? previous.validator
      : undefined
    const request: Record<string, unknown> = {
      url: url.href,
      requestedAt: now().toISOString(),
    }
    requests.push(request)
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
      capture: `${runId}/${captureName}`,
      validator: response.validator,
    }
    return { body: response.body, origin: 'live' as SampleOrigin, entry }
  }

  const accept = async (
    url: URL,
    copy: Awaited<ReturnType<typeof fetchCopy>>,
    captureName: string,
  ) => {
    if (copy.origin === 'live') {
      await writeCaptureFile(runDirectory, captureName, copy.body)
    }
    lastValid[url.href] = copy.entry
    await writeLastValid(sourceDirectory, lastValid)
  }

  try {
    const electionConfigUrl = configUrl(source)
    const config = await fetchCopy(electionConfigUrl, TSE_CAPTURE_FILES.config)
    const selection = selectElection(
      parseElectionConfig(parseJsonBody(config.body, electionConfigUrl.href)),
      round,
      target,
      options.election,
    )
    await accept(electionConfigUrl, config, TSE_CAPTURE_FILES.config)
    metadata.election = selection

    const resultUrl = resultFileUrl(source, selection, target)
    const result = await fetchCopy(resultUrl, TSE_CAPTURE_FILES.result)
    metadata.sampleOrigin = result.origin
    let summary: ResultSummary
    try {
      summary = parseResult(parseJsonBody(result.body, resultUrl.href), {
        election: selection.election,
        round,
        ...target,
      })
    } catch (error) {
      metadata.validation = 'rejected'
      if (result.origin === 'live') {
        await writeCaptureFile(
          runDirectory,
          TSE_CAPTURE_FILES.rejected,
          result.body,
        )
      }
      throw error
    }
    await accept(resultUrl, result, TSE_CAPTURE_FILES.result)
    await writeCaptureFile(
      runDirectory,
      TSE_CAPTURE_FILES.summary,
      toJson(summary),
    )
    metadata.validation = 'valid'
    return {
      runDirectory,
      validation: 'valid',
      sampleOrigin: result.origin,
      election: selection,
      requests,
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
