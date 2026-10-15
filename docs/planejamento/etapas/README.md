# Catálogo das etapas

[Voltar ao plano geral](../README.md)

Este catálogo é a referência do estado das etapas. O plano geral descreve objetivo, dependência, entrega e critério de saída. Os documentos individuais ainda não foram escritos. O caminho previsto aparece como texto, para não apontar para arquivo inexistente. Quando o prompt de detalhamento criar um documento, ele troca esse texto por um link válido e atualiza só a coluna de documentação.

Estados de documentação e de implementação são independentes. Detalhar um plano não inicia a implementação. Existir código no repositório não conclui a etapa.

| Documentação | Significado |
| --- | --- |
| Não detalhada | Não há documento individual da etapa |
| Detalhada com pendências | O documento existe e registra decisão ainda aberta |
| Detalhada e revisada | O documento foi relido e os links e as pendências foram conferidos |

| Implementação | Significado |
| --- | --- |
| Não verificada | Há artefato relacionado, e a verificação desta etapa ainda não foi executada |
| Não iniciada | O trabalho da etapa ainda não começou |
| Parcial | Parte verificável da etapa existe, e a entrega principal ainda não |
| Bloqueada | A etapa espera uma decisão ou um resultado nomeado |
| Concluída com evidências | O critério de saída foi observado e a evidência está registrada |

A implementação abaixo foi classificada na inspeção de 15 de outubro de 2026, sem executar build, testes nem provisionamento. ET-00 está como não verificada porque a base existe e os comandos não foram reexecutados nesta sessão. As demais estão como não iniciadas: o título inicial de `apps/web` e a mensagem de `apps/collector/src/index.ts` não são as entregas de ET-04, ET-05 ou ET-06.

| ID | Nome | Documento | Documentação | Implementação | Dependências | Plano |
| --- | --- | --- | --- | --- | --- | --- |
| ET-00 | Verificar a base do projeto e as pendências documentais | `docs/planejamento/etapas/00-base-do-projeto.md` | Não detalhada | Não verificada | Nenhuma | [Plano geral](../README.md) |
| ET-01 | Validar as fontes e os dados do TSE | `docs/planejamento/etapas/01-validacao-dados-tse.md` | Não detalhada | Não iniciada | ET-00 | [Plano geral](../README.md) |
| ET-02 | Consolidar o contrato público e a política de snapshots | `docs/planejamento/etapas/02-contrato-e-snapshots.md` | Não detalhada | Não iniciada | ET-01 | [Plano geral](../README.md) |
| ET-03 | Implementar validação e normalização | `docs/planejamento/etapas/03-validacao-e-normalizacao.md` | Não detalhada | Não iniciada | ET-02 | [Plano geral](../README.md) |
| ET-04 | Implementar o coletor | `docs/planejamento/etapas/04-coletor.md` | Não detalhada | Não iniciada | ET-01, ET-03 | [Plano geral](../README.md) |
| ET-05 | Implementar publicação e snapshots locais | `docs/planejamento/etapas/05-publicacao-e-snapshots-locais.md` | Não detalhada | Não iniciada | ET-02, ET-03; fluxo único também exige ET-04 | [Plano geral](../README.md) |
| ET-06 | Construir a primeira interface funcional | `docs/planejamento/etapas/06-interface-funcional-inicial.md` | Não detalhada | Não iniciada | ET-04, ET-05 | [Plano geral](../README.md) |
| ET-07 | Preparar a homologação na Cloudflare | `docs/planejamento/etapas/07-homologacao-cloudflare.md` | Não detalhada | Não iniciada | ET-05, ET-06 | [Plano geral](../README.md) |
| ET-08 | Integrar o código à Cloudflare | `docs/planejamento/etapas/08-integracao-cloudflare.md` | Não detalhada | Não iniciada | ET-04, ET-06, ET-07 | [Plano geral](../README.md) |
| ET-09 | Containerizar e validar o coletor localmente | `docs/planejamento/etapas/09-container-do-coletor.md` | Não detalhada | Não iniciada | ET-08 | [Plano geral](../README.md) |
| ET-10 | Preparar a AWS e operar o coletor | `docs/planejamento/etapas/10-aws-e-operacao-do-coletor.md` | Não detalhada | Não iniciada | ET-09 | [Plano geral](../README.md) |
| ET-11 | Completar o frontend | `docs/planejamento/etapas/11-frontend-completo.md` | Não detalhada | Não iniciada | ET-06 para implementar; ET-08 para concluir na homologação | [Plano geral](../README.md) |
| ET-12 | Consolidar automação e operação | `docs/planejamento/etapas/12-automacao-e-operacao.md` | Não detalhada | Não iniciada | ET-10, ET-11 | [Plano geral](../README.md) |
| ET-13 | Validar capacidade, segurança e resiliência | `docs/planejamento/etapas/13-capacidade-seguranca-e-resiliencia.md` | Não detalhada | Não iniciada | ET-12 | [Plano geral](../README.md) |
| ET-14 | Preparar e executar a entrada em produção | `docs/planejamento/etapas/14-entrada-em-producao.md` | Não detalhada | Não iniciada | ET-13 | [Plano geral](../README.md) |
| ET-15 | Planejar continuidade e encerramento operacional | `docs/planejamento/etapas/15-continuidade-e-encerramento.md` | Não detalhada | Não iniciada | ET-14 para executar desligamento; decisão de retenção antes de qualquer exclusão | [Plano geral](../README.md) |

API, PostgreSQL, Redis, balanceador, SSE, WebSocket e filas não têm etapa neste catálogo.

[Voltar ao plano geral](../README.md)
