import type { Manifest, ResultSnapshot } from '@eleicoes/validation'

import {
  channelSource,
  type ResultsEndpoint,
} from '../../src/features/president/resultsConfig.ts'

export const TEST_ORIGIN = 'http://127.0.0.1:5173'
export const TEST_ENDPOINT: ResultsEndpoint = {
  root: new URL('/publications/', TEST_ORIGIN),
  channelPrefix: 'demo-sintetico',
  round: '2',
}
export const TEST_SOURCE = channelSource(TEST_ENDPOINT, 'president', 'BR')
export const NATIONAL_PATH = '/publications/demo-sintetico-presidente-br-2t/'

const channelOf = (snapshot: ResultSnapshot) =>
  `demo-sintetico-${snapshot.office === 'president' ? 'presidente' : 'governador'}-${snapshot.scope.toLowerCase()}-2t`
export const TEST_STALE_AFTER_MS = 120_000

export const DATA_VERSION_A = '0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d'
export const DATA_VERSION_B = '1c8d0b63-4a2f-4e3b-8d5c-7f9a2b3c4d5e'

const common = {
  contractVersion: 1,
  environment: 'local',
  sourceEnvironment: 'synthetic',
  round: 2,
  office: 'president',
  scope: 'BR',
  collectedAt: '2026-10-25T21:00:05Z',
  source: { file: 'sintetico/presidente-br.json' },
  totalization: { status: 'in_progress', finalIndicator: false },
  sections: { total: '400', totalized: '200', totalizedPercentage: '50.00' },
  origin: {
    electionCode: '9002',
    generationId: '103',
    generatedAt: { date: '25/10/2026', time: '18:00:00' },
  },
} as const

export const availableSnapshot = (
  overrides: Record<string, unknown> = {},
): ResultSnapshot =>
  ({
    ...common,
    dataVersion: DATA_VERSION_A,
    availability: 'available',
    votesReleased: true,
    votes: { total: '10600', valid: '10050', contestant: '10000' },
    candidates: [
      {
        candidateId: '900000000001',
        number: '91',
        ballotName: 'CANDIDATURA SINTÉTICA A',
        votes: '6000',
        contestantVotesPercentage: '60.00',
      },
      {
        candidateId: '900000000002',
        number: '92',
        ballotName: 'CANDIDATURA SINTÉTICA B',
        votes: '4000',
        contestantVotesPercentage: '40.00',
      },
      {
        candidateId: '900000000003',
        number: '93',
        ballotName: 'CANDIDATURA SINTÉTICA C',
        votes: '0',
        contestantVotesPercentage: '0.00',
      },
    ],
    ...overrides,
  }) as ResultSnapshot

export const pendingSnapshot = (
  overrides: Record<string, unknown> = {},
): ResultSnapshot =>
  ({
    ...common,
    dataVersion: DATA_VERSION_A,
    availability: 'pending',
    pendingReason: 'votes_not_released',
    votesReleased: false,
    candidates: [
      {
        candidateId: '900000000001',
        number: '91',
        ballotName: 'CANDIDATURA SINTÉTICA A',
      },
      {
        candidateId: '900000000002',
        number: '92',
        ballotName: 'CANDIDATURA SINTÉTICA B',
      },
    ],
    ...overrides,
  }) as ResultSnapshot

export const manifestFor = (
  snapshot: ResultSnapshot,
  revision = 1,
  overrides: Record<string, unknown> = {},
): Manifest =>
  ({
    contractVersion: 1,
    channel: channelOf(snapshot),
    revision,
    environment: snapshot.environment,
    sourceEnvironment: snapshot.sourceEnvironment,
    round: snapshot.round,
    office: snapshot.office,
    scope: snapshot.scope,
    current: {
      dataVersion: snapshot.dataVersion,
      path: `snapshots/${snapshot.dataVersion}.json`,
      publishedAt: '2026-10-25T21:01:00Z',
    },
    ...overrides,
  }) as Manifest

export function fakeServer(files: Record<string, unknown> = {}) {
  const calls: string[] = []
  const fetcher = (async (input: RequestInfo | URL) => {
    const href = String(input)
    const url = href.startsWith(`${TEST_ORIGIN}/`)
      ? href.slice(TEST_ORIGIN.length)
      : href
    calls.push(url)
    const body = files[url]
    if (body instanceof Error) throw body
    if (body === undefined) return new Response('', { status: 404 })
    return new Response(typeof body === 'string' ? body : JSON.stringify(body))
  }) as typeof fetch
  const publish = (manifest: Manifest, snapshot?: ResultSnapshot) => {
    const root = `/publications/${manifest.channel}/`
    files[`${root}manifest.json`] = manifest
    if (snapshot) {
      files[`${root}snapshots/${snapshot.dataVersion}.json`] = snapshot
    }
  }
  return { files, calls, fetcher, publish }
}

export function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`fixture sem o item ${index}`)
  return item
}
