# ET-04 — Collector

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-04 |
| Componente | `apps/collector` |
| Tipo predominante | Código com testes unitários e de integração local |
| Marco | M2 — Fluxo local completo (parte da coleta) |
| Resultado concreto | Um processo Node.js executa um ciclo de coleta, uma vez ou de forma agendada sem sobreposição, contra uma origem controlada; produz um conjunto normalizado e o entrega a uma função de publicação. Timeout, corpo excessivo, redirect, bloqueio, erro permanente, encerramento e retificação têm comportamento demonstrado por teste |

## 2. Escopo e exclusões

**Faz:**

- Configuração validada e composição em `main.ts`.
- Execução única antes do agendamento.
- Cliente da origem com allowlist, limites de tempo, tamanho e concorrência, sem redirect.
- Política limitada de tentativas, parada em bloqueio, sem repetição de erro permanente.
- Detecção de alteração pelo conteúdo normalizado.
- Orquestração de um ciclo e agendamento sem sobreposição.
- Cancelamento, encerramento e logs sem segredo.
- Contrato de saída para a publicação, com publicador em memória nos testes.

**Não faz:**

- Não grava em disco nem no R2. O publicador local é ET-05; o do R2 é ET-08. ET-04 define a assinatura que eles implementam e testa com um publicador em memória.
- Não sobe servidor HTTP público, nem de saúde.
- Não cria Dockerfile (ET-09).
- Não fixa valores de intervalo, timeout, concorrência, tamanho e tentativas (DP-16). Os limites existem com valor vindo da configuração.
- Não consulta o TSE em teste. A consulta real é uma execução única autorizada (T15).

## 3. Contexto e evidências

Estado observado em 17/10/2026: [apps/collector/src/index.ts](../../../apps/collector/src/index.ts) só imprime uma frase; [apps/collector/package.json](../../../apps/collector/package.json) tem `dev` com `tsx src/index.ts` e `start` com `node dist/index.js`; dependências de desenvolvimento são `@types/node`, `tsx` e `typescript`; nenhuma dependência de produção; [apps/collector/.env.example](../../../apps/collector/.env.example) não define variável. Node 24 tem `fetch`, `AbortController` e `AbortSignal.timeout` nativos; nenhuma biblioteca HTTP nova é necessária.

Guias: COL-001 a COL-005 em [collector/padroes-de-desenvolvimento.md](../../collector/padroes-de-desenvolvimento.md); disciplina de coleta em [collector/README.md](../../collector/README.md); SEC-001, SEC-003, SEC-006 em [codigo-seguro.md](../../seguranca/codigo-seguro.md); PERF-003 em [performance.md](../../padroes/performance.md); TS-013 e TS-015 em [typescript-funcoes-e-assincronismo.md](../../padroes/typescript-funcoes-e-assincronismo.md); TEST-001 a TEST-004.

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-03: schemas brutos, normalização, serialização estável | T07, T08 |
| Contrato | ET-02: publicabilidade e falha parcial (DP-13) | T08 |
| Decisão | DP-04 (códigos e caminhos), via ET-01-T03 | Valores reais de T01; T15 |
| Decisão | DP-08 (sinal de atualização) | T05; uso de IDG em T07 |
| Decisão | DP-14 (verificação sem mudança) | Parte de T07 |
| Decisão | DP-06 (JWS), se exigido | Tarefa adicional de verificação antes de T08 |
| Recurso externo | Allowlist candidata (ET-01-T02) | T03 com valores reais |
| Autorização | Execução única contra o host oficial | T15 |

**Podem começar com ET-03 em andamento:** T01, T02, T03, T04, T06, T09, T10, T11, T12. Elas não dependem de campo da origem; os testes usam servidor local com respostas sintéticas.

## 5. Entradas e saídas

**Entradas:** configuração por variáveis de ambiente; respostas da origem (reais ou do servidor de teste); schemas e normalização de ET-03.

**Saídas:**

| Artefato | Garantia | Consumidor |
| --- | --- | --- |
| Tipo do conjunto normalizado de um ciclo e assinatura da função de publicação em `apps/collector/src/publication/` (proposto) | Estável; documentado junto ao contrato | ET-05 (implementação local), ET-08 (implementação R2) |
| Processo com `--once` e modo agendado | Um ciclo por vez; encerramento limpo | ET-05-T10, ET-09 |
| Logs estruturados em saída padrão | Sem segredo, sem corpo completo | ET-09, ET-10, ET-12 |
| `.env.example` com nomes de variáveis, sem valores sensíveis | — | ET-08, ET-09, ET-10 |

