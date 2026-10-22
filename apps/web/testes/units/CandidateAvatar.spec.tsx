// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { summarizeCandidates } from '../../src/features/president/candidates.ts'
import { CandidateAvatar } from '../../src/features/president/components/CandidateAvatar.tsx'
import { availableSnapshot } from './fixtures.ts'

afterEach(cleanup)

const PHOTO_ROOT = new URL('https://dados.example/publicacoes/')

const withPhoto = () => {
  const snapshot = availableSnapshot()
  return {
    ...snapshot,
    candidates: snapshot.candidates.map((candidate, index) =>
      index === 0
        ? { ...candidate, photo: `fotos/${candidate.candidateId}.jpeg` }
        : candidate,
    ),
  } as typeof snapshot
}

describe('summarizeCandidates: foto', () => {
  it('deve resolver a foto contra a raiz das publicações', () => {
    const summary = summarizeCandidates(withPhoto(), PHOTO_ROOT)

    expect(summary.rows[0]?.photoUrl).toBe(
      'https://dados.example/publicacoes/fotos/900000000001.jpeg',
    )
    expect(summary.rows[1]).not.toHaveProperty('photoUrl')
  })

  it('deve não montar URL de foto sem a raiz das publicações', () => {
    const summary = summarizeCandidates(withPhoto())

    expect(summary.rows[0]).not.toHaveProperty('photoUrl')
  })
})

describe('CandidateAvatar', () => {
  it('deve mostrar a foto dentro do anel da candidatura', () => {
    const { container } = render(
      <CandidateAvatar
        isAhead={false}
        photoUrl="https://dados.example/publicacoes/fotos/1.jpeg"
      />,
    )

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://dados.example/publicacoes/fotos/1.jpeg',
    )
  })

  it('deve voltar ao círculo sem foto quando a imagem falha', () => {
    const { container } = render(
      <CandidateAvatar
        isAhead={true}
        photoUrl="https://dados.example/publicacoes/fotos/2.jpeg"
      />,
    )

    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(container.querySelector('img')).toBeNull()
    expect(container.firstElementChild?.childElementCount).toBe(1)
  })
})
