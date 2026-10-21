import type { Transport } from '../../src/tse/http.js'
import { itemAt } from './itemAt.js'

export const PRESIDENT_BR = { office: 'president', scope: 'br' } as const
export const HOST = 'resultados.tse.jus.br'
export const RESULT_URL = `https://${HOST}/oficial/ele2026/9002/dados/br/br-c0001-e009002-u.json`

export const syntheticElection = (cd: string, t: string, offices = ['1']) => ({
  cd,
  nm: `Eleição sintética ${cd}`,
  t,
  abr: [{ cd: 'br', cp: offices.map((office) => ({ cd: office })) }],
})

export const syntheticConfig = (
  elections = [syntheticElection('9001', '1'), syntheticElection('9002', '2')],
) => ({
  arq: [{ tp: 'u', dir: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>' }],
  pl: [{ cd: '9900', c: 'ele2026', e: elections }],
})

export const syntheticCandidate = (sqcand: string, vap: string) => ({
  n: sqcand.slice(-2),
  sqcand,
  nmu: `CANDIDATURA SINTÉTICA ${sqcand}`,
  vap,
  pvap: '0,00',
})

export const syntheticResult = (overrides: Record<string, unknown> = {}) => ({
  ele: '9002',
  t: '2',
  cdabr: 'br',
  dg: '25/10/2026',
  hg: '17:00:00',
  idg: '1',
  dt: '25/10/2026',
  ht: '17:00:00',
  dv: 's',
  tf: 'n',
  and: 'p',
  carg: [
    {
      cd: '1',
      agr: [
        { par: [{ cand: [syntheticCandidate('900000000001', '0')] }] },
        { par: [{ cand: [syntheticCandidate('900000000002', '0')] }] },
      ],
    },
  ],
  s: { ts: '100', st: '0', pst: '0,00' },
  v: { tv: '0', vvc: '0', vv: '0' },
  ...overrides,
})

export const firstCandidate = (document: ReturnType<typeof syntheticResult>) =>
  itemAt(itemAt(itemAt(itemAt(document.carg, 0).agr, 0).par, 0).cand, 0)

export const json = (
  body: unknown,
  headers: Record<string, string> = {},
): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })

export function fakeTransport(
  responder: (url: string, headers: Record<string, string>) => Response,
) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const transport: Transport = async (url, init) => {
    const headers = (init.headers ?? {}) as Record<string, string>
    calls.push({ url, headers })
    return responder(url, headers)
  }
  return { transport, calls }
}

export const tseResponder = (result: () => Response) => (url: string) =>
  url.endsWith('ele-c.json')
    ? json(syntheticConfig(), { etag: '"config-1"' })
    : result()
