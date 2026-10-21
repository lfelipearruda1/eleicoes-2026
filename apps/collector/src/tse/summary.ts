import { randomUUID } from 'node:crypto'

import {
  BRAZILIAN_STATE_CODES,
  publishUfSummarySchema,
  readResultSnapshotSchema,
  readUfSummarySchema,
  type ResultSnapshot,
  type UfSummarySnapshot,
} from '@eleicoes/validation'

import { CollectorError } from '../error.js'
import { publishDocument } from '../publication/publish.js'
import { readPublication } from '../publication/read.js'
import { channelFor, summaryChannelFor } from './channels.js'

const SUMMARY_SOURCE_FILE = 'resumo/presidente-uf.json'

function summarizeUf(
  snapshot: ResultSnapshot,
): UfSummarySnapshot['ufs'][number] {
  const common = {
    scope: snapshot.scope as UfSummarySnapshot['ufs'][number]['scope'],
    dataVersion: snapshot.dataVersion,
    collectedAt: snapshot.collectedAt,
    totalizationStatus: snapshot.totalization.status,
    sections: snapshot.sections,
  }
  if (snapshot.availability === 'pending') {
    return {
      ...common,
      availability: 'pending',
      candidates: snapshot.candidates.map(({ candidateId }) => ({
        candidateId,
      })),
    }
  }
  return {
    ...common,
    availability: 'available',
    candidates: snapshot.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      votes: candidate.votes,
      contestantVotesPercentage: candidate.contestantVotesPercentage,
      ...(candidate.voteDestination && {
        voteDestination: candidate.voteDestination,
      }),
    })),
  }
}

export function buildUfSummary(
  snapshots: ResultSnapshot[],
  dataVersion: string,
): UfSummarySnapshot {
  const [first] = snapshots
  const mixed = snapshots.some(
    (snapshot) =>
      snapshot.office !== 'president' ||
      snapshot.scope === 'BR' ||
      snapshot.round !== first.round ||
      snapshot.sourceEnvironment !== first.sourceEnvironment,
  )
  if (mixed) {
    throw new CollectorError(
      'INVALID_DOCUMENT',
      'o resumo só junta presidente por UF do mesmo turno e origem',
    )
  }
  const ordered = snapshots.toSorted(
    (a, b) =>
      BRAZILIAN_STATE_CODES.indexOf(a.scope as never) -
      BRAZILIAN_STATE_CODES.indexOf(b.scope as never),
  )
  const oldest = snapshots
    .map((snapshot) => snapshot.collectedAt)
    .toSorted((a, b) => Date.parse(a) - Date.parse(b))[0]
  return {
    contractVersion: 1,
    kind: 'uf-summary',
    dataVersion,
    environment: 'local',
    sourceEnvironment: first.sourceEnvironment,
    round: first.round,
    office: 'president',
    scope: 'BR',
    availability: 'available',
    collectedAt: oldest,
    source: { file: SUMMARY_SOURCE_FILE },
    ufs: ordered.map(summarizeUf),
  }
}

export async function publishUfSummary(options: {
  publications: string
  prefix: string
  round: number
}) {
  const snapshots: ResultSnapshot[] = []
  for (const code of BRAZILIAN_STATE_CODES) {
    const channel = channelFor(
      options.prefix,
      { office: 'president', scope: code.toLowerCase() },
      options.round,
    )
    const publication = await readPublication(
      options.publications,
      channel,
      readResultSnapshotSchema,
    ).catch((error: unknown) => {
      if (error instanceof CollectorError && error.code === 'NOT_FOUND') {
        return undefined
      }
      throw error
    })
    if (publication) snapshots.push(publication.snapshot)
  }
  if (snapshots.length === 0) return { status: 'empty' as const, ufs: 0 }
  const summary = buildUfSummary(snapshots, randomUUID())
  const content = JSON.stringify(summary.ufs)
  const published = await publishDocument({
    root: options.publications,
    channel: summaryChannelFor(options.prefix, options.round),
    document: summary,
    schemas: { publish: publishUfSummarySchema, read: readUfSummarySchema },
    isUnchanged: (current) => JSON.stringify(current.ufs) === content,
  })
  return {
    status: published.status,
    ufs: snapshots.length,
    revision: published.manifest.revision,
  }
}
