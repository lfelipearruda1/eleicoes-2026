# ET-06 — Web mínimo local

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo              | Conteúdo                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID                 | ET-06                                                                                                                                                                                                                                                                          |
| Componente         | `apps/web`                                                                                                                                                                                                                                                                     |
| Tipo predominante  | Código com testes de interface                                                                                                                                                                                                                                                 |
| Marco              | M2 — Fluxo local completo (conclusão)                                                                                                                                                                                                                                          |
| Resultado concreto | Na máquina, sem nuvem: o simulador muda os dados, o coletor publica em disco, e uma tela mínima mostra o resultado nacional, a UF escolhida e o governador quando houver, distingue carregamento, ausência, falha e desatualização, e passa a exibir a versão nova sem rebuild |

## 2. Escopo e exclusões

**Faz:**

- Camada de leitura HTTP do manifesto e dos arquivos, com validação pelo schema público.
- Tela mínima: Brasil, seleção simples de UF (inclui DF), painel presidencial da UF, governador condicional.
- Exibição de votos, percentuais com rótulos distintos, andamento, horários e marcação de simulado.
- Estados: carregamento, disponível, ainda não disponível, sem disputa, falha com último válido, desatualizado, contrato incompatível.
- Verificação simples de versão nova, sem sobreposição.
- Integração com a publicação local e demonstração de sucesso e falha.

**Não faz:**

- Não faz o mapa (ET-11).
- Não faz o layout definitivo, polling refinado (variação de intervalo, aba em segundo plano), responsividade final (ET-11).
- Não cria API, backend ou função Worker. A leitura local usa o servidor de desenvolvimento de ET-05-T12.
- Não publica na Cloudflare (ET-07, ET-08).
- Não recalcula percentual nem soma UFs.

## 3. Contexto e evidências

Estado observado em 17/10/2026: [apps/web/src/App.tsx](../../../apps/web/src/App.tsx) mostra só o título "Eleições 2026 — ambiente inicial"; [apps/web/src/main.tsx](../../../apps/web/src/main.tsx) usa `StrictMode`; [apps/web/index.html](../../../apps/web/index.html) tem `lang="pt-BR"`; [apps/web/vite.config.ts](../../../apps/web/vite.config.ts) só tem React e Tailwind; não há `VITE_` no código; [apps/web/.env.example](../../../apps/web/.env.example) sem variáveis; não há Testing Library nem ambiente DOM instalados.

Guias: WEB-001 a WEB-007 em [web/padroes-de-desenvolvimento.md](../../web/padroes-de-desenvolvimento.md); estados e regras de apresentação em [web/README.md](../../web/README.md); SEC-004 em [codigo-seguro.md](../../seguranca/codigo-seguro.md); exemplos de teste em [unitarios-aaa.md](../../testes/unitarios-aaa.md).

## 4. Dependências e critérios de entrada

| Tipo          | Item                                                            | Bloqueia                                                                 |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Implementação | ET-05: publicação local, servidor de desenvolvimento, simulador | T08, V11                                                                 |
| Implementação | ET-03: schema público em `@eleicoes/validation`                 | T03                                                                      |
| Contrato      | ET-02: divisão de arquivos, estados, compatibilidade            | T03 a T06                                                                |
| Decisão       | DP-19 (ferramentas de teste de interface)                       | T01, T09                                                                 |
| Decisão       | DP-11 (status oficial)                                          | Rótulo de status em T05                                                  |
| Decisão       | DP-14 (limiar)                                                  | Valor do aviso em T04; a tela usa valor provisório de configuração local |

**Início parcial:** com o contrato de ET-02 e o schema de ET-03, T01 a T07 podem ser feitas com fixtures sintéticas servidas localmente, antes de ET-05 terminar. Isso não comprova a integração com a publicação real; essa prova é T08.

## 5. Entradas e saídas

**Entradas:** manifesto e arquivos no layout do contrato, servidos por HTTP; schema público; URL base pública por configuração.

**Saídas:**

| Artefato                                                               | Consumidor                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Leitura de snapshots em `apps/web/src/features/resultados/` (proposto) | ET-08 (aponta para o domínio de homologação), ET-11 (evolui) |
| Tela mínima com os estados                                             | Demonstração de M2; ET-08 (tela de ensaio)                   |
| Suíte de interface                                                     | ET-11, ET-12                                                 |
| `apps/web/.env.example` com `VITE_RESULTS_BASE_URL` (nome proposto)    | ET-08, ET-12                                                 |

## 6. Responsabilidades e fronteiras