## 6. Responsabilidades e fronteiras

Estrutura de COL-001; só nasce a pasta usada.

| Módulo (proposto) | Decide | Adapta transporte | Produz efeito |
| --- | --- | --- | --- |
| `config/` | Se a configuração é válida | Lê `process.env` | Encerra o processo se inválida |
| `source-client/` | Se o destino é permitido e se a resposta é aceitável | `fetch` com limites | Requisição de rede |
| `orchestration/` | Sequência de um ciclo e o que fazer em falha | — | Chama cliente e publicação |
| `normalization/` (ET-03) | Transformação | — | Nenhum |
| `publication/` | Assinatura da publicação; publicador em memória para teste | — | — (efeito real em ET-05 e ET-08) |
| `schedule/` | Quando disparar o próximo ciclo | Temporizadores | Disparo |
| `observability/` | Formato e redação do log | Saída padrão | Escrita de log |
| `main.ts` | Nada de regra | — | Compõe e inicia (COL-002) |

O web não importa nada disso. A normalização não é repetida no web.

## 7. Sequência de tarefas

### ET-04-T01 — Validar a configuração na partida

- **Tipo:** código
- **Resultado pretendido:** o processo não sobe com configuração ausente, incoerente ou perigosa.
- **Entradas e pré-requisitos:** lista de variáveis de [collector/README.md](../../collector/README.md).
- **Ações:**
  1. Definir as variáveis: nosso ambiente; ambiente da origem; URL base (comparada à allowlist); códigos de eleição e cargos (do EA11 vigente); destino de publicação; intervalo; timeout; concorrência; tamanho máximo; tentativas.
  2. Validar com Zod; recusar combinações incoerentes (por exemplo, ambiente da origem `simulado` com nosso ambiente `producao`).
  3. Atualizar [apps/collector/.env.example](../../../apps/collector/.env.example) com nomes e descrição, sem valor sensível.
  4. Testes: cada ausência e cada incoerência recusadas.
- **Responsabilidade e caminhos:** `apps/collector/src/config/` (proposto).
- **Regras, falhas e bordas:** ler a configuração não dispara rede (COL-002). Não aceitar URL arbitrária: só valores dentro da allowlist.
- **Saída:** módulo de configuração e testes.
- **Validações:** ET-04-V01, ET-04-V22
- **Concluída quando:** configuração inválida termina o processo com mensagem sem segredo e código de saída diferente de zero.
- **Bloqueios ou aprovações:** valores reais de códigos esperam DP-04; os testes usam valores sintéticos.

### ET-04-T02 — Definir o contrato de saída da coleta

- **Tipo:** código
- **Resultado pretendido:** coleta e publicação se encontram por uma assinatura simples, sem dependência circular.
- **Entradas e pré-requisitos:** contrato de ET-02 (manifesto e lista de arquivos).
- **Ações:**
  1. Definir o tipo do conjunto de um ciclo: arquivos normalizados com caminho relativo, metadados e horários.
  2. Definir a função de publicação como parâmetro (`publish(conjunto) → resultado`), com erros possíveis e o retorno que informa a versão publicada.
  3. Escrever um publicador em memória (fake, TEST-003) para os testes de coleta.
  4. Documentar a assinatura junto ao contrato.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** não criar interface com uma implementação só "para o futuro"; o tipo da função basta, e já há duas implementações planejadas (ET-05, ET-08) mais o fake (CC-009).
- **Saída:** tipo, fake, documentação.
- **Validações:** ET-04-V17
- **Concluída quando:** a orquestração compila contra o tipo e os testes usam o fake.
- **Bloqueios ou aprovações:** nenhum.

### ET-04-T03 — Escrever o cliente da origem com allowlist e limites

- **Tipo:** código
- **Resultado pretendido:** só destinos permitidos são consultados; respostas lentas, grandes, redirecionadas ou inesperadas viram falha.
- **Entradas e pré-requisitos:** T01; allowlist candidata de ET-01-T02.
- **Ações:**
  1. Função que decide se uma URL é permitida: esquema, host, porta, prefixo de caminho, depois de interpretada (SEC-003).
  2. `fetch` com `redirect: 'manual'`; resposta de redirect é falha.
  3. Timeout com `AbortSignal`, combinado com o sinal de encerramento do processo.
  4. Leitura do corpo em fluxo, contando bytes e abortando acima do limite; conferir `Content-Length` quando existir.
  5. Conferir status e tipo de conteúdo antes do parse.
  6. Testes de integração com servidor `node:http` local para cada caso.
