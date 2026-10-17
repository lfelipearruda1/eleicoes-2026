# Decisões e riscos

[Planejamento](README.md) · [Plano mestre](plano-mestre.md) · [Catálogo das etapas](etapas/README.md) · [Rastreabilidade](rastreabilidade.md)

Este registro separa três coisas: decisões já adotadas, decisões ainda pendentes e riscos. Uma decisão adotada não significa recurso implementado nem provisionado. Os rótulos de estado do projeto estão em [contexto.md](../contexto.md).

Registro revisado em 17 de outubro de 2026, a partir da documentação de `docs/` e da inspeção do repositório. Nenhuma fonte externa foi consultada nesta revisão. As datas e os números atribuídos ao TSE vêm de [dados/README.md](../dados/README.md), que registra consulta feita em 14 de outubro de 2026. Eles não foram reconfirmados aqui.

## Convenções

| Prefixo | Significado | Regra |
| --- | --- | --- |
| `DA-NN` | Decisão adotada | Escolha definida, com justificativa e consequência. Muda só por nova decisão registrada aqui |
| `DP-NN` | Decisão pendente | Pergunta específica que bloqueia tarefas nomeadas. Ao ser resolvida, vira `DA-NN` nova, e a linha pendente recebe "Resolvida por DA-NN", sem ser apagada |
| `R-NN` | Risco | Causa, impacto, controle, validação, etapa responsável e risco remanescente |

Os identificadores são deste planejamento. Não substituem os identificadores de regra já existentes (`SEC-`, `COL-`, `WEB-`, `PKG-`, `PERF-`, `TEST-`, `STYLE-`, `REV-`, `CC-`, `DATA-`), que continuam nos guias de origem.

"A designar" indica que o nome do responsável não está disponível no repositório. Não é decisão tomada.

Autorização explícita é exigida somente onde há impacto real de segurança, custo, dados ou exposição pública. Tarefas de código e documentação seguem a revisão normal de [revisao-de-codigo.md](../padroes/revisao-de-codigo.md).

## Decisões adotadas

