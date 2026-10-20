import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'

import { publicationsBridge } from './vite/publications.ts'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))

const publicationsRoot =
  process.env.ELEICOES_PUBLICATIONS_DIR ??
  path.join(repositoryRoot, '.local/publications')
const channel =
  process.env.ELEICOES_CHANNEL ?? 'demo-sintetico-presidente-br-2t'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    publicationsBridge({ root: publicationsRoot, channel }),
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
})