- **Responsabilidade e caminhos:** `apps/collector/src/source-client/` (proposto).
- **Regras, falhas e bordas:** nunca seguir redirect para outro host; nunca montar URL com texto livre. O cliente não normaliza e não publica.
- **Saída:** cliente e testes.
- **Validações:** ET-04-V02, ET-04-V03, ET-04-V04, ET-04-V05, ET-04-V06
- **Concluída quando:** todos os casos falham de forma tipada, sem produzir conteúdo.
- **Bloqueios ou aprovações:** valor numérico dos limites em DP-16; o teste usa valores pequenos de configuração.

### ET-04-T04 — Classificar falhas e limitar tentativas

- **Tipo:** código
- **Resultado pretendido:** erro transitório tem nova tentativa limitada; erro permanente e bloqueio param.
- **Entradas e pré-requisitos:** T03; comportamento de bloqueio de ET-01-T02/T07.
- **Ações:**
  1. Classificar: transitório (timeout, erro de rede, 5xx), permanente (404 em caminho confirmado, 4xx não listado), bloqueio (resposta de bloqueio identificada em ET-01, 429, `Retry-After`).
  2. Espera progressiva com variação aleatória injetada (para teste determinístico).
  3. Máximo de tentativas da configuração.
  4. Em bloqueio: encerrar o ciclo e não tentar de novo antes do prazo informado pela origem (`Retry-After`) ou do prazo documentado pelo TSE, o que for maior.
  5. Testes com timers falsos.
- **Responsabilidade e caminhos:** `apps/collector/src/source-client/` (proposto).
- **Regras, falhas e bordas:** nova tentativa durante bloqueio renova o bloqueio na origem; o teste prova que não acontece.
- **Saída:** política e testes.
- **Validações:** ET-04-V07, ET-04-V08, ET-04-V09
- **Concluída quando:** número de chamadas em cada caso é o esperado.
- **Bloqueios ou aprovações:** nenhum.

### ET-04-T05 — Usar requisição condicional quando confirmada

- **Tipo:** código
- **Resultado pretendido:** economizar transferência com ETag, tratando 304 como "sem mudança" e contando-o no limite.
- **Entradas e pré-requisitos:** DP-08 com evidência de que ETag é estável.
- **Ações:**
  1. Guardar a ETag da última resposta aceita por arquivo, só em memória.
  2. Enviar `If-None-Match`; 304 reaproveita o conteúdo normalizado anterior do arquivo.
  3. Testes: 200 com ETag nova; 304; ETag ausente.
- **Responsabilidade e caminhos:** `apps/collector/src/source-client/` (proposto).
- **Regras, falhas e bordas:** após reinício não há ETag; a primeira consulta é completa.
- **Saída:** comportamento e testes.
- **Validações:** ET-04-V11
- **Concluída quando:** 304 não gera versão nova e não é contado como pedido grátis.
- **Bloqueios ou aprovações:** DP-08. Sem evidência, a tarefa fica registrada como não aplicável.

### ET-04-T06 — Limitar a concorrência dentro do ciclo

- **Tipo:** código
- **Resultado pretendido:** no máximo N requisições simultâneas, N vindo da configuração.
- **Entradas e pré-requisitos:** T03.
- **Ações:**
  1. Executar a lista de arquivos do ciclo com limite de concorrência simples, sem biblioteca nova.
  2. Montar o resultado por chave do arquivo, não pela ordem de chegada.
  3. Testes com respostas resolvidas em ordem inversa.
- **Responsabilidade e caminhos:** `apps/collector/src/orchestration/` (proposto).
- **Regras, falhas e bordas:** sem `forEach(async)` (REV-002).
- **Saída:** função e testes.
- **Validações:** ET-04-V12
- **Concluída quando:** ordem de chegada não altera o resultado e o pico de simultaneidade não passa do limite.
- **Bloqueios ou aprovações:** valor em DP-16.

### ET-04-T07 — Detectar alteração pelo conteúdo normalizado

