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
  return new Promise<{
    status: number
    body: string
    next: boolean
    headers?: Record<string, string>
  }>((resolve) => {
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
          headers: this.headers,
        })
      },
    }
    createPublicationsHandler(workDirectory)(
      { url, method } as IncomingMessage,
      response as unknown as ServerResponse,
      () => resolve({ status: 0, body: '', next: true }),
    )
  })
}

describe('createPublicationsHandler', () => {
  it('deve servir o manifesto do canal', async () => {
    const result = await request('/publications/canal/manifest.json')

    expect(result).toMatchObject({ status: 200, body: '{"m":1}' })
  })

  it('deve servir um snapshot pelo caminho canônico', async () => {
    const result = await request(`/publications/canal/${SNAPSHOT}`)

    expect(result).toMatchObject({ status: 200, body: '{"s":1}' })
  })

  it.each([
    '/publications/canal/.publish.lock',
    '/publications/canal/snapshots/',
    '/publications/canal/../segredo.json',
    '/publications/canal/%2e%2e/segredo.json',
    '/publications/canal/manifest.json?x=1',
    '/publications/canal/snapshots/0B7C9A52-3F1E-4D2A-9C4B-6E8F1A2B3C4D.json',
    '/publications/segredo.json',
    '/publications/manifest.json',
    '/publications/Canal/manifest.json',
    '/publications/../canal/manifest.json',
    '/publications/%2e%2e/canal/manifest.json',
    '/publications/canal_x/manifest.json',
    `/publications/${'a'.repeat(65)}/manifest.json`,
  ])('deve recusar %s sem expor arquivo', async (url) => {
    const result = await request(url)

    expect(result).toMatchObject({ status: 404, body: '' })
  })

  it('deve servir a foto da candidatura como JPEG', async () => {
    await mkdir(path.join(workDirectory, 'fotos'))
    await writeFile(
      path.join(workDirectory, 'fotos', '70002553055.jpeg'),
      'jpeg',
    )

    const result = await request('/publications/fotos/70002553055.jpeg')

    expect(result.status).toBe(200)
    expect(result.headers?.['Content-Type']).toBe('image/jpeg')
  })

  it.each(['fotos/a.jpeg', 'fotos/1.png', 'fotos/../segredo.json'])(
    'deve recusar caminho de foto fora do padrão: %s',
    async (file) => {
      await mkdir(path.join(workDirectory, 'fotos'))
      await writeFile(path.join(workDirectory, 'fotos', 'a.jpeg'), 'jpeg')

      const result = await request(`/publications/${file}`)

      expect(result.status).toBe(404)
    },
  )

  it('deve recusar escrita', async () => {
    const result = await request('/publications/canal/manifest.json', 'POST')

    expect(result.status).toBe(405)
  })

  it('deve recusar snapshot que é link simbólico para fora do canal', async () => {
    await rm(path.join(channelDirectory, SNAPSHOT))
    await symlink(
      path.join(workDirectory, 'segredo.json'),
      path.join(channelDirectory, SNAPSHOT),
    )

    const result = await request(`/publications/canal/${SNAPSHOT}`)

    expect(result.status).toBe(404)
  })

  it('deve servir outro canal da mesma raiz', async () => {
    const other = path.join(workDirectory, 'outro-canal')
    await mkdir(other)
    await writeFile(path.join(other, 'manifest.json'), '{"o":1}')

    const result = await request('/publications/outro-canal/manifest.json')

    expect(result).toMatchObject({ status: 200, body: '{"o":1}' })
  })

  it('deve recusar canal que é link simbólico para fora da raiz', async () => {
    const outside = await mkdtemp(path.join(tmpdir(), 'eleicoes-fora-'))
    await writeFile(path.join(outside, 'manifest.json'), '{"x":1}')
    await symlink(outside, path.join(workDirectory, 'atalho'))

    const result = await request('/publications/atalho/manifest.json')

    await rm(outside, { recursive: true, force: true })
    expect(result.status).toBe(404)
  })

  it('deve passar adiante as rotas que não são de publicação', async () => {
    const result = await request('/src/main.tsx')

    expect(result.next).toBe(true)
  })
})
