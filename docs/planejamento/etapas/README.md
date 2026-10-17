# Catálogo das etapas

[Planejamento](../README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md) · [Modelo de plano](../modelos/plano-de-etapa.md)

Este catálogo é a **única** referência de estado das etapas. Os planos individuais não repetem estado, para não divergir. Quem mudar um estado aqui cita a evidência (registro em `docs/planejamento/evidencias/`, proposto em ET-00-T04).

## Estados

Os três eixos são independentes. Detalhar um plano não inicia a implementação; existir arquivo no repositório não conclui a etapa.

| Estado documental | Significado |
| --- | --- |
| Em detalhamento | O plano está sendo escrito |
| Detalhada para investigação | O plano detalha uma investigação; o que ela concluir pode mudar as etapas seguintes |
| Detalhada com bloqueios | O plano está completo e registra decisões ou recursos pendentes que bloqueiam parte das tarefas |
| Detalhada e pronta para execução | O plano está completo e não há bloqueio documental para começar |

| Estado da implementação | Significado |
| --- | --- |
| Não verificada | Há artefatos relacionados, mas a verificação da etapa não foi executada |
| Não iniciada | Há evidência suficiente de que a entrega não existe |
| Parcial | Parte verificável existe; a entrega principal não |
| Bloqueada | O trabalho começou e parou numa decisão ou recurso nomeado |
| Concluída com evidências | Os critérios de conclusão do plano foram observados e registrados |

| Prontidão | Significado |
| --- | --- |
| Pode iniciar | Critérios de entrada atendidos |
| Pode iniciar tarefas independentes | Só as tarefas indicadas, que não dependem do que está pendente |
| Não pode iniciar até resolver bloqueios | Nenhuma tarefa útil sem a dependência indicada |

## Estado atual

Classificação de 17/10/2026, por inspeção de arquivos. Nenhum comando foi executado, nenhum recurso foi criado, nenhuma consulta ao TSE foi feita.

| ID | Etapa | Plano | Marco | Dependências formais | Estado documental | Implementação | Prontidão |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ET-00 | Base e prontidão | [00-base-e-prontidao.md](00-base-e-prontidao.md) | M0 | — | Detalhada e pronta para execução | Não verificada: scaffold e `dist` de 14/10 existem; comandos não reexecutados; shell padrão com Node 18 | Pode iniciar |
| ET-01 | Validação dos dados do TSE | [01-validacao-dados-tse.md](01-validacao-dados-tse.md) | M1 | ET-00 | Detalhada para investigação | Não iniciada: não há amostra nem matriz | Pode iniciar tarefas independentes: T01, T09 (leitura). Amostras esperam DP-02 e ET-00-T04 |
| ET-02 | Contrato e snapshots | [02-contrato-e-snapshots.md](02-contrato-e-snapshots.md) | M1 | ET-01 | Detalhada com bloqueios | Não iniciada: não há contrato além do conceitual | Pode iniciar tarefas independentes: T01, T02, T07 a T12 |
| ET-03 | Validação e normalização | [03-validacao-e-normalizacao.md](03-validacao-e-normalizacao.md) | M2 | ET-02 | Detalhada com bloqueios | Não iniciada: `packages/validation/src/index.ts` exporta vazio | Não pode iniciar até resolver bloqueios: DP-18 (ET-00) e contrato de ET-02 |
| ET-04 | Collector | [04-coletor.md](04-coletor.md) | M2 | ET-03 | Detalhada com bloqueios | Não iniciada: `index.ts` só registra mensagem | Não pode iniciar até resolver bloqueios: ET-03 em andamento |
| ET-05 | Publicação local | [05-publicacao-local.md](05-publicacao-local.md) | M2 | ET-04 | Detalhada com bloqueios | Não iniciada | Não pode iniciar até resolver bloqueios: contrato de ET-02 e schemas de ET-03 |
| ET-06 | Web mínimo local | [06-web-minimo-local.md](06-web-minimo-local.md) | M2 | ET-05 | Detalhada com bloqueios | Não iniciada: `App.tsx` mostra só o título | Não pode iniciar até resolver bloqueios: contrato e schemas |
| ET-07 | Cloudflare homologação | [07-cloudflare-homologacao.md](07-cloudflare-homologacao.md) | M3 | ET-06 | Detalhada com bloqueios | Não iniciada: `infra/cloudflare` só tem `.gitkeep` | Pode iniciar tarefas independentes: T01 a T04 (decisões, sem criar recurso) |
| ET-08 | Integração com a Cloudflare | [08-integracao-cloudflare.md](08-integracao-cloudflare.md) | M3 | ET-07 | Detalhada com bloqueios | Não iniciada | Não pode iniciar até resolver bloqueios: ET-05, ET-07, DP-24 |
| ET-09 | Containerização | [09-containerizacao.md](09-containerizacao.md) | M4 | ET-05 | Detalhada com bloqueios | Não iniciada: não há Dockerfile | Não pode iniciar até resolver bloqueios: ET-05 |
| ET-10 | AWS e operação do collector | [10-aws-e-operacao-do-coletor.md](10-aws-e-operacao-do-coletor.md) | M4 | ET-08, ET-09 | Detalhada com bloqueios | Não iniciada | Pode iniciar tarefas independentes: T01 como rascunho de decisões |
| ET-11 | Web completo | [11-web-completo.md](11-web-completo.md) | M5 | ET-08 (início parcial após ET-06) | Detalhada com bloqueios | Não iniciada | Pode iniciar tarefas independentes: T01 (fonte cartográfica) |
| ET-12 | Automação e operação | [12-automacao-e-operacao.md](12-automacao-e-operacao.md) | M6 | ET-10, ET-11 | Detalhada com bloqueios | Não iniciada: `.github/workflows` só tem `.gitkeep` | Não pode iniciar até resolver bloqueios: primeira suíte (ET-03) para o workflow mínimo |
| ET-13 | Capacidade, segurança e resiliência | [13-capacidade-seguranca-e-resiliencia.md](13-capacidade-seguranca-e-resiliencia.md) | M6 | ET-12 | Detalhada com bloqueios | Não iniciada: `tests/load` só tem `.gitkeep` | Pode iniciar tarefas independentes: T01 como texto, sem execução |
| ET-14 | Entrada em produção | [14-entrada-em-producao.md](14-entrada-em-producao.md) | M7 | ET-13 | Detalhada com bloqueios | Não iniciada | Pode iniciar tarefas independentes: T01 (redação dos critérios) |
| ET-15 | Continuidade e encerramento | [15-continuidade-e-encerramento.md](15-continuidade-e-encerramento.md) | M8 | ET-14 para executar | Detalhada com bloqueios | Não iniciada | Pode iniciar tarefas independentes: T01 (política) |