| Peça (proposta)                    | Decide                                              | Adapta transporte         | Efeito       |
| ---------------------------------- | --------------------------------------------------- | ------------------------- | ------------ |
| `features/resultados/<leitura>.ts` | Se a resposta é válida (schema) e qual erro ocorreu | `fetch` com `AbortSignal` | Requisição   |
| Hook de leitura                    | Qual estado exibir; descartar resposta obsoleta     | —                         | Temporizador |
| Componentes                        | Apresentação                                        | —                         | Nenhum       |
| `App.tsx`                          | Composição                                          | —                         | —            |

A tela não normaliza, não calcula percentual, não ordena candidatos de outro jeito e não deriva o nacional das UFs. WEB-002: estado no menor escopo; WEB-003: efeito só para requisição e temporizador.

## 7. Sequência de tarefas

### ET-06-T01 — Escolher e instalar as ferramentas de teste de interface

- **Tipo:** configuração
- **Resultado pretendido:** DP-19 resolvida para interface; testes de componente rodam no Vitest.
- **Entradas e pré-requisitos:** WEB-007; ET-03-T02.
- **Ações:**
  1. Confirmar Testing Library (proposta de WEB-007) e escolher o ambiente DOM.
  2. Registrar a justificativa da dependência nova (SEC-008) e aprovar.
  3. Instalar com versões fixas; configurar o ambiente DOM só para `apps/web`.
  4. Escrever um teste real (não trivial) junto: T09.
- **Responsabilidade e caminhos:** [apps/web/package.json](../../../apps/web/package.json); configuração do Vitest (proposta em ET-03-T02).
- **Regras, falhas e bordas:** ferramenta de ponta a ponta no navegador não é escolhida aqui (ET-11-T13).
- **Saída:** dependências e configuração.
- **Validações:** ET-06-V16
- **Concluída quando:** `pnpm test` roda testes de componente do web junto com os demais.
- **Bloqueios ou aprovações:** aprovação de dependência nova.

### ET-06-T02 — Configurar a URL pública dos resultados

- **Tipo:** configuração
- **Resultado pretendido:** o web sabe onde está o manifesto sem código fixo e sem segredo.
- **Entradas e pré-requisitos:** —
- **Ações:**
  1. Ler `VITE_RESULTS_BASE_URL` (nome proposto) e validar como URL na partida.
  2. Em ambiente que não seja local, exigir `https`.
  3. Documentar em [apps/web/.env.example](../../../apps/web/.env.example), deixando claro que `VITE_*` é público (WEB-006).
- **Responsabilidade e caminhos:** `apps/web/src/app/` (proposto).
- **Regras, falhas e bordas:** nunca apontar para host do TSE.
- **Saída:** configuração validada.
- **Validações:** ET-06-V01
- **Concluída quando:** valor ausente ou inválido gera erro claro; valor local funciona.
- **Bloqueios ou aprovações:** nenhum.

### ET-06-T03 — Escrever a leitura HTTP dos snapshots

- **Tipo:** código
- **Resultado pretendido:** funções que leem o manifesto e os arquivos da versão, validam uma vez por resposta e devolvem erro tipado.
- **Entradas e pré-requisitos:** T02; schema de ET-03.
- **Ações:**
  1. `lerManifesto` e `lerArquivo(caminho)` (nomes ilustrativos) com `AbortSignal`.
  2. Conferir status, tipo de conteúdo e schema.
  3. Erros distintos: rede, HTTP, inválido, contrato incompatível (ET-02-T09).
  4. Montar URLs só a partir da base e do caminho do manifesto, sem parâmetro aleatório (WEB-005).
- **Responsabilidade e caminhos:** `apps/web/src/features/resultados/` (proposto).
- **Regras, falhas e bordas:** não seguir caminho do manifesto que saia da base (validação de destino, WEB-006).
- **Saída:** funções e testes com `fetch` substituído.
- **Validações:** ET-06-V02, ET-06-V03, ET-06-V04
- **Concluída quando:** cada tipo de erro tem teste.
- **Bloqueios ou aprovações:** DP-12 (forma do manifesto).

### ET-06-T04 — Implementar o estado de leitura da tela

- **Tipo:** código
- **Resultado pretendido:** um hook entrega à tela um estado inequívoco e nunca troca o painel por resposta obsoleta.
- **Entradas e pré-requisitos:** T03.
- **Ações:**
  1. Estados: carregando, disponível, ainda não disponível, sem disputa, falha com último válido, desatualizado, incompatível.
  2. Guardar o último conjunto válido; em falha, mantê-lo com aviso.
  3. Descartar resposta de seleção anterior (bandeira ou cancelamento, WEB-003).
  4. Não aceitar manifesto mais antigo que o atual (ET-02-T08).
  5. Calcular desatualização a partir dos horários do contrato e de um limiar de configuração local provisório (DP-14).
