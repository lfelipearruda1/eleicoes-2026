# Contexto

Este documento é a porta de entrada do projeto. Ele explica o que estamos construindo, o que já existe no repositório e o que ainda é plano. Os detalhes ficam nos documentos ligados no [índice](#índice).

Não há `AGENTS.md` nem regras em `.cursor/rules/` neste repositório. O estado descrito abaixo foi conferido no código e nos arquivos de configuração em 14 de outubro de 2026.

## O que é o projeto

O eleicoes-2026 é um site para acompanhar os resultados oficiais do segundo turno das eleições de 2026. A atualização é periódica. O visitante vê o quadro presidencial no Brasil, escolhe uma unidade da Federação, inclusive o Distrito Federal, e acompanha a apuração presidencial naquela unidade. Onde a configuração oficial confirmar disputa de governador no segundo turno, o site também mostra esse resultado.

Um **snapshot** é um conjunto fechado de arquivos JSON produzido por nós, com os resultados já validados e normalizados. O navegador lê esses arquivos. Ele não calcula a eleição a partir da resposta bruta do Tribunal Superior Eleitoral (TSE).

## Problema

Divulgar apuração em tempo de pico pede duas coisas que se atrapalham com facilidade: fidelidade à origem oficial e distribuição para muitos leitores ao mesmo tempo. Consultar o TSE a partir de cada navegador repetiria a mesma leitura, gastaria o limite da origem e misturaria falha de rede do visitante com falha da apuração.

O desenho adotado concentra a leitura oficial num coletor, publica snapshots e deixa a rede de distribuição entregar as cópias. **CDN** (rede de entrega de conteúdo) é essa camada: ela guarda cópias dos arquivos em pontos próximos aos visitantes e responde dali enquanto a cópia ainda vale. O servidor que coleta não atende o público.

## Escopo inicial

- Visão nacional dos resultados presidenciais.
- Mapa do Brasil com seleção de unidade da Federação, incluindo o Distrito Federal.
- Resultado presidencial na unidade selecionada.
- Resultado para governador somente nas unidades em que a configuração oficial confirmar essa disputa no segundo turno.
- Votos, percentuais, andamento da apuração e indicação de atualização.
- Comportamento compreensível quando os dados faltam, falham ou envelhecem.

## Fora do escopo inicial

- Senado, deputados e eleições municipais.
- Cadastro e autenticação de visitantes.
- Previsão de resultado ou projeção estatística.
- Declaração própria de vencedor. O site não elege candidato por conta própria.
- Recursos administrativos que ainda não tenham sido especificados.
- Listas fixas de candidatos, de unidades com segundo turno ou de situações judiciais. Isso só entra se vier da configuração ou dos arquivos oficiais vigentes.

## Princípios

- **Simplicidade.** A primeira versão publica arquivos e os lê. Não cria serviços à espera de um problema.
- **Dados oficiais.** A origem da apuração é o TSE. Ambiente oficial e ambiente simulado não se misturam.
- **Integridade.** Resposta inválida não vira resultado publicado. A versão anterior válida permanece disponível.
- **Custo controlado.** O tráfego de leitura cai na CDN. O coletor é um processo pequeno, com um publicador ativo.
- **Distribuição por cache.** Atualizar números não exige gerar de novo o site. A política de cache é que define o atraso percebido.

## Como ler o estado de cada afirmação

| Rótulo | Significado |
| --- | --- |
| Decisão adotada | Escolha de arquitetura ou de produto definida para este projeto. |
| Implementado | Existe no repositório e foi conferido. |
| Planejado | Previsto, ainda sem implementação ou sem recurso provisionado. |
| Proposta | Detalhe sugerido, ainda sem validação. |
| Pendente | Informação necessária que ainda não foi confirmada. |
| Fora da primeira versão | Adiado de propósito. |

Uma decisão adotada não significa que o recurso já foi implementado ou provisionado.

## Dois fluxos

Há dois caminhos separados. Um publica números. O outro publica o site.

**Resultados.** O TSE é consultado pelo coletor em Node.js. O coletor valida e normaliza a resposta, grava snapshots JSON e, no destino planejado, envia esses arquivos ao Cloudflare R2. Um domínio próprio de resultados, com CDN e cache, entrega os arquivos ao navegador. No desenvolvimento inicial, o armazenamento ainda é local, no lugar do R2.

**Site.** O código do frontend é compilado com Vite e, no destino planejado, hospedado com Cloudflare Workers Static Assets. O navegador carrega essa aplicação e passa a ler os snapshots. Uma nova apuração não exige novo build do frontend.

O navegador não consulta o TSE. O visitante não usa o servidor do coletor para ver resultados. O coletor não é um servidor público de leitura. A primeira versão não depende de uma API dinâmica.

Três mecanismos parecidos precisam permanecer distintos:

1. **Workers Static Assets** hospeda os arquivos do frontend. Na documentação do produto, um arquivo que existe é entregue sem executar código de aplicação.
2. **Uma função Worker** é código executado a cada pedido compatível com a rota configurada. A primeira versão não coloca essa função no meio da leitura dos JSON.
3. **`apps/api`** seria, se um dia existir, um processo Node.js separado. Não é o runtime de Workers e não faz parte do caminho crítico.

**Polling** é a consulta periódica que o navegador fará à nossa camada pública, para perceber quando o manifesto apontar outra versão. Não é uma conexão permanente, e não é uma consulta ao TSE. O comportamento está descrito em [web/README.md](web/README.md). Os intervalos ainda não têm valor definido.

## Stack

| Tecnologia | Finalidade | Onde | Estado |
| --- | --- | --- | --- |
| TypeScript 6.0.3 | Linguagem principal | Monorepositório | Implementado |
| pnpm 12.11.2 e workspaces | Instalação e pacotes | Raiz | Implementado |
| Node.js 24.22.0 | Runtime | `.nvmrc` e `engines` (`>=24.22.0 <25`) | Implementado. A inicialização foi planejada com Node.js 24 LTS; o repositório fixa 24.22.0 |
| React 19.3.1 | Interface | `apps/web` | Implementado como base. As telas de resultado não existem |
| Vite 8.3.4 | Desenvolvimento e build do frontend | `apps/web` | Implementado |
| Tailwind CSS 4.3.3 | Estilo | `apps/web` | Implementado na folha inicial |
| SVG e GeoJSON | Mapa | `apps/web` | Decisão adotada. Não implementado. A fonte cartográfica está pendente |
| Node.js e TypeScript | Coleta | `apps/collector` | Ponto de entrada mínimo implementado. A coleta não existe |
| Zod 4.6.7 | Validação | `packages/validation` | Dependência instalada. Não há schemas |
| Vitest 5.0.4 | Testes compatíveis com a ferramenta | Raiz | Ferramenta configurada. A suíte não existe |
| k6 | Testes de carga futuros | `tests/load` | Planejado. A pasta só tem `.gitkeep` |
| Git e GitHub | Versionamento | Repositório | Git está em uso. Workflows de GitHub Actions ainda não existem |
| GitHub Actions | Testes e publicação automatizados | `.github/workflows` | Planejado. A pasta só tem `.gitkeep` |
| Cloudflare Workers Static Assets | Hospedagem do frontend | Cloudflare | Decisão adotada e planejada. Não provisionado |
| Cloudflare R2 | Armazenamento dos snapshots | Cloudflare | Planejado. Não provisionado |
| CDN da Cloudflare | Entrega e cache dos resultados | Domínio próprio associado ao R2 | Planejado. Não provisionado |
| Proteções da Cloudflare | WAF, limite de pedidos e proteção contra negação de serviço, conforme domínio, produto e plano | Caminhos públicos | Planejado. O plano está pendente |
| AWS EC2 e Docker | Execução contínua do coletor | AWS | Planejado. Não há Dockerfile nem instância |
| Sentry | Exceções | A definir | Planejado. Não é obrigação do primeiro dia |
| OpenTelemetry e Grafana | Métricas e observabilidade | A definir | Planejado. Não é obrigação do primeiro dia |
| NestJS e Fastify | API opcional em Node.js | `apps/api` | Fora da primeira versão |
| Redis, PostgreSQL, balanceador de carga, SSE, WebSocket e filas | Serviços sem requisito demonstrado | — | Fora da primeira versão |

## Responsabilidade de cada aplicação

**Web** (`apps/web`) mostra o mapa, os painéis e o estado da atualização. Lê somente o contrato publicado. Está descrita em [web/README.md](web/README.md).

**Coletor** (`apps/collector`) consulta a origem oficial, valida, normaliza, publica snapshots e preserva a última versão válida. Está descrito em [collector/README.md](collector/README.md).

**API** (`apps/api`) é uma possibilidade de evolução. A pasta existe e só contém `.gitkeep`. Não há `package.json`, framework nem endpoints. O papel possível está em [api/README.md](api/README.md).

## Monorepositório

O workspace está em `pnpm-workspace.yaml` e inclui `apps/*` e `packages/*`. Nenhum pacote depende de outro nesta etapa. `pnpm build` percorre os builds existentes na ordem do workspace.

| Caminho | Pacote | O que há hoje |
| --- | --- | --- |
| `apps/web` | `@eleicoes/web` | React, Vite e Tailwind. A tela exibe o título do ambiente inicial |
| `apps/collector` | `@eleicoes/collector` | `src/index.ts` registra que a integração com o TSE ainda não existe |
| `apps/api` | nenhum | Pasta reservada |
| `packages/types` | `@eleicoes/types` | Export vazio |
| `packages/election-data` | `@eleicoes/election-data` | Export vazio |
| `packages/validation` | `@eleicoes/validation` | Zod instalado, sem schemas |
| `docs/` | — | Esta documentação |
| `tests/load/` | — | Reservada para k6 |
| `infra/cloudflare/` | — | Reservada, sem configuração |
| `.github/workflows/` | — | Reservada, sem workflows |

Comandos já definidos na raiz: `pnpm dev:web`, `pnpm dev:collector`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm format:check` e `pnpm test`.

`pnpm test` executa o Vitest uma vez, fora do modo interativo, com `--passWithNoTests`. Esse comando aceita a ausência de testes. Ele não prova que uma suíte exista. Depois do build, `pnpm --filter @eleicoes/collector start` roda o JavaScript compilado do coletor.

Os arquivos `apps/web/.env.example` e `apps/collector/.env.example` apenas informam que as variáveis serão definidas numa etapa posterior. Não há valores de ambiente nesta fase.

## Fonte oficial

A fonte da apuração ao vivo são os arquivos JSON de divulgação do TSE, descritos em [dados/README.md](dados/README.md). O portal de dados abertos é outra publicação e não substitui essa divulgação.

O coletor é o único componente autorizado a falar com essa origem. O frontend nunca monta URL do TSE.

## Ambientes previstos

São três ambientes, todos ainda sem nuvem provisionada:

- **Desenvolvimento local.** Frontend com Vite, coletor com `tsx`, snapshots em disco.
- **Homologação.** Ensaio com Cloudflare e, depois, com o coletor na AWS. Homologação é o ambiente de prova, com dados e credenciais separados da produção. Serve para ver cache, CORS, proteção e recuperação antes de abrir o site ao público.
- **Produção.** O mesmo desenho da homologação, com domínio, credenciais e conjunto de dados próprios.

Ambiente oficial e ambiente simulado do TSE também são conjuntos diferentes. Um não publica no domínio do outro.

## Decisões adotadas

Cloudflare Workers Static Assets substitui Cloudflare Pages como destino planejado de hospedagem do frontend.

Não haverá load balancer próprio na arquitetura inicial, pois o tráfego público de leitura não será atendido pelo servidor do coletor.

A pasta apps/api é uma possibilidade de evolução. Sua existência não torna a API dinâmica obrigatória.

Também ficam adotados:

- Leitura pública por snapshots num domínio próprio associado ao R2, com cache configurado.
- Coletor em EC2 com Docker, fora do caminho das requisições dos visitantes.
- Um único publicador ativo na primeira versão.
- Ausência inicial de Redis, PostgreSQL e de função Worker obrigatória na leitura dos JSON.
- Sentry, OpenTelemetry e Grafana como ferramentas previstas, sem obrigação de subir essa estrutura no primeiro dia.

O README ainda descreve `infra/cloudflare` como pasta reservada para Cloudflare Pages, CDN e R2, e lista Pages entre os itens adiados. CDN e R2 continuam no planejamento. A menção a Pages fica superada pela decisão acima. O README não foi alterado nesta etapa, porque a tarefa era só documentar `docs/`.

Qualquer leitura em que API, Redis, PostgreSQL ou um balanceador próprio pareçam obrigatórios também fica superada. O próprio README já os colocava como adiados. Eles permanecem fora da primeira versão.

## Pendências principais

- Ler as especificações campo a campo dos arquivos do TSE, o manual de verificação JWS e os artigos 264 a 269 da Resolução TSE nº 23.751/2026.
- Confirmar códigos, URLs e a lista de disputas de governador na configuração oficial vigente antes de qualquer coleta.
- Definir domínios, plano da Cloudflare, região e tipo de instância, orçamento, intervalos, tempos de cache, retenção e metas de recuperação.
- Escolher a fonte do GeoJSON e o contrato mínimo que o normalizador vai emitir.
- Decidir o destino operacional dos logs quando o coletor sair da máquina local.

A tabela detalhada está em [dados/README.md](dados/README.md). A ordem de infraestrutura está em [infraestrutura/README.md](infraestrutura/README.md). A sequência de desenvolvimento, com dependências e critérios de saída, está em [planejamento/README.md](planejamento/README.md).

## Padrões de engenharia

O guia para o código novo está em [padroes/README.md](padroes/README.md). Ele cobre estilo, TypeScript, limite de abstração, performance, revisão, a API opcional, o coletor, a web, os pacotes compartilhados, consultas condicionais a banco, segurança de código e testes. Não altera a arquitetura deste documento e não implementa funcionalidade. Onde o código atual diverge do guia, o próprio guia registra a divergência.

## Planejamento

A sequência executável está em [planejamento/README.md](planejamento/README.md). O catálogo das etapas e o estado de cada uma estão em [planejamento/etapas/README.md](planejamento/etapas/README.md). O prompt que deve gerar os documentos individuais está em [planejamento/prompts/gerar-documentacao-das-etapas.md](planejamento/prompts/gerar-documentacao-das-etapas.md). Esse prompt não foi executado. Os arquivos de etapa ainda não existem.

A ordem numerada de [infraestrutura/README.md](infraestrutura/README.md) e as seis etapas de [collector/README.md](collector/README.md) continuam válidas como visão daqueles documentos. O planejamento as decompõe em ET-00 a ET-15. A arquitetura não muda.

Este apontamento foi escrito em 15 de outubro de 2026, a partir dos documentos e dos arquivos então presentes. A conferência de código citada no início deste contexto continua sendo a de 14 de outubro de 2026. A sessão de planejamento não reexecutou build, lint nem testes.

## Índice

- [Planejamento](planejamento/README.md)
- [Padrões de engenharia](padroes/README.md)
- [API opcional](api/README.md)
- [Coletor](collector/README.md)
- [Web](web/README.md)
- [Arquitetura](arquitetura/README.md)
- [Dados e integração com o TSE](dados/README.md)
- [Segurança](seguranca/README.md)
- [Infraestrutura](infraestrutura/README.md)
- [Testes](testes/README.md)

## Referências

Consultadas em 14 de outubro de 2026:

- TSE, informações técnicas sobre a divulgação de resultados 2026: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>
- Cloudflare Workers Static Assets, página com atualização indicada em 12 de outubro de 2026: <https://developers.cloudflare.com/workers/static-assets/>
- Cloudflare Pages, página com atualização indicada em 25 de agosto de 2026. A página pede para iniciar projetos novos com Workers e mantém Pages documentado: <https://developers.cloudflare.com/pages/>
- Cloudflare, guias de framework de Pages, página com atualização indicada em 21 de agosto de 2026: <https://developers.cloudflare.com/pages/framework-guides/>