**Primeira etapa elegível:** ET-00. Primeiras tarefas: ET-00-T01 (versões efetivas), ET-00-T02 (comandos), ET-00-T03 (DP-18). Em paralelo, sem conflito: ET-01-T01 e ET-01-T09 (leitura de documentos oficiais).

API, PostgreSQL, Redis, balanceador, SSE, WebSocket e filas não têm etapa neste catálogo (DA-05).

## Como atualizar

1. Mudar só a célula afetada, citando a evidência.
2. "Concluída com evidências" exige todos os itens da seção 13 do plano com registro.
3. Se uma tarefa nova for criada num plano, ela recebe o próximo número livre da etapa; o catálogo não muda por isso.
4. Se uma decisão pendente for resolvida, a prontidão das etapas que ela bloqueava é revista aqui.

## Histórico

- **15/10/2026:** catálogo criado com todas as etapas "Não detalhada"; documentos individuais apenas previstos, sem arquivo. O prompt `prompts/gerar-documentacao-das-etapas.md` deveria criá-los.
- **17/10/2026:** os 16 planos foram escritos diretamente nesta revisão, sem executar aquele prompt. Cinco caminhos previstos mudaram de nome; os antigos nunca existiram, então nenhum arquivo foi substituído:

| ID | Caminho previsto antes | Caminho atual |
| --- | --- | --- |
| ET-00 | `00-base-do-projeto.md` | `00-base-e-prontidao.md` |
| ET-05 | `05-publicacao-e-snapshots-locais.md` | `05-publicacao-local.md` |
| ET-06 | `06-interface-funcional-inicial.md` | `06-web-minimo-local.md` |
| ET-09 | `09-container-do-coletor.md` | `09-containerizacao.md` |
| ET-11 | `11-frontend-completo.md` | `11-web-completo.md` |

Os nomes das etapas também foram ajustados aos títulos dos planos (por exemplo, "Construir a primeira interface funcional" → "Web mínimo local"). O escopo de cada ID foi mantido.