- **Responsabilidade e caminhos:** `apps/web/src/features/resultados/hooks/` (proposto).
- **Regras, falhas e bordas:** callback de `useEffect` não é `async` (WEB-003). Strict Mode permanece.
- **Saída:** hook e testes com timers e Promises controlados.
- **Validações:** ET-06-V05, ET-06-V06, ET-06-V07
- **Concluída quando:** troca rápida de UF e falha após sucesso têm testes.
- **Bloqueios ou aprovações:** DP-14 só quanto ao valor final.

### ET-06-T05 — Construir o painel nacional mínimo

- **Tipo:** código
- **Resultado pretendido:** o resultado presidencial do Brasil, a partir do arquivo de abrangência Brasil.
- **Entradas e pré-requisitos:** T04.
- **Ações:**
  1. Lista de candidaturas na ordem do contrato, com votos e percentual de votos.
  2. Percentual de apuração com rótulo distinto.
  3. Horários de origem, coleta e publicação.
  4. Marcação visível de dado simulado.
  5. Texto que não declara vencedor; status oficial só se DP-11 decidir.
  6. Identificação da fonte, se exigida por DP-07.
- **Responsabilidade e caminhos:** `apps/web/src/features/resultados/components/` (proposto).
- **Regras, falhas e bordas:** ausência não vira zero; texto da origem como texto (SEC-004).
- **Saída:** componente e testes.
- **Validações:** ET-06-V08, ET-06-V10, ET-06-V13, ET-06-V14
- **Concluída quando:** os estados disponível, ainda não disponível e simulado aparecem corretamente.
- **Bloqueios ou aprovações:** DP-09 para exibir percentual; DP-11 para status.

### ET-06-T06 — Construir a seleção simples de UF e os painéis estaduais

- **Tipo:** código
- **Resultado pretendido:** escolher qualquer UF da configuração do contrato, incluindo DF, e ver presidente e, se houver, governador.
- **Entradas e pré-requisitos:** T04, T05.
- **Ações:**
  1. Lista de UFs vinda do arquivo de configuração do contrato, não de lista fixa.
  2. Controle de seleção acessível por teclado (botões ou `select`).
  3. Painel presidencial da UF.
  4. Painel de governador quando o contrato indicar disputa; texto explicativo quando indicar "sem disputa".
- **Responsabilidade e caminhos:** `apps/web/src/features/resultados/components/` (proposto).
- **Regras, falhas e bordas:** chave estável das listas pelo identificador do contrato, não pelo índice (WEB-006).
- **Saída:** componentes e testes.
- **Validações:** ET-06-V05, ET-06-V09
- **Concluída quando:** UF com e sem governador se comportam como o contrato manda.
- **Bloqueios ou aprovações:** nenhum.

### ET-06-T07 — Verificar versão nova sem sobreposição

- **Tipo:** código
- **Resultado pretendido:** a tela percebe a troca do manifesto e lê a versão nova, sem dois pedidos simultâneos.
- **Entradas e pré-requisitos:** T04.
- **Ações:**
  1. Consulta periódica simples do manifesto com intervalo de configuração local provisório.
  2. Não iniciar consulta enquanto a anterior estiver pendente.
  3. Só buscar arquivos quando a versão mudar.
- **Responsabilidade e caminhos:** `apps/web/src/features/resultados/hooks/` (proposto).
- **Regras, falhas e bordas:** sem parâmetro aleatório na URL. Variação de intervalo e aba em segundo plano são ET-11-T07.
- **Saída:** verificação periódica e testes com timers falsos.
- **Validações:** ET-06-V15
- **Concluída quando:** com timers falsos, nunca há dois pedidos de manifesto em andamento.
- **Bloqueios ou aprovações:** DP-17 só quanto ao valor.

### ET-06-T08 — Integrar com a publicação local e demonstrar sucesso e falha

- **Tipo:** teste
- **Resultado pretendido:** primeiro fluxo vertical completo, sem nuvem.
- **Entradas e pré-requisitos:** ET-05-T10, ET-05-T11, ET-05-T12; T01–T07.
- **Ações:**
  1. Subir simulador, coletor (publicador local) e servidor de desenvolvimento; subir o web com `pnpm dev:web`.
  2. Avançar o simulador: ver v1 e depois v2 na tela, sem recarregar nem rebuild.
  3. Colocar o simulador em resposta inválida: o coletor não publica; a tela segue em v2 e, passado o limiar provisório, mostra desatualização.
  4. Parar o servidor de desenvolvimento: a tela mostra falha com o último válido.
  5. Registrar o roteiro e as observações em `docs/planejamento/evidencias/ET-06.md` (proposto). Capturas de tela só se reais.
