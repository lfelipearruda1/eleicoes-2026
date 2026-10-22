import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import { PresidentPage } from '../../src/features/president/components/PresidentPage.tsx'
import {
  availableSnapshot,
  fakeServer,
  manifestFor,
  TEST_ENDPOINT,
  TEST_STALE_AFTER_MS,
} from './fixtures.ts'

export function setupPresidentPage() {
  const page = { server: fakeServer() }

  beforeEach(() => {
    window.matchMedia = (query: string) =>
      ({ matches: query.includes('prefers-reduced-motion') }) as MediaQueryList
    window.location.hash = ''
    page.server = fakeServer()
    page.server.publish(manifestFor(availableSnapshot()), availableSnapshot())
  })

  afterEach(cleanup)

  const renderPage = async () => {
    const view = render(
      <PresidentPage
        endpoint={TEST_ENDPOINT}
        staleAfterMs={TEST_STALE_AFTER_MS}
        fetcher={page.server.fetcher}
      />,
    )
    await screen.findByRole('heading', { name: 'Presidente' })
    return view
  }

  const results = () =>
    within(
      screen.getByRole('region', {
        name: /^(Brasil|São Paulo|Distrito Federal)$/,
      }),
    )

  function ufSnapshot(
    office: 'president' | 'governor',
    scope: string,
    votes: string,
  ) {
    const snapshot = availableSnapshot({ office, scope })
    if (snapshot.availability !== 'available') throw new Error('available')
    return {
      ...snapshot,
      candidates: snapshot.candidates.map((candidate, index) =>
        index === 0
          ? { ...candidate, votes: votes.replace('.', '') }
          : candidate,
      ),
    } as typeof snapshot
  }

  function publishUf(
    scope: string,
    presidentVotes: string,
    governorVotes?: string,
  ) {
    const president = ufSnapshot('president', scope, presidentVotes)
    page.server.publish(manifestFor(president), president)
    if (!governorVotes) return
    const governor = ufSnapshot('governor', scope, governorVotes)
    page.server.publish(manifestFor(governor), governor)
  }

  return { page, renderPage, results, publishUf }
}
