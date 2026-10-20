import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createPublicationsHandler } from '../../vite/publications.ts'

const SNAPSHOT = 'snapshots/0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d.json'

let workDirectory: string
let channelDirectory: string

beforeEach(async () => {
  workDirectory = await mkdtemp(path.join(tmpdir(), 'eleicoes-web-bridge-'))
  channelDirectory = path.join(workDirectory, 'canal')
  await mkdir(path.join(channelDirectory, 'snapshots'), { recursive: true })
  await writeFile(path.join(channelDirectory, 'manifest.json'), '{"m":1}')
  await writeFile(path.join(channelDirectory, SNAPSHOT), '{"s":1}')
  await writeFile(path.join(channelDirectory, '.publish.lock'), '')
  await writeFile(path.join(workDirectory, 'segredo.json'), '{"x":1}')
})

afterEach(async () => {
  await rm(workDirectory, { recursive: true, force: true })
})

function request(url: string, method = 'GET') {
  return new Promise<{ status: number; body: string; next: boolean }>(
    (resolve) => {
      const response = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        setHeader(name: string, value: string) {
          this.headers[name] = value
        },
        end(body?: Buffer) {
          resolve({
            status: this.statusCode,
            body: body?.toString() ?? '',
            next: false,
          })
        },
      }
      createPublicationsHandler(channelDirectory)(
        { url, method } as IncomingMessage,
        response as unknown as ServerResponse,
        () => resolve({ status: 0, body: '', next: true }),
      )
    },
  )
}

describe('createPublicationsHandler', () => {
  it('deve servir o manifesto do canal', async () => {
    const result = await request('/publications/manifest.json')

    expect(result).toMatchObject({ status: 200, body: '{"m":1}' })
  })

  it('deve servir um snapshot pelo caminho canônico', async () => {
    const result = await request(`/publications/${SNAPSHOT}`)

    expect(result).toMatchObject({ status: 200, body: '{"s":1}' })
  })

  it.each([
    '/publications/.publish.lock',
    '/publications/snapshots/',
    '/publications/../segredo.json',
    '/publications/%2e%2e/segredo.json',
    '/publications/manifest.json?x=1',
    '/publications/snapshots/0B7C9A52-3F1E-4D2A-9C4B-6E8F1A2B3C4D.json',
  ])('deve recusar %s sem expor arquivo', async (url) => {
    const result = await request(url)

    expect(result).toMatchObject({ status: 404, body: '' })
  })

  it('deve recusar escrita', async () => {
    const result = await request('/publications/manifest.json', 'POST')

    expect(result.status).toBe(405)
  })

  it('deve recusar snapshot que é link simbólico para fora do canal', async () => {
    await rm(path.join(channelDirectory, SNAPSHOT))
    await symlink(
      path.join(workDirectory, 'segredo.json'),
      path.join(channelDirectory, SNAPSHOT),
    )

    const result = await request(`/publications/${SNAPSHOT}`)

    expect(result.status).toBe(404)
  })

  it('deve passar adiante as rotas que não são de publicação', async () => {
    const result = await request('/src/main.tsx')

    expect(result.next).toBe(true)
  })
})
