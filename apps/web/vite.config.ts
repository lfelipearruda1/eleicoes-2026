import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig, loadEnv } from 'vite'

import { publicationsBridge } from './vite/publications.ts'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'ELEICOES_'),
    ...process.env,
  }
  const publicationsRoot =
    env.ELEICOES_PUBLICATIONS_DIR ||
    path.join(repositoryRoot, '.local/publications')

  return {
    plugins: [
      react(),
      tailwindcss(),
      publicationsBridge({ root: publicationsRoot }),
    ],
    resolve: { conditions: ['source', ...defaultClientConditions] },
    server: {
      host: '127.0.0.1',
      fs: {
        allow: ['apps/web', 'packages', 'node_modules'].map((entry) =>
          path.join(repositoryRoot, entry),
        ),
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local/**'],
      },
    },
  }
})
