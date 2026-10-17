import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // DA-17: pacotes do workspace resolvem para a fonte, sem depender de dist.
  resolve: { conditions: ['source', ...defaultClientConditions] },
})