- **Tipo:** código
- **Resultado pretendido:** versão nova só quando o conteúdo publicado mudaria; queda de total é mudança legítima.
- **Entradas e pré-requisitos:** ET-03-T11 (serialização estável); DP-14.
- **Ações:**
  1. Calcular resumo do conteúdo normalizado excluindo horários nossos.
  2. Comparar com o resumo da última versão publicada que o processo conhece (lido do manifesto na partida, via publicador).
  3. Sem mudança: não publicar versão nova; aplicar a decisão de DP-14 (atualizar só o horário de verificação, se adotado).
  4. Com mudança, inclusive total menor: publicar.
  5. Usar IDG só se DP-08 confirmar ordem.
- **Responsabilidade e caminhos:** `apps/collector/src/orchestration/` (proposto).
- **Regras, falhas e bordas:** não rejeitar queda (R-14). Não publicar só porque o horário de coleta mudou.
- **Saída:** função e testes.
- **Validações:** ET-04-V10, ET-04-V11
- **Concluída quando:** os três casos (igual, maior, menor) têm teste.
- **Bloqueios ou aprovações:** DP-14 para o comportamento sem mudança.

### ET-04-T08 — Orquestrar um ciclo completo

- **Tipo:** código
- **Resultado pretendido:** um ciclo busca, valida, normaliza, detecta mudança e chama a publicação, ou termina em falha registrada sem publicar.
- **Entradas e pré-requisitos:** T02 a T07; ET-03; DP-13.
- **Ações:**
  1. Obter a configuração da origem (EA11 recortado) quando necessária e os arquivos de resultado da lista confirmada.
  2. Validar cada resposta com o schema bruto; normalizar.
  3. Aplicar DP-13 para falha parcial.
  4. Montar o conjunto e chamar `publish`.
  5. Registrar o resultado do ciclo (sucesso com versão, sem mudança, falha com causa).
  6. Se DP-06 exigir JWS, verificar antes de normalizar (tarefa adicional a criar com ID novo).
- **Responsabilidade e caminhos:** `apps/collector/src/orchestration/` (proposto).
- **Regras, falhas e bordas:** falha de publicação é falha do ciclo; o processo segue vivo para o próximo ciclo. Dado inválido nunca chega a `publish`.
- **Saída:** função de ciclo e testes com fake.
- **Validações:** ET-04-V17, ET-04-V18, ET-04-V20
- **Concluída quando:** sucesso, sem mudança, falha de origem, falha parcial e falha de publicação têm testes separados.
- **Bloqueios ou aprovações:** DP-13; DP-06 se exigido.

### ET-04-T09 — Oferecer execução única

- **Tipo:** código
- **Resultado pretendido:** `--once` roda um ciclo e sai com código que reflete o resultado.
- **Entradas e pré-requisitos:** T08.
- **Ações:**
  1. Ler o argumento em `main.ts`.
  2. Códigos de saída distintos para sucesso, sem mudança e falha, documentados.
- **Responsabilidade e caminhos:** `apps/collector/src/main.ts` (proposto).
- **Regras, falhas e bordas:** execução única não agenda nada.
- **Saída:** modo único.
- **Validações:** ET-04-V19
- **Concluída quando:** o processo termina após um ciclo com o código esperado.
- **Bloqueios ou aprovações:** nenhum.

### ET-04-T10 — Agendar ciclos sem sobreposição

- **Tipo:** código
- **Resultado pretendido:** o próximo ciclo só é agendado depois que o anterior termina (COL-003, TS-013).
- **Entradas e pré-requisitos:** T08.
- **Ações:**
  1. Encadear `setTimeout` após o término do ciclo, com intervalo da configuração.
  2. Ignorar disparo durante ciclo ativo.
  3. Após bloqueio, respeitar o prazo de espera de T04.
  4. Testes com timers falsos.
- **Responsabilidade e caminhos:** `apps/collector/src/schedule/` (proposto).
- **Regras, falhas e bordas:** sem `setInterval` com função assíncrona.
- **Saída:** agendador e testes.
- **Validações:** ET-04-V14
- **Concluída quando:** ciclo longo não gera segundo ciclo simultâneo.
- **Bloqueios ou aprovações:** valor do intervalo em DP-16.

### ET-04-T11 — Encerrar com cancelamento e sem publicação parcial

