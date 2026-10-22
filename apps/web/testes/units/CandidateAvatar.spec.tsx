// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { summarizeCandidates } from '../../src/features/president/candidates.ts'
import { CandidateAvatar } from '../../src/features/president/components/CandidateAvatar.tsx'
import { PresidentCard } from '../../src/features/president/components/PresidentCard.tsx'
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
        tone="candidate1"
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
        tone="candidate2"
        isAhead={true}
        photoUrl="https://dados.example/publicacoes/fotos/2.jpeg"
      />,
    )

    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(container.querySelector('img')).toBeNull()
    expect(container.firstElementChild?.childElementCount).toBe(1)
  })
})

describe('PresidentCard', () => {
  it('deve mostrar cores e barra de percentuais no card de presidente', () => {
    const { container } = render(
      <PresidentCard summary={summarizeCandidates(availableSnapshot())} />,
    )

    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('deve tirar a barra de percentuais no card neutro do governador', () => {
    const { container } = render(
      <PresidentCard
        neutral
        title="Governador"
        summary={summarizeCandidates(availableSnapshot())}
      />,
    )

    expect(container.querySelector('svg')).toBeNull()
  })
})
