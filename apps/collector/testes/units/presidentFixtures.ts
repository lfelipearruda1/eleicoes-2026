import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach } from 'vitest'

import { DEMO_CHANNEL, MANIFEST_FILE } from '../../src/constants.js'
import { DEMO_FIXTURES } from '../../src/president/demo.js'
import { publishResultCapture } from '../../src/president/publish.js'

export const OFFICIAL_CHANNEL = 'teste-oficial-presidente-br-2t'
export const OFFICIAL_URL =
  'https://resultados.tse.jus.br/oficial/ele2026/9002/dados/br/br-c0001-e009002-u.json'
export const candidate = (id: string, vap: string, pvap: string) => ({
  n: `9${id}`,
  sqcand: `90000000000${id}`,
  nmu: `CANDIDATURA SINTÉTICA ${id}`,
  vap,
  pvap,
})

export const rawResult = (overrides: Record<string, unknown> = {}) => ({
  ele: '9002',
  t: '2',
  cdabr: 'br',
  dg: '25/10/2026',
  hg: '18:00:00',
  idg: '103',
  dt: '25/10/2026',
  ht: '18:00:00',
  dv: 's',
  tf: 'n',
  and: 'p',
  carg: [
    {
      cd: '1',
      agr: [
        { par: [{ cand: [candidate('2', '0', '0,00')] }] },
        { par: [{ cand: [candidate('1', '6000', '33,33')] }] },
      ],
    },
  ],
  s: { ts: '400', st: '200', pst: '50,00' },
  v: { tv: '6100', vvc: '6000', vv: '6050' },
  ...overrides,
})

export function usePublishWorkspace() {
  const workspace = { directory: '', output: '' }

  beforeEach(async () => {
    workspace.directory = await mkdtemp(
      path.join(tmpdir(), 'eleicoes-president-'),
    )
    workspace.output = path.join(workspace.directory, 'publicacoes')
  })

  afterEach(async () => {
    await rm(workspace.directory, { recursive: true, force: true })
  })

  const fixture = (name: string) => path.join(DEMO_FIXTURES, name)
  const publishFixture = (name: string, channel = DEMO_CHANNEL) =>
    publishResultCapture({
      capture: fixture(name),
      output: workspace.output,
      channel,
    })
  const manifestText = (channel = DEMO_CHANNEL) =>
    readFile(path.join(workspace.output, channel, MANIFEST_FILE), 'utf8')

  async function copyFixture(
    name: string,
    edit: (metadata: Record<string, unknown>) => void,
  ) {
    const target = path.join(workspace.directory, `copia-${name}`)
    await cp(fixture(name), target, { recursive: true })
    const metadataPath = path.join(target, 'metadata.json')
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    edit(metadata)
    await writeFile(metadataPath, JSON.stringify(metadata))
    return target
  }

  async function officialCapture(requests: Record<string, unknown>[]) {
    const sourceDirectory = path.join(workspace.directory, 'tse', 'official')
    const runDirectory = path.join(sourceDirectory, 'run-2')
    await mkdir(path.join(sourceDirectory, 'run-1'), { recursive: true })
    await mkdir(runDirectory)
    const body = JSON.stringify(rawResult())
    await writeFile(path.join(sourceDirectory, 'run-1', 'result.json'), body)
    await writeFile(path.join(runDirectory, 'result.json'), body)
    await writeFile(
      path.join(runDirectory, 'metadata.json'),
      JSON.stringify({
        source: 'official',
        sourceEnvironment: 'oficial',
        office: 'president',
        round: 2,
        scope: 'br',
        requests,
        validation: 'valid',
        election: {
          cycle: 'ele2026',
          pleito: '9900',
          election: '9002',
          name: 'Eleição sintética 9002',
        },
        sampleOrigin: 'live',
      }),
    )
    return runDirectory
  }

  return {
    workspace,
    fixture,
    publishFixture,
    manifestText,
    copyFixture,
    officialCapture,
  }
}
