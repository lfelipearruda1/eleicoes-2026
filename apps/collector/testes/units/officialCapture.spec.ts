import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { publishResultCapture } from '../../src/president/publish.js'
import { errorOf } from './failures.js'
import {
  OFFICIAL_CHANNEL,
  OFFICIAL_URL,
  candidate,
  rawResult,
  usePublishWorkspace,
} from './presidentFixtures.js'

describe('publishResultCapture: captura oficial', () => {
  const { workspace, officialCapture } = usePublishWorkspace()

  it('deve publicar captura oficial de governador com a situação dos votos', async () => {
    const sourceDirectory = path.join(workspace.directory, 'tse', 'official')
    const runDirectory = path.join(sourceDirectory, 'run-gov')
    await mkdir(runDirectory, { recursive: true })
    const governor = rawResult({
      cdabr: 'df',
      carg: [
        {
          cd: '3',
          agr: [
            {
              par: [
                {
                  cand: [
                    { ...candidate('1', '6000', '60,00'), dvt: 'Válido' },
                    {
                      ...candidate('2', '4000', '40,00'),
                      dvt: 'Anulado sub judice',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    await writeFile(
      path.join(runDirectory, 'result.json'),
      JSON.stringify(governor),
    )
    await writeFile(
      path.join(runDirectory, 'metadata.json'),
      JSON.stringify({
        source: 'official',
        office: 'governor',
        round: 2,
        scope: 'df',
        validation: 'valid',
        election: {
          cycle: 'ele2026',
          pleito: '9900',
          election: '9002',
          name: 'Eleição sintética 9002',
        },
        requests: [
          {
            url: 'https://resultados.tse.jus.br/oficial/ele2026/9002/dados/df/df-c0003-e009002-u.json',
            requestedAt: '2026-10-25T21:00:00Z',
            status: 200,
          },
        ],
      }),
    )

    const result = await publishResultCapture({
      capture: runDirectory,
      output: workspace.output,
      channel: 'teste-oficial-governador-df-2t',
    })

    expect(result.snapshot).toMatchObject({
      office: 'governor',
      scope: 'DF',
      source: { file: 'ele2026/9002/dados/df/df-c0003-e009002-u.json' },
      candidates: [
        { candidateId: '900000000001', voteDestination: 'valid' },
        { candidateId: '900000000002', voteDestination: 'annulled_sub_judice' },
      ],
    })
  })

  it('deve identificar a captura oficial pela URL e pelo horário da consulta', async () => {
    const capture = await officialCapture([
      {
        url: OFFICIAL_URL,
        requestedAt: '2026-10-25T21:00:01.500Z',
        status: 200,
      },
    ])

    const result = await publishResultCapture({
      capture,
      output: workspace.output,
      channel: OFFICIAL_CHANNEL,
    })

    expect(result.snapshot).toMatchObject({
      sourceEnvironment: 'official',
      collectedAt: '2026-10-25T21:00:01.500Z',
      source: { file: 'ele2026/9002/dados/br/br-c0001-e009002-u.json' },
      origin: { electionCode: '9002', generationId: '103' },
    })
  })

  it('deve resolver a cópia reaproveitada por 304 numa execução anterior', async () => {
    const capture = await officialCapture([
      {
        url: OFFICIAL_URL,
        requestedAt: '2026-10-25T21:05:00Z',
        status: 304,
        reusedCapture: 'run-1/result.json',
      },
    ])
    await rm(path.join(capture, 'result.json'))

    const result = await publishResultCapture({
      capture,
      output: workspace.output,
      channel: OFFICIAL_CHANNEL,
    })

    expect(result.status).toBe('published')
  })

  it('deve recusar 304 sem referência à cópia reaproveitada', async () => {
    const capture = await officialCapture([
      { url: OFFICIAL_URL, requestedAt: '2026-10-25T21:05:00Z', status: 304 },
    ])

    const error = await errorOf(
      publishResultCapture({
        capture,
        output: workspace.output,
        channel: OFFICIAL_CHANNEL,
      }),
    )

    expect(error.code).toBe('INVALID_CAPTURE')
  })

  it('deve recusar 304 do resultado que aponta para a cópia da configuração', async () => {
    const capture = await officialCapture([
      {
        url: OFFICIAL_URL,
        requestedAt: '2026-10-25T21:05:00Z',
        status: 304,
        reusedCapture: 'run-1/config.json',
      },
    ])

    const error = await errorOf(
      publishResultCapture({
        capture,
        output: workspace.output,
        channel: OFFICIAL_CHANNEL,
      }),
    )

    expect(error.code).toBe('INVALID_CAPTURE')
  })

  it('deve recusar referência de 304 que sai do diretório da origem', async () => {
    const capture = await officialCapture([
      {
        url: OFFICIAL_URL,
        requestedAt: '2026-10-25T21:05:00Z',
        status: 304,
        reusedCapture: '../fora/result.json',
      },
    ])

    const error = await errorOf(
      publishResultCapture({
        capture,
        output: workspace.output,
        channel: OFFICIAL_CHANNEL,
      }),
    )

    expect(error.code).toBe('INVALID_CAPTURE')
  })
})
