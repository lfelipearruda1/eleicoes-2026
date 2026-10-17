# eleicoes-2026

Ambiente inicial para o site de acompanhamento do segundo turno das eleições de 2026. Esta etapa deixa o monorepo e as ferramentas prontos para desenvolvimento. A aplicação ainda não está implementada.

## Pré-requisitos

- Node.js 24.22.0, registrada em `.nvmrc`. A faixa compatível é `>=24.22.0 <25`.
- pnpm 12.11.2, registrada em `packageManager`.

Na raiz do repositório, `nvm use` seleciona o Node deste projeto. A versão padrão da máquina não é alterada.

## Versões adotadas

- React 19.3.1 e React DOM 19.3.1
- Vite 8.3.4 e `@vitejs/plugin-react` 6.1.2
- Tailwind CSS 4.3.3 e `@tailwindcss/vite` 4.3.3
- TypeScript 6.0.3
- Zod 4.6.7
- tsx 4.23.15
- ESLint 10.12.0 e typescript-eslint 8.71.2
- Prettier 3.9.10
- Vitest 5.0.4

TypeScript 6.0.3 é a versão estável mais recente aceita por typescript-eslint 8.71.2. O TypeScript 7.0.2 já existe, mas esse ESLint ainda declara suporte apenas até a linha 6.0.

## Pastas

- `apps/web`: frontend estático com React, Vite e Tailwind CSS.
- `apps/collector`: processo Node.js do coletor, com um ponto de entrada mínimo.
- `apps/api`: reservada. A API opcional não foi configurada.
- `packages/types`: pacote TypeScript compartilhado, ainda sem tipos.
- `packages/election-data`: pacote TypeScript compartilhado, ainda sem dados.
- `packages/validation`: pacote TypeScript com Zod instalado, ainda sem schemas.
- `docs`: reservada para a documentação.
- `tests/load`: reservada para testes de carga.
- `infra/cloudflare`: reservada para a configuração futura de Cloudflare Workers Static Assets (site), R2 e cache (resultados). Cloudflare Pages não é destino.
- `.github/workflows`: reservada para CI.

## Comandos

```sh
pnpm dev:web
pnpm dev:collector
pnpm build
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test
```

`pnpm build` executa o build de cada pacote na ordem das dependências do workspace. Nenhum pacote depende de outro nesta etapa.

O coletor em desenvolvimento usa `tsx`. Depois do build, `pnpm --filter @eleicoes/collector start` executa o JavaScript compilado com Node.js.

## Testes

A suíte funcional ainda não existe. `pnpm test` roda o Vitest uma vez, fora do modo interativo, e aceita a ausência de testes com `--passWithNoTests`.

## Adiado

- Integração com o TSE, snapshots e regras eleitorais
- Mapa, resultados e navegação
- API, Redis e PostgreSQL
- Cloudflare Workers Static Assets, R2 e cache
- CI, Docker e testes de carga

Capacidade e resiliência ficam para etapas posteriores.