- **Responsabilidade e caminhos:** roteiro documental; scripts existentes de ET-05.
- **Regras, falhas e bordas:** dados exibidos são sintéticos e marcados.
- **Saída:** evidência de M2.
- **Validações:** ET-06-V11
- **Concluída quando:** os quatro passos foram observados e registrados.
- **Bloqueios ou aprovações:** nenhum.

### ET-06-T09 — Escrever os testes de contrato e de comportamento da interface

- **Tipo:** teste
- **Resultado pretendido:** cada estado e cada regra de apresentação têm um teste, um comportamento por teste.
- **Entradas e pré-requisitos:** T01; T03–T07.
- **Ações:**
  1. Testes de leitura com `fetch` substituído (contrato).
  2. Testes de componente por papel e nome acessível (WEB-007).
  3. Teste de texto com marcação exibido como texto (SEC-004).
  4. Teste de que o painel nacional lê só o arquivo Brasil.
- **Responsabilidade e caminhos:** `*.spec.tsx` em `apps/web/testes/units/` (TEST-001).
- **Regras, falhas e bordas:** sem rede real; timers controlados (TEST-002).
- **Saída:** suíte.
- **Validações:** ET-06-V02 a ET-06-V10, ET-06-V13 a ET-06-V15
- **Concluída quando:** a suíte cobre a tabela de estados de [web/README.md](../../web/README.md).
- **Bloqueios ou aprovações:** DP-19.

### ET-06-T10 — Verificar o artefato de build

- **Tipo:** teste
- **Resultado pretendido:** o bundle não contém segredo nem host do TSE.
- **Entradas e pré-requisitos:** `pnpm build`.
- **Ações:**
  1. Buscar no `apps/web/dist` por hosts do TSE e por padrões de credencial.
  2. Registrar o tamanho do bundle como linha de base para ET-11 (PERF-002).
  3. Propor o comando de verificação para ET-12-T01.
- **Responsabilidade e caminhos:** comando proposto para criação futura.
- **Regras, falhas e bordas:** —
- **Saída:** evidência e comando proposto.
- **Validações:** ET-06-V12
- **Concluída quando:** busca sem achados registrada.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

- Consome o contrato de ET-02 só pelo schema de `@eleicoes/validation`.
- Contrato incompatível gera estado próprio, sem tentativa de leitura parcial (ET-02-T09).
- `VITE_RESULTS_BASE_URL` (nome proposto) passa a ser contrato de build para ET-08 e ET-12.

## 9. Segurança, integridade e performance

- R-19: V05 e regra de não regredir versão.
- R-05: horários e aviso (V07).
- SEC-004: texto como texto (V10). WEB-006: nada de segredo em `VITE_*` (V12).
- PL-REQ-008: nenhum host do TSE (V12).
- Performance: um manifesto por verificação; arquivos só quando a versão muda. Sem mapa nem GeoJSON nesta etapa.

## 10. Plano de validação

