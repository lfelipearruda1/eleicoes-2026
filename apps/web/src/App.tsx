import { ConfigurationNotice } from './features/president/components/ConfigurationNotice.tsx'
import { PresidentPage } from './features/president/components/PresidentPage.tsx'
import { readResultsConfig } from './features/president/resultsConfig.ts'

const config = readResultsConfig(import.meta.env, window.location.href)

export default function App() {
  if (config.status === 'invalid') {
    return <ConfigurationNotice problems={config.problems} />
  }
  return (
    <PresidentPage
      endpoint={config.endpoint}
      staleAfterMs={config.staleAfterMs}
    />
  )
}
