# ET-00 — Base e prontidão

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-00 |
| Componente | Raiz do monorepositório, `apps/web`, `apps/collector`, `packages/*`, `docs/` |
| Tipo predominante | Investigação, com correções mínimas de configuração e documentação |
| Marco | M0 — Base pronta |
| Resultado concreto | Um registro de evidências diz quais comandos funcionam, em qual versão de Node e pnpm, como os pacotes compartilhados serão consumidos e quais divergências entre documentação e repositório foram corrigidas ou registradas. Quem começar ET-03 não precisa redescobrir a base |

## 2. Escopo e exclusões

**Faz:**

- Confere workspaces, versões declaradas e estrutura real.
- Executa os comandos já definidos e registra o resultado.
- Separa comandos existentes de comandos que ainda faltam.
- Decide como os apps vão consumir os pacotes do workspace (DP-18).
- Corrige divergências documentais de baixo risco, como a menção a Cloudflare Pages no README da raiz.
- Avalia a regra de lint que impede `else` no código novo (REV-004).
- Define onde as evidências de cada etapa serão registradas.

**Não faz:**

- Não refaz o scaffolding de `apps/web`, `apps/collector` nem dos pacotes.
- Não instala SDK de nuvem, Testing Library, ambiente DOM, Wrangler, k6 nem cliente S3. Cada um entra na etapa que o usa (ET-06, ET-07, ET-08, ET-13).
- Não cria schema, tipo eleitoral nem dependência entre pacotes. Isso é ET-03-T01.
- Não cria workflow de CI. O primeiro workflow mínimo pode nascer com a primeira suíte (ver [plano mestre](../plano-mestre.md#5-paralelismo-e-início-parcial)); a consolidação é ET-12.
- Não consulta o TSE.

## 3. Contexto e evidências

Inspeção de arquivos em 17/10/2026. Nenhum script da aplicação foi executado nesta inspeção.

| Evidência | O que se pode afirmar |
| --- | --- |
| [package.json](../../../package.json) | `packageManager` `pnpm@12.11.2`; `engines` Node `>=24.22.0 <25`; scripts `dev:web`, `dev:collector`, `build`, `typecheck`, `lint`, `format`, `format:check`, `test`. `test` é `vitest run --passWithNoTests` |
| [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) | Workspaces `apps/*` e `packages/*`; `allowBuilds` para `esbuild`; `minimumReleaseAgeExclude` para React 19.3.1 |
| [.nvmrc](../../../.nvmrc) | `24.22.0` |
| [tsconfig.base.json](../../../tsconfig.base.json) | `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `isolatedModules` |
| [eslint.config.mjs](../../../eslint.config.mjs) | Recomendados de ESLint e typescript-eslint sem tipos; hooks e refresh no web; Prettier por último. Sem regra contra `else`, sem regra contra `.only` |
| [packages/validation/package.json](../../../packages/validation/package.json) e equivalentes | `exports` apontam para `./dist/index.js`; nenhum app declara dependência de pacote do workspace |
| `apps/*/dist`, `packages/*/dist` | Existem localmente, ignorados pelo Git, com data de 14/10/2026 23:07. Indicam um build histórico. Não foi repetido |
| Shell de inspeção | `node -v` respondeu `v18.20.8`; `pnpm -v` falhou porque o corepack não encontrou `pnpm 12.11.2` no cache. `~/.nvm/versions/node/v24.22.0` existe. Ou seja: o ambiente padrão desta máquina não é o declarado; é preciso `nvm use` |
| [apps/collector/src/index.ts](../../../apps/collector/src/index.ts) | Só um `console.log`. COL-001 propõe `main.ts` como composição; divergência registrada em [collector/padroes-de-desenvolvimento.md](../../collector/padroes-de-desenvolvimento.md) |
| [README.md](../../../README.md) | Cita `infra/cloudflare` "para Cloudflare Pages" e lista Pages entre os adiados. Decisão vigente é DA-01 |
| Raiz | Não há `AGENTS.md` nem `.cursor/rules/`. Não há `vitest.config.*`. `.github/workflows/` só tem `.gitkeep` |

Documentos lidos: [contexto.md](../../contexto.md), [padroes/README.md](../../padroes/README.md), [revisao-de-codigo.md](../../padroes/revisao-de-codigo.md), [testes/README.md](../../testes/README.md).

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | Nenhuma etapa anterior | — |
| Recurso externo | Node 24.22.0 disponível via nvm na máquina de quem executa; pnpm 12.11.2 via corepack ou instalação equivalente | ET-00-T02 |
| Decisão | Nenhuma prévia. Esta etapa resolve DP-18 | — |

Todas as tarefas podem começar.

## 5. Entradas e saídas

**Entradas:** o repositório no estado do commit atual, sem alterações pendentes.

**Saídas:**

| Artefato | Consumidor |
| --- | --- |
| `docs/planejamento/evidencias/ET-00.md` (proposto): versões, comandos, resultados, divergências | Todas as etapas; o [catálogo](README.md) usa para mudar o estado da ET-00 |
| Decisão DP-18 registrada como `DA-NN` em [decisoes-e-riscos.md](../decisoes-e-riscos.md) | ET-03-T01 |
| README da raiz sem a menção a Pages como destino | Quem lê o projeto pela primeira vez |
| Regra de lint de STYLE-009, se aprovada | Todo código novo a partir de ET-03 |

## 6. Responsabilidades e fronteiras

A etapa não cria módulo de aplicação. A configuração da raiz (`package.json`, `eslint.config.mjs`) é a única área de código que pode mudar, e só nas tarefas T05 e T06. Os apps continuam sem depender um do outro.

## 7. Sequência de tarefas

### ET-00-T01 — Registrar versões e ferramentas efetivas da máquina de desenvolvimento

- **Tipo:** investigação
- **Resultado pretendido:** saber se quem desenvolve está na versão declarada antes de interpretar qualquer falha de comando.
- **Entradas e pré-requisitos:** acesso ao shell da máquina.
- **Ações:**
  1. Executar `nvm use` na raiz e registrar `node -v`.
  2. Registrar a versão de pnpm efetiva e como foi obtida (corepack ou outra).
  3. Comparar com `.nvmrc`, `engines` e `packageManager`.
  4. Registrar a diferença observada em 17/10/2026 (`v18.20.8` no shell padrão).
- **Responsabilidade e caminhos:** `docs/planejamento/evidencias/ET-00.md` (proposto).
- **Regras, falhas e bordas:** se o pnpm declarado não estiver disponível, registrar o erro textual e o passo usado para obtê-lo. Não alterar `packageManager` para acomodar a máquina.
- **Saída:** tabela de versões declaradas × efetivas.
- **Validações:** ET-00-V01
- **Concluída quando:** as versões efetivas batem com as declaradas, ou a diferença está registrada com o procedimento de correção.
- **Bloqueios ou aprovações:** nenhum.

### ET-00-T02 — Executar e classificar os comandos existentes

- **Tipo:** investigação
- **Resultado pretendido:** saber quais comandos passam hoje e o que cada um prova.
- **Entradas e pré-requisitos:** ET-00-T01.
- **Ações:**
  1. `pnpm install --frozen-lockfile` e conferir que `pnpm-lock.yaml` não mudou.
  2. `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, nessa ordem.
  3. Para cada um: comando, saída resumida, código de saída, data.
  4. Para `pnpm test`, registrar que o resultado com zero arquivos de teste não prova suíte.
  5. Rodar `pnpm --filter @eleicoes/collector start` depois do build e registrar a mensagem.
  6. Listar comandos que faltam: teste por pacote, verificação de bundle, execução única do coletor. Classificar como "proposto para criação futura" e indicar a etapa.
- **Responsabilidade e caminhos:** scripts em [package.json](../../../package.json), [apps/web/package.json](../../../apps/web/package.json), [apps/collector/package.json](../../../apps/collector/package.json).
- **Regras, falhas e bordas:** falha não é corrigida às cegas. Se a correção for de configuração e pequena, vira tarefa registrada (T06). Se tocar código de aplicação, fica para a etapa dona.
- **Saída:** tabela de comandos com classificação.
- **Validações:** ET-00-V02, ET-00-V03, ET-00-V04, ET-00-V05, ET-00-V06, ET-00-V07
- **Concluída quando:** cada comando tem resultado registrado ou falha explicada.
- **Bloqueios ou aprovações:** nenhum.

### ET-00-T03 — Decidir como os apps consomem os pacotes do workspace

- **Tipo:** investigação
- **Resultado pretendido:** DP-18 resolvida antes de ET-03 importar o primeiro schema.
- **Entradas e pré-requisitos:** ET-00-T02; leitura dos `package.json` e `tsconfig` dos pacotes e dos apps.
- **Ações:**
  1. Registrar o comportamento atual: `exports` para `dist`, `dist` ignorado, `moduleResolution` `bundler` no web e `NodeNext` no coletor.
  2. Avaliar as opções de DP-18 quanto a: ordem de `pnpm -r build`, `pnpm typecheck` sem build prévio, `pnpm dev:web` recarregando mudança do pacote, execução do coletor compilado em container (ET-09).
  3. Se necessário, fazer um experimento descartável fora do commit para confirmar o comportamento.
  4. Registrar a decisão em [decisoes-e-riscos.md](../decisoes-e-riscos.md) como `DA-NN` e marcar DP-18 como resolvida.
  5. Registrar também quando `--passWithNoTests` será retirado: proposta é na mesma mudança que adicionar o primeiro arquivo de teste (ET-03-T02).
- **Responsabilidade e caminhos:** decisão documental; a implementação é ET-03-T01.
- **Regras, falhas e bordas:** não declarar dependência `workspace:*` agora; isso altera lockfile sem consumidor. Risco R-17: tipo vindo de `dist` antigo.
- **Saída:** `DA-NN` nova; DP-18 marcada como resolvida.
- **Validações:** ET-00-V09
- **Concluída quando:** a decisão diz o que muda em `package.json`/`tsconfig`, em qual tarefa, e como evitar `dist` antigo.
- **Bloqueios ou aprovações:** nenhum.

### ET-00-T04 — Definir o registro de evidências das etapas

- **Tipo:** documentação
- **Resultado pretendido:** cada etapa sabe onde registrar comando, resultado e limitação.
- **Entradas e pré-requisitos:** nenhuma.
- **Ações:**
  1. Criar `docs/planejamento/evidencias/` (proposto) com um arquivo por etapa, criado quando a etapa começar.
  2. Definir as colunas mínimas: data, executor (ou "a designar"), comando ou ação, ambiente, resultado observado, limitação, link para artefato.
  3. Proibir colar segredo, token, identificador de conta ou corpo completo de resposta da origem.
- **Responsabilidade e caminhos:** `docs/planejamento/evidencias/README.md` (proposto).
- **Regras, falhas e bordas:** evidência histórica (como o `dist` de 14/10) é registrada como histórica e não repetida.
- **Saída:** convenção escrita e o primeiro arquivo `ET-00.md`.
- **Validações:** ET-00-V10
- **Concluída quando:** a convenção existe e T01–T03 já a usam.
- **Bloqueios ou aprovações:** nenhum.

### ET-00-T05 — Corrigir divergências documentais de baixo risco

- **Tipo:** documentação
- **Resultado pretendido:** nenhum documento de entrada aponta Cloudflare Pages como destino ou diz que os planos individuais não existem.
- **Entradas e pré-requisitos:** lista de divergências da seção 3.
- **Ações:**
  1. No [README.md](../../../README.md), trocar a descrição de `infra/cloudflare` para Workers Static Assets, R2 e cache, e retirar Pages da lista de adiados.
  2. Conferir se [contexto.md](../../contexto.md) e [arquitetura/README.md](../../arquitetura/README.md) ainda registram a divergência; atualizar a frase para "corrigida em ET-00".
  3. Registrar, sem corrigir, divergências que pertencem a outras etapas: `index.ts` × `main.ts` (ET-04-T14), regra de `.only` (ET-12-T01).
- **Responsabilidade e caminhos:** README da raiz e frases pontuais de `docs/`.
- **Regras, falhas e bordas:** não reescrever documentos inteiros; trocar só a frase divergente.
- **Saída:** diff documental pequeno.
- **Validações:** ET-00-V08
- **Concluída quando:** busca por "Pages" em README e `docs/` só encontra menções que dizem que Pages não é destino.
- **Bloqueios ou aprovações:** nenhum.

### ET-00-T06 — Avaliar e, se aprovada, ligar a regra de lint contra `else`

- **Tipo:** configuração
- **Resultado pretendido:** STYLE-009 deixa de depender só de revisão humana.
- **Entradas e pré-requisitos:** REV-004 em [revisao-de-codigo.md](../../padroes/revisao-de-codigo.md); ET-00-T02 com lint passando.
- **Ações:**
  1. Em arquivo de exemplo temporário, fora do commit, testar `no-restricted-syntax` com seletor `IfStatement[alternate]` contra: guarda com `return`, `if` com `else`, `else if`, `switch`.
  2. Confirmar que o código atual não tem `else`.
  3. Se o resultado for o esperado, adicionar a regra a [eslint.config.mjs](../../../eslint.config.mjs) para `apps/**` e `packages/**`, com mensagem que cite STYLE-009.
  4. Medir `pnpm lint` antes e depois.
- **Responsabilidade e caminhos:** [eslint.config.mjs](../../../eslint.config.mjs).
- **Regras, falhas e bordas:** se o seletor acusar algo que não seja `else`, não ligar; registrar o motivo e manter a revisão humana.
- **Saída:** regra ligada ou decisão registrada de não ligar.
- **Validações:** ET-00-V11
- **Concluída quando:** exemplo com `else` falha no lint, exemplo com guarda passa, e o repositório atual passa.
- **Bloqueios ou aprovações:** revisão normal. Não exige aprovação especial.

### ET-00-T07 — Classificar pendências por etapa bloqueada

- **Tipo:** documentação
- **Resultado pretendido:** o [catálogo](README.md) reflete o que realmente bloqueia cada etapa no momento em que ET-00 termina.
- **Entradas e pré-requisitos:** T01–T06; [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Ações:**
  1. Para cada `DP-NN`, confirmar se continua aberta e quais tarefas bloqueia.
  2. Atualizar a coluna de prontidão do catálogo somente onde houver mudança com evidência.
  3. Mudar o estado de implementação da ET-00 somente com as evidências de T01–T06.
- **Responsabilidade e caminhos:** [etapas/README.md](README.md), [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Regras, falhas e bordas:** não marcar etapa como concluída por ter arquivo no repositório.
- **Saída:** catálogo atualizado.
- **Validações:** ET-00-V12
- **Concluída quando:** cada linha alterada do catálogo cita a evidência.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

Nenhum contrato de dados é criado. A decisão de DP-18 afeta como o contrato de ET-02 será distribuído: o schema em `@eleicoes/validation` precisa ser importável pelo coletor (Node) e pelo web (Vite) sem duplicação. A decisão não pode exigir que o web importe código do coletor (PKG-001).

## 9. Segurança, integridade e performance

- R-18: versão de Node diferente da declarada produz falha ou comportamento diferente. Controle: T01.
- R-17: `--passWithNoTests` e `dist` antigo dão falsa confiança. Controle: T02 registra a ressalva; T03 define a retirada.
- R-21: documentação aponta Pages. Controle: T05.
- `pnpm install --frozen-lockfile` evita mudança silenciosa de dependência (SEC-008).
- A etapa não lê `.env` nem segredo. Os `.env.example` atuais não têm variáveis.

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-00-V01 | Versões efetivas | Shell novo na raiz | `nvm use`; `node -v`; `pnpm -v` | Node 24.22.0 e pnpm 12.11.2, ou diferença registrada com correção | Versão diferente sem registro | Verificação operacional | Local | T01 |
| ET-00-V02 | Instalação reproduzível | V01 aprovada | `pnpm install --frozen-lockfile`; `git status` | Instala sem alterar `pnpm-lock.yaml` | Lockfile alterado ou instalação falha sem causa registrada | Integração | Local | T02 |
| ET-00-V03 | Build | V02 | `pnpm build` | Código 0; `dist` gerado nos cinco pacotes | Código diferente de 0 sem causa registrada | Integração | Local | T02 |
| ET-00-V04 | Tipos | V02 | `pnpm typecheck` | Código 0 | Erro de tipo não registrado | Integração | Local | T02 |
| ET-00-V05 | Lint | V02 | `pnpm lint` | Código 0 | Erro não registrado | Integração | Local | T02 |
| ET-00-V06 | Formatação | V02 | `pnpm format:check` | Código 0, ou arquivos divergentes listados | Divergência não registrada | Integração | Local | T02 |
| ET-00-V07 | Ressalva da suíte vazia | V02 | `pnpm test` | Resultado registrado com a nota "zero arquivos de teste; não é evidência de suíte" | Registro apresenta o resultado como suíte aprovada | Verificação operacional | Local | T02 |
| ET-00-V08 | Divergência de Pages | T05 aplicada | Busca textual por "Pages" em `README.md` e `docs/` | Toda ocorrência diz que Pages não é destino | Alguma ocorrência apresenta Pages como destino | Revisão | Local | T05 |
| ET-00-V09 | Decisão de resolução de pacotes | T03 | Ler a `DA-NN` criada | Diz o que muda, em qual tarefa, como `typecheck` e `dev` se comportam e como evitar `dist` antigo | Decisão sem efeito verificável ou que faça o web importar o coletor | Revisão | Documento | T03 |
| ET-00-V10 | Convenção de evidências | T04 | Ler `evidencias/README.md` (proposto) | Colunas definidas e proibição de segredo explícita | Ausência de proibição de segredo | Revisão | Documento | T04 |
| ET-00-V11 | Regra contra `else` | T06, exemplos temporários | `pnpm lint` nos exemplos e no repositório | Exemplo com `else` e com `else if` falha; guarda e `switch` passam; repositório passa | Falso positivo em `switch`/guarda, ou `else` passa | Integração | Local | T06 |
| ET-00-V12 | Catálogo coerente | T07 | Conferir cada linha alterada do catálogo | Toda mudança cita evidência | Estado alterado sem evidência | Revisão | Documento | T07 |

Esses níveis provam o estado da máquina e da configuração. Não provam funcionalidade: não há funcionalidade a provar nesta etapa.

## 11. Infraestrutura e ações externas

Não se aplica. A etapa não usa conta, domínio, nuvem nem rede além do registro de pacotes durante `pnpm install`.

## 12. Falha, reversão e recuperação

- **Código e configuração:** T05 e T06 são mudanças pequenas, reversíveis por `git revert`. Se a regra de lint quebrar o fluxo, reverter só a regra.
- **Dados:** não há.
- **Ambiente local:** se `pnpm install` falhar, não apagar `pnpm-lock.yaml`. Registrar o erro e corrigir a versão de Node ou pnpm.

## 13. Critérios de conclusão

- [ ] Versões efetivas registradas e iguais às declaradas, ou diferença com procedimento escrito (V01).
- [ ] Os oito comandos existentes executados e classificados (V02–V07).
- [ ] DP-18 resolvida como `DA-NN` (V09).
- [ ] Convenção de evidências criada (V10).
- [ ] README da raiz sem Pages como destino (V08).
- [ ] Regra contra `else` ligada ou recusa registrada (V11).
- [ ] Catálogo atualizado com evidência (V12).

## 14. Pendências e passagem adiante

- Nenhuma pendência externa bloqueia esta etapa.
- ET-01 recebe: convenção de evidências e a confirmação de que a base roda.
- ET-03 recebe: decisão de DP-18 e a regra de quando retirar `--passWithNoTests`.
- ET-12 recebe: lista de verificações automáticas que faltam (`.only`, auditoria de dependência).

## 15. Brief de execução

Confirmar a base antes de escrever código. Rodar os comandos existentes na versão declarada, registrar resultados em `docs/planejamento/evidencias/ET-00.md`, decidir como os apps consumirão os pacotes (DP-18), corrigir a menção a Pages no README e avaliar a regra de lint contra `else`. Não instalar SDK, não criar schema, não criar workflow, não consultar o TSE. Validações V01–V12. Referências: [revisao-de-codigo.md](../../padroes/revisao-de-codigo.md), [padroes/README.md](../../padroes/README.md).