| ID        | Cenário                   | Preparação                                             | Ação                                          | Sucesso                                                                                        | Falha se                          | Nível                  | Ambiente | Tarefa   |
| --------- | ------------------------- | ------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------- | -------- | -------- |
| ET-06-V01 | URL de configuração       | Valor ausente, inválido, válido (casos separados)      | Iniciar                                       | Erro claro nos dois primeiros; leitura no terceiro                                             | Falha silenciosa                  | Unitário               | Local    | T02      |
| ET-06-V02 | Leitura válida            | Manifesto e arquivos sintéticos                        | Ler                                           | Dados tipados da versão do manifesto                                                           | Arquivo de outra versão lido      | Unitário               | Local    | T03      |
| ET-06-V03 | Resposta inválida         | Arquivo que não passa no schema                        | Ler                                           | Erro "inválido"; nenhum dado exibido como novo                                                 | Dado exibido                      | Unitário               | Local    | T03      |
| ET-06-V04 | Contrato incompatível     | Manifesto com versão de contrato não suportada         | Ler e renderizar                              | Estado de recarregar                                                                           | Tentativa de exibir               | Interface              | Local    | T03      |
| ET-06-V05 | Resposta fora de ordem    | UF A lenta, UF B rápida                                | Selecionar A, depois B                        | Tela mostra B                                                                                  | Tela mostra A                     | Interface              | Local    | T04, T06 |
| ET-06-V06 | Falha após sucesso        | Versão exibida; servidor falha                         | Verificar de novo                             | Último válido visível com aviso                                                                | Tela vazia ou zerada              | Interface              | Local    | T04      |
| ET-06-V07 | Horários e desatualização | Versão com horário antigo; limiar provisório           | Renderizar                                    | Três horários; aviso quando acima do limiar                                                    | Só hora do download, ou sem aviso | Interface              | Local    | T04      |
| ET-06-V08 | Ausência não é zero       | Arquivo "ainda não disponível"                         | Renderizar                                    | Texto de indisponível; nenhum zero                                                             | Zero exibido                      | Interface              | Local    | T05      |
| ET-06-V09 | Sem governador            | UF com "sem disputa"                                   | Selecionar                                    | Explicação; painel presidencial da UF segue                                                    | Painel vazio sem explicação       | Interface              | Local    | T06      |
| ET-06-V10 | Texto com marcação        | Nome com `<b>` em fixture                              | Renderizar                                    | Texto literal                                                                                  | Elemento criado                   | Interface              | Local    | T05      |
| ET-06-V11 | Fluxo vertical            | Simulador, coletor, servidor, web                      | Roteiro de T08                                | v1 → v2 sem rebuild; falha da origem mantém v2; servidor parado mostra falha com último válido | Qualquer passo diferente          | Ponta a ponta (manual) | Local    | T08      |
| ET-06-V12 | Bundle limpo              | `pnpm build`                                           | Busca por host do TSE e padrões de credencial | Nenhum achado                                                                                  | Achado                            | Integração             | Local    | T10      |
| ET-06-V13 | Nacional pelo agregado    | Fixture Brasil e fixtures de UF com líderes diferentes | Renderizar Brasil                             | Valores do arquivo Brasil                                                                      | Valores derivados das UFs         | Interface              | Local    | T05      |
| ET-06-V14 | Simulado marcado          | Manifesto com origem simulada                          | Renderizar                                    | Marcação visível                                                                               | Sem marcação                      | Interface              | Local    | T05      |
| ET-06-V15 | Sem pedido sobreposto     | Manifesto lento; timers falsos                         | Avançar dois intervalos                       | Um pedido em andamento                                                                         | Dois pedidos                      | Unitário               | Local    | T07      |
| ET-06-V16 | Ferramenta de teste       | T01                                                    | `pnpm test`                                   | Testes de componente executados                                                                | Não executados                    | Integração             | Local    | T01      |

Teste local de interface não prova cache, CORS real nem comportamento da borda (ET-08). O roteiro V11 é manual; ferramenta de ponta a ponta automatizada é decisão de ET-11.

## 11. Infraestrutura e ações externas

Não se aplica. Tudo roda na máquina.

## 12. Falha, reversão e recuperação

- **Código:** reversão por commit. `App.tsx` atual pode ser restaurado.
- **Dados:** a tela não grava nada.
- **Configuração:** URL base errada aparece como erro claro (V01).

## 13. Critérios de conclusão

- [x] Leitura com schema e erros tipados (V02–V04).
- [ ] Estados e regras de apresentação testados (V05–V10, V13, V14).
- [x] Verificação de versão sem sobreposição (V15).
- [ ] Fluxo vertical demonstrado e registrado (V11). Parcial em 20/10/2026: fixtures sintéticas no lugar do simulador; sem passo de desatualização ([ET-06.md](../evidencias/ET-06.md)).
- [x] Bundle sem segredo nem host do TSE (V12).
- [ ] `.env.example` do web documentado.

## 14. Pendências e passagem adiante

- DP-14 e DP-17 continuam abertas quanto aos valores; a tela usa valores locais provisórios, identificados como tais.
- ET-07 recebe: o build estático a hospedar e a tela de ensaio.
- ET-08 recebe: leitura parametrizada pela URL base.
- ET-11 recebe: leitura, hook e painéis para evoluir.

## 15. Brief de execução

Fazer a primeira tela que lê o contrato publicado em disco por HTTP local: Brasil, seleção simples de UF, governador condicional, horários, simulado marcado, estados de carregamento, ausência, falha com último válido e desatualização. Verificar versão nova sem sobreposição. Demonstrar v1 → v2 sem rebuild e falhas preservando o último válido. Sem mapa, sem backend, sem nuvem. Validações V01–V16. Referências: WEB-001 a WEB-007, SEC-004, [web/README.md](../../web/README.md).