| ID | Decisão | Justificativa | Consequência | Fonte |
| --- | --- | --- | --- | --- |
| DA-01 | Cloudflare Workers Static Assets hospeda o frontend. Cloudflare Pages não é destino | A Cloudflare orienta projetos novos a começar com Workers | O build do Vite é publicado como assets, sem Pages Functions. A menção a Pages no [README da raiz](../../README.md) foi corrigida em ET-00 | [arquitetura/README.md](../arquitetura/README.md) |
| DA-02 | Leitura pública dos resultados por snapshots JSON no R2, atrás de domínio próprio com cache. `r2.dev` não é caminho público | O pico é leitura repetida do mesmo conteúdo. `r2.dev` não oferece cache nem WAF | Regras de cache para JSON precisam ser criadas. Caminho alternativo precisa ser desligado ou restrito | [infraestrutura/README.md](../infraestrutura/README.md) |
| DA-03 | O coletor roda em EC2 com Docker, fora do caminho do visitante. Não vira Worker | Processo contínuo com saída para o TSE e para o R2 | Há uma máquina para operar; sem balanceador | [arquitetura/README.md](../arquitetura/README.md) |
| DA-04 | Um único publicador ativo por ambiente na primeira versão | Duas escritas concorrentes quebram a ordem versão → manifesto | Instância única é ponto de falha da atualização, não da leitura | [collector/README.md](../collector/README.md) |
| DA-05 | API NestJS + Fastify, PostgreSQL, Redis, balanceador, SSE, WebSocket, filas e função Worker na leitura ficam fora da primeira versão | Os painéis cabem em arquivos | Nenhuma etapa ET-00 a ET-15 cria esses componentes. Critérios de entrada em [api/README.md](../api/README.md) | [contexto.md](../contexto.md) |
| DA-06 | Versão publicada é conjunto imutável. O manifesto é o único ponteiro móvel, atualizado por último. Falha conserva o ponteiro anterior | Evita manifesto apontando para conjunto incompleto | Publicador local e publicador R2 seguem a mesma ordem (COL-005) | [collector/padroes-de-desenvolvimento.md](../collector/padroes-de-desenvolvimento.md) |
| DA-07 | Assets do site, manifesto e snapshots versionados têm políticas de cache distintas | Arquivo imutável aceita cache longo; o ponteiro não | Os tempos continuam pendentes (DP-17) | [infraestrutura/README.md](../infraestrutura/README.md) |
| DA-08 | Ordem: fluxo local → coletor no computador publicando na Cloudflare de homologação → coletor na AWS | Prova contrato e publicação antes de operar máquina | ET-08 antecede ET-10 | [infraestrutura/README.md](../infraestrutura/README.md) |
| DA-09 | Stack: pnpm workspaces, React + Vite + TypeScript + Tailwind no web, Node.js + TypeScript no coletor, Zod em `@eleicoes/validation`, Vitest, k6 para carga futura | Já instalada ou adotada no repositório | Biblioteca nova exige justificativa (SEC-008) | [README](../../README.md), [package.json](../../package.json) |
| DA-10 | Mapa em SVG com GeoJSON. Sem biblioteca nova de estado, roteamento ou mapa | Evita dependência sem necessidade demonstrada | A fonte cartográfica é DP-29 | [web/README.md](../web/README.md) |
| DA-11 | Coletor organizado em módulos por responsabilidade, sem NestJS, com composição em `main.ts` | Processo único, sem HTTP público | COL-001 e COL-002 | [collector/padroes-de-desenvolvimento.md](../collector/padroes-de-desenvolvimento.md) |
| DA-12 | O contrato carrega três horários distintos: origem, coleta e publicação | Coleta bem-sucedida não prova mudança da apuração | A interface mostra atualidade dos dados, não a hora do download | [collector/README.md](../collector/README.md) |
| DA-13 | Ambiente oficial e simulado do TSE produzem publicações separadas. Produção nunca aponta para dado simulado | Evita exibir ensaio como apuração | Chaves, prefixos e marcação visível distintos | [dados/README.md](../dados/README.md) |
| DA-14 | Sentry, OpenTelemetry e Grafana são previstos, sem obrigação no primeiro dia | Não montar pilha antes de haver o que observar | Log mínimo e sinal de atraso existem desde o coletor (ET-04, ET-10) | [arquitetura/README.md](../arquitetura/README.md) |
| DA-15 | Planejamento em 16 etapas, ET-00 a ET-15, com estado centralizado no [catálogo](etapas/README.md) e o grafo de dependências do [plano mestre](plano-mestre.md#4-dependências) | Mesma ordem dos passos de infraestrutura, decomposta em entregas verificáveis | Substitui o grafo da versão anterior do planejamento; diferenças justificadas no plano mestre | Esta revisão |
| DA-16 | Padrões de código já definidos valem para todo código novo: módulos com responsabilidade clara, SOLID sem camada artificial, guard clauses, `if` permitido, sem `else` / `else if`, testes AAA com um comportamento por teste | Definidos nos guias de `docs/padroes/` | Os planos referenciam os guias e não copiam as regras | [padroes/README.md](../padroes/README.md) |
| DA-17 | Pacotes do workspace mantêm `dist` como saída publicada e ganham a condição de exportação `source` → `./src/index.ts`, listada antes de `types` e `import`. Os consumidores declaram `workspace:*` e pedem `source` em desenvolvimento, tipos e testes: `customConditions: ["source"]` em `apps/web/tsconfig.app.json` e `apps/collector/tsconfig.json`; `resolve.conditions: ['source', ...defaultClientConditions]` no `vite.config.ts`; `tsx --conditions=source` no `dev` do coletor; `vitest.config.ts` na raiz com `source` antes das condições padrão. O coletor compilado (`node dist/index.js`, e o container de ET-09) usa `import` → `dist`, gerado por `pnpm build`, que roda em ordem topológica. `--passWithNoTests` sai na mesma mudança do primeiro arquivo de teste (ET-03-T02) | Experimento num clone limpo (sem `dist`): com `exports` só para `dist`, `pnpm typecheck` falha (TS2307), `pnpm dev:collector` falha (ERR_MODULE_NOT_FOUND), o Vitest falha ao resolver o pacote e, depois de um build, mudança na fonte não chega ao consumidor (`dist` antigo, R-17). Com `source`: typecheck, dev, Vitest e build passam sem `dist` prévio; o Vite em dev serve a fonte do pacote e reflete a mudança; o coletor compilado roda com `dist`. Sem Turborepo, Nx nem referências de projeto | Aplicada em ET-03-T01, junto com a primeira importação; nada muda antes disso, para não alterar o lockfile sem consumidor. O pacote nunca importa app (PKG-001). Se `pnpm build` for pulado, só `start` do coletor compilado fica sujeito a `dist` antigo. Evidência: [ET-00.md](evidencias/ET-00.md#dp-18) | ET-00-T03 |

## Decisões pendentes

Cada pendência bloqueia apenas as tarefas listadas. Trabalho independente continua.

### DP-01 — Alcance temporal da primeira versão

- **Questão:** a primeira versão precisa operar ao vivo no segundo turno documentado, ou o plano segue sem compromisso com essa data?
- **Fato observado:** [dados/README.md](../dados/README.md) registra, pela página do TSE lida em 14/10/2026, o segundo turno em 25/10/2026. Esta revisão foi feita em 17/10/2026. Nenhuma etapa além da documentação está implementada. A data não foi reconfirmada aqui.
- **Informações necessárias:** data oficial vigente, disponibilidade de quem executa, orçamento e aceitação explícita dos riscos de antecipar etapas.
- **Opções conhecidas:** (a) manter a sequência completa sem compromisso com a data; (b) definir um escopo ao vivo reduzido, mantendo todos os controles de integridade (ET-02, ET-03, ET-05) e de exposição (ET-07), e aceitando por escrito o que não for ensaiado (ET-13); (c) usar a data apenas como fonte de amostras oficiais para ET-01 e publicar depois.
- **Recomendação:** nenhuma sustentada pelo repositório. Este plano não estima duração. Qualquer opção mantém os critérios dos marcos; nenhuma autoriza pular validação de integridade ou proteção básica.
- **Tarefas bloqueadas:** prioridade e janela de ET-01-T05 e ET-01-T07; aceite de ET-14-T01.
- **Condição para decidir:** decisão escrita do responsável pelo produto (a designar).
- **Registro de 17/10/2026 (ET-00):** o objetivo do produto está definido pelo usuário: acompanhar o segundo turno de 2026. Isso não é bloqueio para a ET-00 nem para preparar o ambiente local. Três coisas ficam separadas: (1) **objetivo do produto** — definido; (2) **intenção de operar ao vivo** na data do segundo turno — declarada como objetivo, sem plano de escopo reduzido escolhido entre (a), (b) e (c); (3) **prontidão efetiva para produção** — não existe: nenhuma etapa de dados, publicação, nuvem ou capacidade foi executada, e nada aqui garante lançamento, capacidade ou operação. Continuam pendentes: a escolha entre as opções acima, a reconfirmação da data oficial, orçamento e o aceite escrito de ET-14-T01.

### DP-02 — Disponibilidade de amostras para ET-01

- **Questão:** de onde virão amostras identificadas de EA14 e EA20 do segundo turno, se o simulado já passou e o oficial só terá resultados durante a apuração?
- **Informações necessárias:** estado atual dos hosts oficial e simulado; arquivos de 2026 já publicados (EA11, primeiro turno); se a especificação permite usar o primeiro turno como amostra de formato.
- **Opções conhecidas:** amostras do primeiro turno de 2026 como evidência de formato, identificadas como tal; amostras do simulado, se ainda disponíveis; amostras oficiais do segundo turno na janela da apuração.
- **Recomendação:** usar a especificação de 2026 como referência do formato e qualquer amostra disponível com identificação explícita de turno e ambiente. Amostra de primeiro turno não confirma códigos, disputas nem candidatos do segundo.
- **Tarefas bloqueadas:** ET-01-T05, ET-01-T07, ET-01-T08; fixtures oficiais de ET-03-T09.
- **Condição para decidir:** resultado de ET-01-T02.

### DP-03 — Campos e semântica de EA11, EA14, EA15 e EA20

- **Questão:** quais campos carregam votos, denominadores, andamento, status, horários e identificadores, e com qual tipo?
- **Informações necessárias:** especificações PDF de 2026 (não lidas até 14/10/2026) e amostras de DP-02.
- **Tarefas bloqueadas:** ET-02-T03 a ET-02-T05; ET-03-T04 a ET-03-T07.
- **Condição para decidir:** matriz de ET-01-T06 com evidência por campo. Campo sem evidência permanece pendente.

### DP-04 — Códigos, ciclo e caminhos vigentes do segundo turno

- **Questão:** quais códigos de pleito, eleição e cargo, qual ciclo e quais caminhos o coletor deve usar?
- **Informações necessárias:** EA11 vigente (`ele-c.json`, nome lido na página técnica) e instruções de download de 2026.
- **Tarefas bloqueadas:** ET-01-T05; ET-04-T01 (valores de configuração); qualquer consulta do coletor ao host oficial.
- **Condição para decidir:** ET-01-T03 concluída. Códigos lidos na página técnica não entram em código antes de aparecerem no EA11 vigente.

### DP-05 — Unidades com disputa de governador no segundo turno

- **Questão:** em quais unidades da Federação há disputa de governador no segundo turno?
- **Informações necessárias:** configuração oficial vigente. Não usar cenário do simulado nem lista editorial.
- **Tarefas bloqueadas:** ET-01-T05 (amostra de governador); ET-06-T06 e ET-11-T06 apenas na verificação com dados reais. O comportamento "sem disputa" pode ser implementado e testado antes.
- **Condição para decidir:** ET-01-T03, e reconfirmação em ET-14-T04.

### DP-06 — Verificação JWS

- **Questão:** o manual de verificação JWS citado pelo TSE exige verificar assinatura para confiar no arquivo?
- **Informações necessárias:** leitura do manual.
- **Opções conhecidas:** exigida antes da publicação; recomendada e adotada; não aplicável à divulgação consumida.
- **Tarefas bloqueadas:** se exigida, ET-08-T07 (publicação de homologação com dado oficial) espera a implementação da verificação, que vira tarefa adicional de ET-04.
- **Condição para decidir:** ET-01-T09.

### DP-07 — Deveres dos artigos 264 a 269 da Resolução TSE nº 23.751/2026

- **Questão:** que obrigações a resolução impõe a quem divulga resultados obtidos dos arquivos?
- **Informações necessárias:** texto da resolução.
- **Tarefas bloqueadas:** exposição pública de homologação com dado oficial (ET-07-T11, ET-08-T07); ET-14 inteira.
- **Condição para decidir:** ET-01-T09, com obrigações listadas e refletidas nos critérios de ET-07 e ET-14.

### DP-08 — Sinal de atualização da origem

- **Questão:** o IDG ordena gerações? ETag, Last-Modified e os horários de EA14 e EA20 bastam para detectar mudança?
- **Informações necessárias:** especificação e comportamento observado em consultas controladas.
- **Opções conhecidas:** comparar o conteúdo normalizado (sempre possível); usar IDG, se a especificação garantir ordem; usar validação condicional HTTP para poupar transferência, lembrando que 304 conta no limite.
- **Recomendação:** detectar mudança pelo conteúdo normalizado até a especificação confirmar outra regra. Isso não depende de interpretar IDG.
- **Tarefas bloqueadas:** ET-04-T07 apenas quanto ao uso do IDG; ET-04-T05.
- **Condição para decidir:** ET-01-T07.

### DP-09 — Denominadores, precisão e retificação

- **Questão:** qual o denominador de cada percentual, qual a precisão publicada, e como tratar total oficial que diminui?
- **Informações necessárias:** especificação e amostras.
- **Opções conhecidas:** publicar o percentual informado pela origem; calcular a partir de votos com denominador confirmado. Para retificação: aceitar e publicar; aceitar e marcar.
- **Recomendação:** publicar o percentual da origem quando ele existir, para não criar segunda fonte de verdade. Não descartar total menor sem regra (já registrado em [dados/README.md](../dados/README.md)).
- **Tarefas bloqueadas:** ET-02-T03; ET-03-T06.
- **Condição para decidir:** ET-01-T06.

### DP-10 — Necessidade do EA15

- **Questão:** o painel estadual depende do EA15?
- **Tarefas bloqueadas:** inclusão do EA15 em ET-04-T08. Até a decisão, município fica fora da coleta.
- **Condição para decidir:** ET-01-T10.

### DP-11 — Status oficial e liderança

- **Questão:** o contrato inclui algum status oficial de situação do candidato (por exemplo, eleito)? Como a interface diferencia liderança parcial de resultado confirmado?
- **Informações necessárias:** campos de status no EA20 (DP-03) e decisão de produto.
- **Opções conhecidas:** não exibir status de eleito na primeira versão; exibir somente status oficial lido da origem, com rótulo de fonte.
- **Recomendação:** o site não declara vencedor por conta própria ([contexto.md](../contexto.md)). Se o status oficial for exibido, ele vem do campo confirmado e é rotulado como informação oficial.
- **Tarefas bloqueadas:** ET-02-T05; ET-06-T05 e ET-11-T05 apenas quanto ao rótulo de status.
- **Condição para decidir:** ET-01-T06 e decisão do responsável pelo produto (a designar).

### DP-12 — Forma do contrato publicado

- **Questão:** nome do manifesto (`latest.json` é proposta), divisão dos arquivos, formato do identificador de versão e regra de versionamento do contrato.
- **Informações necessárias:** padrões de leitura do web (ET-02-T06) e tamanho das amostras (ET-01).
- **Tarefas bloqueadas:** ET-03-T03; ET-05-T01; ET-06-T03.
- **Condição para decidir:** ET-02-T06 a ET-02-T09.

### DP-13 — Falha parcial dentro de um ciclo

- **Questão:** se um arquivo da origem falha e os demais não, a versão inteira falha ou o arquivo afetado reaproveita o último conteúdo válido, com o próprio horário de origem?
- **Opções conhecidas:** (a) versão inteira falha e o manifesto não muda; (b) versão nova reaproveita o arquivo anterior, marcado com seu horário real.
- **Recomendação:** nenhuma ainda. (a) é mais simples; (b) mantém o resto atualizado, mas exige que cada painel mostre o próprio horário de origem.
- **Tarefas bloqueadas:** ET-04-T08; ET-05-T04 (regra de completude).
- **Condição para decidir:** ET-02-T10.

### DP-14 — Atualidade sem mudança e limiar de desatualização

- **Questão:** como o web distingue "origem sem novidade" de "coletor parado"? Qual atraso aciona o aviso de desatualização?
- **Opções conhecidas:** o manifesto carrega o horário da última verificação bem-sucedida e é regravado mesmo sem versão nova; ou o web usa só o horário de publicação.
- **Informações necessárias:** custo de escrita por ciclo (ET-07), intervalo do coletor (DP-16), decisão de produto sobre atraso tolerável.
- **Tarefas bloqueadas:** ET-02-T02 (campo); ET-11-T09 (limiar). ET-06 pode mostrar os horários sem limiar definitivo.
- **Condição para decidir:** ET-02-T02 para o mecanismo; responsável pelo produto (a designar) para o número.

### DP-15 — Retenção mínima de versões publicadas

- **Questão:** por quanto tempo uma versão substituída precisa continuar legível?
- **Informações necessárias:** TTL do manifesto e intervalo de polling (DP-17). A regra deve ser expressa em função desses valores.
- **Tarefas bloqueadas:** qualquer remoção de versão (nenhuma etapa remove automaticamente); ET-15-T07.
- **Condição para decidir:** ET-02-T11.

### DP-16 — Parâmetros do coletor

- **Questão:** intervalo entre ciclos, timeout, concorrência máxima, tamanho máximo de resposta, número de tentativas.
- **Fato:** o TSE informa 100 requisições por segundo por IP e bloqueio de 10 minutos (lido em 14/10/2026). É teto da origem, não meta. Não há intervalo recomendado publicado.
- **Tarefas bloqueadas:** nenhuma implementação. O código implementa os limites com valores de configuração; os valores de produção esperam esta decisão. Bloqueia ET-10-T07 (valores de homologação contínua) e ET-14-T03.
- **Condição para decidir:** ET-01-T07 (tamanhos e comportamento), ET-04-V13 (duração do ciclo) e orçamento (DP-22).

### DP-17 — Parâmetros de leitura

- **Questão:** TTL do manifesto, TTL dos arquivos versionados e intervalo de polling do navegador.
- **Informações necessárias:** atraso tolerável (DP-14), custo por requisição (DP-22), medição em ET-08 e ET-13.
- **Tarefas bloqueadas:** ET-07-T08 (valores; a regra existe antes); ET-11-T07 (valor; o mecanismo existe antes).
- **Condição para decidir:** valores iniciais em ET-07-T08, revisados em ET-13-T08.

### DP-18 — Resolução dos pacotes do workspace e prova de suíte

- **Questão:** como `apps/web` e `apps/collector` consomem `packages/*`, cujos `exports` apontam para `dist`? Quando retirar `--passWithNoTests`?
- **Fato observado:** os `package.json` dos pacotes exportam `./dist/index.js`; nenhum app declara dependência de pacote; `dist/` é ignorado pelo Git.
- **Opções conhecidas:** dependência `workspace:*` com build dos pacotes antes do consumidor; referências de projeto do TypeScript; condição de exportação apontando para a fonte em desenvolvimento.
- **Tarefas bloqueadas:** ET-03-T01.
- **Condição para decidir:** ET-00-T03.
- **Resolvida por DA-17** em 17/10/2026 (ET-00-T03), com experimento registrado em [ET-00.md](evidencias/ET-00.md#dp-18).

### DP-19 — Ferramentas de teste de interface e ponta a ponta

- **Questão:** ambiente DOM para Vitest, Testing Library (proposta em WEB-007) e ferramenta de ponta a ponta no navegador.
- **Tarefas bloqueadas:** ET-06-T09 (interface); ET-11-T13 (ponta a ponta).
- **Condição para decidir:** ET-06-T01, com aprovação da dependência nova (SEC-008).

### DP-20 — Leitura local da publicação pelo web

- **Questão:** como o web em desenvolvimento lê os arquivos publicados em disco sem criar backend permanente?
- **Opções conhecidas:** (a) publicar dentro de `apps/web/public/` — rejeitada, porque o Vite copia `public/` para o build e os snapshots locais iriam ao artefato; (b) servidor estático mínimo só de desenvolvimento, em outra porta, o que também exercita CORS como em homologação; (c) ferramenta estática já disponível na máquina.
- **Recomendação:** (b), com `node:http` e sem dependência nova, fora do build e do deploy.
- **Tarefas bloqueadas:** ET-05-T12; ET-06-T08.
- **Condição para decidir:** ET-05-T12.

### DP-21 — Conta, plano e domínios da Cloudflare

- **Questão:** quem é dono da conta, qual plano, quais domínios de site e de resultados para homologação e produção.
- **Tarefas bloqueadas:** ET-07-T02 em diante; ET-14-T03.
- **Condição para decidir:** ET-07-T01 e ET-07-T02, com decisão do responsável (a designar). Nenhum nome de domínio é inventado neste plano.

### DP-22 — Orçamento

- **Questão:** teto de gasto da Cloudflare, da AWS e do ensaio de carga, e quem recebe os alertas de custo.
- **Tarefas bloqueadas:** criação de qualquer recurso pago (ET-07-T05 em diante, ET-10-T02 em diante); ET-13-T04.
- **Condição para decidir:** valores lidos nas tabelas vigentes dos provedores na data da decisão e teto aprovado pelo responsável (a designar).

### DP-23 — Ferramenta de deploy dos Workers

- **Questão:** Wrangler (versão), local da configuração (`infra/cloudflare/` ou `apps/web/`) e se a configuração entra no repositório.
- **Tarefas bloqueadas:** ET-07-T05; ET-08-T06; ET-12-T03.
- **Condição para decidir:** ET-07-T04, com aprovação da dependência nova.

### DP-24 — Cliente e autenticação do coletor no R2

- **Questão:** como o coletor, fora de Workers, grava no R2?
- **Opções conhecidas:** API compatível com S3 usando credencial com escopo de bucket; ligação nativa de Worker (exige Worker, excluída por DA-05).
- **Recomendação:** API compatível com S3 com credencial restrita ao bucket do ambiente, a confirmar na documentação vigente do R2 na data da decisão. A biblioteca cliente é dependência nova e passa por SEC-008.
- **Tarefas bloqueadas:** ET-08-T01.
- **Condição para decidir:** ET-07-T10 e ET-08-T01.

### DP-25 — Desenho da AWS

- **Questão:** região, tipo de instância, sistema, IP público ou saída por NAT, registro de imagem, mecanismo de segredo, acesso administrativo (Session Manager é proposta) e destino dos logs.
- **Informações necessárias:** consumo medido do container (ET-09-T09), orçamento (DP-22), latência até a origem, se medida.
- **Tarefas bloqueadas:** ET-10-T02 em diante.
- **Condição para decidir:** ET-10-T01.

### DP-26 — Observabilidade e alertas

- **Questão:** canal de alerta, quem recebe, ferramentas (Sentry, OpenTelemetry e Grafana ou não), e como verificar de fora a idade do manifesto público.
- **Tarefas bloqueadas:** ET-10-T08 (versão mínima); ET-12-T05 e ET-12-T06.
- **Condição para decidir:** ET-10-T08 para o mínimo; ET-12-T05 para a consolidação.

### DP-27 — Metas de recuperação e disponibilidade

- **Questão:** quanto tempo sem publicação é tolerável, e quanto tempo de retomada é aceito depois de falha do coletor?
- **Fato:** como versões não se perdem quando o coletor para, a "perda" aqui é atraso de atualização, não dado apagado.
- **Tarefas bloqueadas:** critério numérico de ET-10-V07, ET-12-V06 e ET-13-V08.
- **Condição para decidir:** responsável pelo produto (a designar), antes de ET-13-T01.

### DP-28 — Cenários de capacidade

- **Questão:** visitantes simultâneos, padrão de rajada, duração, orçamento do ensaio, condições de interrupção e quem autoriza.
- **Tarefas bloqueadas:** ET-13-T02 em diante.
- **Condição para decidir:** ET-13-T01. Sem esses textos, a carga não começa.

### DP-29 — Fonte cartográfica e semântica visual do mapa

- **Questão:** qual GeoJSON público, com qual licença; o mapa colore unidades por liderança parcial ou não?
- **Tarefas bloqueadas:** ET-11-T01 e ET-11-T02.
- **Condição para decidir:** ET-11-T01. Se houver cor por liderança, a legenda diz que é liderança parcial por unidade e não resultado nacional.

### DP-30 — Autorização da produção

- **Questão:** quem autoriza a abertura, com quais critérios, e quem acompanha a primeira janela.
- **Tarefas bloqueadas:** ET-14-T07.
- **Condição para decidir:** ET-14-T01.

### DP-31 — Continuidade, retenção e encerramento

- **Questão:** o que continua no ar depois do período principal, por quanto tempo, com que custo, e o que pode ser desligado ou removido.
- **Tarefas bloqueadas:** ET-15-T04 em diante. A redação (ET-15-T01) pode começar antes e deve existir antes de ET-14-T01.
- **Condição para decidir:** decisão escrita do responsável (a designar).

## Riscos

| ID | Risco | Causa | Impacto | Controle previsto | Validação | Etapa | Risco remanescente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | Interpretação errada dos arquivos | Especificação não lida; semelhança com pleito anterior | Votos ou percentuais errados no ar | Matriz com evidência por campo; nenhum campo inventado | ET-01-V03, ET-03-V04 | ET-01, ET-02, ET-03 | Campo ambíguo mesmo com especificação |
| R-02 | Calendário curto | Data documentada do segundo turno a 8 dias desta revisão | Pressão para pular validação | DP-01 explícita; marcos não flexibilizados | Aceite escrito em ET-14-T01 | ET-00, ET-14 | Depende da decisão |
| R-03 | Bloqueio do IP pela origem | Excesso de requisições ou 404 em série | Coleta parada por pelo menos 10 minutos a cada bloqueio | Allowlist, URLs só da configuração confirmada, um ciclo, parada em bloqueio | ET-04-V05, ET-04-V08 | ET-01, ET-04 | Limiar de 404 não publicado |
| R-04 | Publicação incompleta ou mista | Falha entre arquivos e manifesto; dois publicadores | Visitante lê conjunto incoerente | DA-06, DA-04, verificação antes do manifesto | ET-05-V01, ET-08-V04, ET-10-V08 | ET-05, ET-08, ET-10 | Cache de borda pode servir manifesto antigo até o TTL |
| R-05 | Dado envelhecido parecendo ao vivo | Coletor parado; origem atrasada | Leitura de quadro velho como atual | Três horários; aviso de desatualização; alerta de atraso | ET-06-V07, ET-11-V09, ET-12-V06 | ET-02, ET-06, ET-11, ET-12 | Limiar pendente (DP-14) |
| R-06 | Cache errado | JSON sem regra; TTL único; query string variável | Polling não vê versão nova, ou custo alto | DA-07; cache sem variação por query arbitrária | ET-07-V05, ET-08-V06 | ET-07, ET-08, ET-13 | TTL só se valida medindo |
| R-07 | Credencial exposta ou ampla | Segredo em repo, bundle, imagem ou log; token com escopo largo | Publicação indevida | Credencial por ambiente, escopo mínimo, redação de log | ET-07-V07, ET-08-V09, ET-09-V04, ET-13-V06 | ET-07 em diante | Erro humano na operação |
| R-08 | Caminho alternativo exposto | `r2.dev` ou URL do bucket ligada | Leitura sem cache e sem WAF | Desligar acesso alternativo | ET-07-V03 | ET-07 | Reativação acidental |
| R-09 | Mistura oficial e simulado | Configuração errada | Ensaio exibido como apuração | DA-13, marcação visível, chaves distintas | ET-05-V07, ET-14-V04 | ET-05, ET-08, ET-14 | — |
| R-10 | Falha da instância única | Processo, máquina ou credencial | Atualização para; leitura continua | Reinício automático, alerta, recuperação ensaiada | ET-10-V05, ET-12-V06 | ET-10, ET-12, ET-13 | Tempo de retomada até alguém agir |
| R-11 | Custo inesperado | Recurso sem teto; cache ineficiente; gerador de carga | Gasto acima do aceito | Orçamento antes do recurso; alertas de custo; leitura durante ensaio | ET-07-V09, ET-10-V10, ET-13-V09 | ET-07, ET-10, ET-13, ET-15 | Tabelas de preço mudam |
| R-12 | Capacidade anunciada sem medição | Extrapolação | Promessa falsa | ET-13 relata só cenário medido | ET-13-V10 | ET-13 | — |
| R-13 | JWS ou resolução não lidos | Leituras pendentes desde 14/10 | Publicação sem dever conhecido | Bloqueio de exposição até ET-01-T09 | ET-01-V07 | ET-01, ET-07, ET-14 | — |
| R-14 | Retificação descartada ou mal publicada | Regra "total só aumenta" | Dado oficial corrigido omitido | Normalizador sem estado; detector não rejeita queda | ET-03-V09, ET-04-V10 | ET-03, ET-04 | Apresentação da retificação depende de DP-09 |
| R-15 | Acesso administrativo aberto | SSH público por omissão | Invasão da instância | Session Manager ou alternativa escrita antes de abrir | ET-10-V03 | ET-10 | — |
| R-16 | WAF bloqueia visitantes legítimos | Limite por IP com NAT compartilhado | Usuários sem acesso | Ensaio do caso de IP compartilhado | ET-13-V07 | ET-07, ET-13 | Plano da Cloudflare limita opções |
| R-17 | Base de testes enganosa | `--passWithNoTests`; `dist` antigo usado pelos consumidores | Aprovação sem suíte; tipo antigo | Retirar o flag quando a suíte existir; build ordenado | ET-00-V07, ET-03-V01 | ET-00, ET-03 | — |
| R-18 | Ambiente local diferente do declarado | Node padrão da máquina diverge de `.nvmrc` | Comando falha ou roda em versão errada | Registro de versões em ET-00 | ET-00-V01 | ET-00 | — |
| R-19 | Resposta fora de ordem no navegador | Troca rápida de unidade; manifesto antigo de outra borda | Painel de outra seleção ou regressão de versão | Descartar resposta obsoleta; não regredir versão | ET-06-V05, ET-11-V08 | ET-06, ET-11 | — |
| R-20 | Remoção não autorizada de dados | Regra de ciclo de vida ou limpeza manual | Perda de histórico | Nenhuma remoção automática; DP-31 | ET-15-V05 | ET-15 | — |
| R-21 | Divergência documental | README da raiz cita Pages | Provisionamento do produto errado | Correção em ET-00-T05 | ET-00-V08 | ET-00 | — |
| R-22 | Rajada sincronizada de polling | Clientes consultando no mesmo instante | Pico na borda e custo | Variação de intervalo; sem parâmetro aleatório | ET-11-V07 | ET-11, ET-13 | — |

## Histórico

- 17/10/2026: registro criado. Riscos e pendências da seção G da versão anterior de [README.md](README.md) (commit `cb42977`) foram integrados aqui com IDs. O conteúdo original não foi descartado: cada linha antiga tem correspondente acima.