- **Tipo:** código
- **Resultado pretendido:** `SIGTERM` e `SIGINT` param o agendamento, cancelam requisições e não deixam publicação pela metade.
- **Entradas e pré-requisitos:** T03, T10.
- **Ações:**
  1. `AbortController` do processo propagado ao cliente.
  2. Ao receber sinal: não agendar mais; abortar busca; se a publicação já começou, aguardar seu término até um limite configurado (o publicador preserva o manifesto se for interrompido).
  3. Limpar temporizadores e sair com código definido.
  4. Testes com sinal simulado.
- **Responsabilidade e caminhos:** `apps/collector/src/main.ts`, `schedule/` (propostos).
- **Regras, falhas e bordas:** encerramento não pode atualizar manifesto para conjunto incompleto (garantia de ET-05).
- **Saída:** encerramento e testes.
- **Validações:** ET-04-V15
- **Concluída quando:** sinal durante busca e sinal durante publicação têm testes separados.
- **Bloqueios ou aprovações:** nenhum.

### ET-04-T12 — Registrar logs estruturados sem segredo

- **Tipo:** código
- **Resultado pretendido:** cada ciclo deixa rastro diagnosticável sem expor credencial nem corpo.
- **Entradas e pré-requisitos:** T08.
- **Ações:**
  1. Uma linha JSON por evento: ciclo, etapa, arquivo (chave, não URL com query), status HTTP, duração, versão, resultado.
  2. Redação de campos sensíveis por nome antes de escrever.
  3. Testes do formatador com token de fixture óbvio.
- **Responsabilidade e caminhos:** `apps/collector/src/observability/` (proposto).
- **Regras, falhas e bordas:** sem biblioteca de log nova sem justificativa (SEC-008). Cardinalidade limitada (PERF-003).
- **Saída:** logger e testes.
- **Validações:** ET-04-V16
- **Concluída quando:** token de fixture não aparece em nenhuma saída de teste.
- **Bloqueios ou aprovações:** nenhum.

### ET-04-T13 — Testar repetição, ordem e recuperação com origem local

- **Tipo:** teste
- **Resultado pretendido:** integração do ciclo inteiro contra um servidor local controlado, cobrindo sequências de falha e recuperação.
- **Entradas e pré-requisitos:** T08, T10; fake de T02.
- **Ações:**
  1. Servidor `node:http` local configurável por cenário.
  2. Cenários: sucesso → falha transitória → sucesso; bloqueio → espera → sucesso; respostas em ordem diferente; resposta inválida entre duas válidas.
  3. Medir a duração do ciclo para alimentar DP-16.
- **Responsabilidade e caminhos:** `apps/collector/src/**/*.spec.ts` ou `apps/collector/test/` (proposto).
- **Regras, falhas e bordas:** nenhum destes casos vai ao TSE.
- **Saída:** suíte de integração e medição de duração.
- **Validações:** ET-04-V12, ET-04-V13, ET-04-V20
- **Concluída quando:** os cenários passam e a duração está registrada em evidência.
- **Bloqueios ou aprovações:** nenhum.

### ET-04-T14 — Compor o processo em `main.ts` e ajustar scripts

- **Tipo:** configuração
- **Resultado pretendido:** `pnpm dev:collector` e `pnpm --filter @eleicoes/collector start` executam o processo real.
- **Entradas e pré-requisitos:** T01, T09, T10, T11.
- **Ações:**
  1. Criar `main.ts` que compõe configuração, cliente, publicação e agendador (COL-002).
  2. Substituir [apps/collector/src/index.ts](../../../apps/collector/src/index.ts) ou fazê-lo apontar para `main.ts`; ajustar `dev` e `start` em [apps/collector/package.json](../../../apps/collector/package.json).
  3. Nesta etapa, `publish` é o fake em memória ou um publicador que só registra; o publicador local entra em ET-05-T10.
- **Responsabilidade e caminhos:** `apps/collector/src/main.ts` (proposto).
- **Regras, falhas e bordas:** importar `main.ts` em teste não pode iniciar o processo.
- **Saída:** processo executável.
- **Validações:** ET-04-V19, ET-04-V22
- **Concluída quando:** `--once` contra a origem local termina com o código esperado.
- **Bloqueios ou aprovações:** nenhum.

### ET-04-T15 — Executar uma coleta controlada contra o host oficial

- **Tipo:** teste
- **Resultado pretendido:** confirmar, com uma execução única, que URLs e schemas funcionam com a origem real.
- **Entradas e pré-requisitos:** T14; DP-04 resolvida; autorização com número máximo de requisições.
- **Ações:**
  1. Rodar `--once` com o publicador em memória, contra o ambiente oficial ou simulado autorizado.
  2. Registrar requisições, status, duração e resultado.
  3. Guardar as respostas obtidas como amostras, se úteis, seguindo ET-01-T04.
- **Responsabilidade e caminhos:** evidência em `docs/planejamento/evidencias/ET-04.md` (proposto).
- **Regras, falhas e bordas:** uma execução; em bloqueio, parar e registrar.
- **Saída:** evidência.
- **Validações:** ET-04-V21
- **Concluída quando:** a execução terminou e está registrada, com sucesso ou com a falha explicada.
- **Bloqueios ou aprovações:** DP-04; DP-01 e DP-02 quanto à janela; autorização.

## 8. Contratos e compatibilidade

- Entrada: formato bruto confirmado (ET-01, ET-03). Mudança de formato da origem é detectada pelo schema e vira falha de ciclo, não publicação.
- Saída: assinatura `publish` (T02). Mudar a assinatura exige ajustar ET-05 e ET-08 juntos.
- Configuração: nomes de variáveis viram contrato operacional de ET-09 e ET-10. Renomear exige atualizar `.env.example` e a documentação de operação.

## 9. Segurança, integridade e performance

- R-03 (bloqueio): allowlist, concorrência limitada, parada em bloqueio, sem 404 por tentativa (V05, V08, V09).
- SEC-003: decisão de destino depois de interpretar a URL; redirect é falha (V02, V03).
- SEC-001: limite de tamanho antes do parse (V05).
- SEC-006: log redigido (V16). Credenciais de publicação não passam por esta etapa.
- R-14: queda de total publicada (V10).
- PERF-003: um ciclo, concorrência limitada, cliente reutilizado, sem cópia repetida de objeto grande. Duração medida (V13).
- Custo: nenhum recurso pago. O número de requisições por ciclo, multiplicado pelo intervalo, deve ficar bem abaixo do teto da origem; o cálculo entra em DP-16.

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-04-V01 | Configuração inválida | Variável ausente ou incoerente | Iniciar | Saída com código ≠ 0 e mensagem sem segredo | Processo sobe ou expõe valor | Unitário | Local | T01 |
| ET-04-V02 | Host fora da allowlist | URL com outro host, porta ou esquema | Pedir | Nenhuma conexão aberta; erro tipado | Conexão tentada | Unitário + integração | Local | T03 |
| ET-04-V03 | Redirect | Servidor local responde 302 para outro host | Pedir | Falha; destino não consultado | Destino consultado | Integração | Local | T03 |
| ET-04-V04 | Timeout | Servidor local que não responde | Pedir com timeout curto | Falha por tempo; nenhum conteúdo | Espera indefinida | Integração | Local | T03 |
| ET-04-V05 | Corpo excessivo | Servidor local envia acima do limite | Pedir | Leitura abortada; falha | Corpo lido inteiro | Integração | Local | T03 |
| ET-04-V06 | Status ou tipo inesperado | 500, 200 com HTML | Pedir | Falha tipada | Conteúdo aceito | Integração | Local | T03 |
| ET-04-V07 | Erro transitório | Duas falhas e um sucesso | Ciclo com timers falsos e aleatório fixo | Três chamadas, esperas crescentes | Mais tentativas que o limite ou espera fixa | Unitário | Local | T04 |
| ET-04-V08 | Bloqueio | Resposta de bloqueio com `Retry-After` | Ciclo e avanço de tempo | Nenhuma chamada antes do prazo | Chamada durante o bloqueio | Unitário | Local | T04 |
| ET-04-V09 | Erro permanente | 404 em caminho confirmado | Ciclo | Uma chamada; falha registrada | Repetição | Unitário | Local | T04 |
| ET-04-V10 | Retificação | Fake com versão anterior de total maior | Ciclo com total menor | Publicação chamada | Descarte | Unitário | Local | T07 |
| ET-04-V11 | Sem mudança | Mesmo conteúdo, ou 304 | Ciclo | Nenhuma versão nova; comportamento de DP-14 aplicado | Versão nova só por horário | Unitário | Local | T05, T07 |
| ET-04-V12 | Ordem das respostas | Respostas resolvidas em ordem inversa | Ciclo | Conjunto idêntico ao da ordem direta | Resultado depende da ordem | Unitário + integração | Local | T06, T13 |
| ET-04-V13 | Duração do ciclo | Origem local com tamanhos de ET-01 | Medir ciclos | Duração registrada em evidência | Sem registro | Integração | Local | T13 |
| ET-04-V14 | Sem sobreposição | Ciclo mais longo que o intervalo | Avançar timers | Um ciclo ativo por vez | Dois ciclos simultâneos | Unitário | Local | T10 |
| ET-04-V15 | Encerramento | Sinal durante busca; sinal durante publicação (casos separados) | Enviar sinal | Busca abortada; publicação concluída ou abandonada sem trocar manifesto; saída limpa | Processo pendurado ou publicação parcial | Unitário + integração | Local | T11 |
| ET-04-V16 | Log sem segredo | Contexto com `token-de-teste` | Gerar log de erro | Token ausente | Token presente | Unitário | Local | T12 |
| ET-04-V17 | Falha de publicação | Fake que rejeita | Ciclo | Ciclo em falha; processo segue; versão conhecida inalterada | Falha tratada como sucesso | Unitário | Local | T02, T08 |
| ET-04-V18 | Falha parcial | Um arquivo falha, outros não | Ciclo | Comportamento de DP-13 | Arquivo ausente publicado como vazio ou zero | Unitário | Local | T08 |
| ET-04-V19 | Execução única | Origem local | `--once` | Um ciclo; código de saída documentado | Processo continua ou código errado | Integração | Local | T09, T14 |
| ET-04-V20 | Recuperação | Falha, depois sucesso | Dois ciclos | Segundo ciclo publica | Estado de falha persiste | Integração | Local | T08, T13 |
| ET-04-V21 | Coleta controlada real | Autorização e DP-04 | `--once` contra host autorizado | Requisições registradas dentro do autorizado; schema aceita ou falha explicada | Requisição não registrada, varredura ou repetição em bloqueio | Verificação operacional | Rede real, controlada | T15 |
| ET-04-V22 | Importação sem efeito | Teste que importa os módulos | Importar | Nenhuma requisição, nenhum temporizador | Efeito na importação | Unitário | Local | T01, T14 |

Testes locais não provam o comportamento real da origem sob carga, nem a publicação. V21 prova uma execução, não um regime contínuo.

## 11. Infraestrutura e ações externas

Nenhum recurso de nuvem. Ação externa única: T15, com autorização e contagem de requisições.

## 12. Falha, reversão e recuperação

- **Detecção:** log de ciclo com resultado; código de saída em `--once`.
- **Código:** reversão por commit; nenhuma publicação real depende desta etapa.
- **Dados:** nenhum dado publicado. O fake em memória não persiste.
- **Origem bloqueou:** parar; aguardar prazo; registrar. Não mudar de rede para contornar.

## 13. Critérios de conclusão

- [ ] Módulos de COL-001 que foram necessários existem, com `main.ts` compondo.
- [ ] V01–V20 e V22 aprovadas na suíte local.
- [ ] V21 executada com autorização, ou registrada como pendente por DP-04 ou DP-02.
- [ ] `.env.example` lista as variáveis sem valores sensíveis.
- [ ] Duração do ciclo registrada para DP-16.

## 14. Pendências e passagem adiante

- DP-16 continua aberta para os valores de operação contínua.
- Se DP-06 exigir JWS, criar tarefa nova nesta etapa antes de ET-08-T07.
- ET-05 recebe: a assinatura `publish`, o conjunto de um ciclo e o processo em `main.ts`.
- ET-09 recebe: o processo com encerramento limpo e logs em saída padrão.

## 15. Brief de execução

Construir o processo do coletor em módulos (COL-001): configuração validada, cliente com allowlist e limites sem redirect, tentativas limitadas com parada em bloqueio, concorrência limitada, detecção de mudança por conteúdo, ciclo orquestrado, execução única, agendamento sem sobreposição, encerramento com cancelamento e log sem segredo. Publicar só através de `publish` (fake em memória nesta etapa). Testar com servidor local; uma coleta real só com autorização. Validações V01–V22. Referências: COL-001 a COL-005, SEC-001, SEC-003, SEC-006, PERF-003.
