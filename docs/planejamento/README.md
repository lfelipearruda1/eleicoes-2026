# Planejamento

[Voltar ao contexto](../contexto.md)

Porta de entrada do planejamento da primeira versão do eleicoes-2026. Aqui estão a sequência de desenvolvimento, os planos de cada etapa, as decisões, os riscos e a forma de executar uma etapa.

Planejar não é implementar. Uma decisão adotada não é recurso provisionado; um arquivo no repositório não é funcionalidade testada; um plano detalhado não é etapa iniciada. Os rótulos de estado do projeto estão em [contexto.md](../contexto.md).

## Estrutura

```text
docs/planejamento/
├── README.md                  # esta página
├── plano-mestre.md            # escopo, sequência, dependências, marcos, estratégia
├── rastreabilidade.md         # requisito → tarefa → validação → evidência
├── decisoes-e-riscos.md       # DA (adotadas), DP (pendentes), R (riscos)
├── modelos/
│   └── plano-de-etapa.md      # formato e instruções de preenchimento
├── etapas/
│   ├── README.md              # catálogo e ÚNICA referência de estado
│   └── 00 … 15-*.md           # planos individuais ET-00 a ET-15
└── prompts/
    ├── executar-etapa.md      # prompt para executar UMA etapa
    └── gerar-documentacao-das-etapas.md  # histórico; não é mais pré-requisito
```

`docs/planejamento/evidencias/` é proposto (ET-00-T04) e ainda não existe. Cada etapa registrará ali comandos, resultados e limitações quando for executada.

## Como usar

**Para entender o projeto:** [contexto.md](../contexto.md) → [plano-mestre.md](plano-mestre.md) → [catálogo](etapas/README.md).

**Para saber o que pode começar agora:** a coluna "Prontidão" do [catálogo](etapas/README.md). Hoje a primeira etapa elegível é ET-00.

**Para executar uma etapa:** use [prompts/executar-etapa.md](prompts/executar-etapa.md) com o ID da etapa. O executor lê o plano, confere critérios de entrada, executa só tarefas elegíveis, registra evidências e atualiza o catálogo com base nelas.

**Para mudar o plano:** edite o plano da etapa seguindo o [modelo](modelos/plano-de-etapa.md). Não renumere tarefas; marque substituições. Atualize [rastreabilidade.md](rastreabilidade.md) na mesma mudança.

**Para registrar uma decisão:** em [decisoes-e-riscos.md](decisoes-e-riscos.md), crie um `DA-NN` e marque o `DP-NN` como resolvido. Revise a prontidão das etapas afetadas no catálogo.

## Convenções

| Item | Formato | Onde |
| --- | --- | --- |
| Etapa | `ET-00` a `ET-15` | [Catálogo](etapas/README.md) |
| Tarefa | `ET-XX-TYY` | Seção 7 de cada plano |
| Validação | `ET-XX-VYY` | Seção 10 de cada plano |
| Marco | `M0` a `M8` | [Plano mestre](plano-mestre.md#6-marcos) |
| Requisito | `PL-REQ-NNN` | [Rastreabilidade](rastreabilidade.md) |
| Decisão adotada, decisão pendente, risco | `DA-NN`, `DP-NN`, `R-NN` | [Decisões e riscos](decisoes-e-riscos.md) |
| Regras de engenharia | `SEC-`, `COL-`, `WEB-`, `PKG-`, `PERF-`, `TEST-`, `STYLE-`, `REV-`, `CC-` | Guias em `docs/` (referenciados, não copiados) |

## Relação com os outros documentos

- A arquitetura não muda aqui: vale [arquitetura/README.md](../arquitetura/README.md).
- A ordem de [infraestrutura/README.md](../infraestrutura/README.md) (dez passos) e as seis etapas de [collector/README.md](../collector/README.md) continuam válidas como visão daqueles documentos; ET-00 a ET-15 as decompõem.
- Este planejamento substitui a versão anterior desta página (plano geral, commit `cb42977`). O conteúdo dela foi integrado: seções A–C, D, E, F, J → [plano-mestre.md](plano-mestre.md); seção G → [decisoes-e-riscos.md](decisoes-e-riscos.md); seção I → [rastreabilidade.md](rastreabilidade.md); seção H → seção 2 do plano mestre.

## Revisão desta versão

Revisão documental feita em 17/10/2026, depois de escrever todos os arquivos. Somente leitura do repositório e verificações de texto; nenhum script da aplicação foi executado.

| Verificação | Resultado |
| --- | --- |
| Existência dos 16 planos | Os 16 arquivos `etapas/00` a `etapas/15` existem e seguem as 15 seções do modelo |
| Conteúdo específico | Cada plano tem tarefas e validações próprias da etapa (174 tarefas e 205 validações no total) |
| IDs | Toda referência `ET-XX-TYY` e `ET-XX-VYY` em `docs/planejamento/` aponta para um cartão ou linha existente; toda validação está ligada a pelo menos uma tarefa |
| Links relativos | Conferidos por script local, inclusive âncoras; nenhum link renderizado para arquivo inexistente. As únicas exceções detectadas são os links dentro do bloco de código do [modelo](modelos/plano-de-etapa.md), relativos ao plano que será criado, e não renderizados como link. Caminhos propostos aparecem como código |
| Dependências | Grafo sem ciclo; igual ao ponto de partida definido; diferenças em relação ao plano anterior justificadas no [plano mestre](plano-mestre.md#4-dependências) |
| Entradas e saídas encadeadas | Contrato (ET-02) → schemas e normalização (ET-03) → `publish` e ciclo (ET-04) → publicador local e suíte de contrato (ET-05) → leitura web (ET-06) → publicador R2 com a mesma suíte (ET-08) → web completo (ET-11) |
| Requisitos | `PL-REQ-001` a `PL-REQ-028`, cada um com tarefa e validação |
| Tarefas sem requisito | Todas justificadas por risco ou por habilitar outra tarefa ([rastreabilidade.md](rastreabilidade.md#tarefas-habilitadoras-e-de-registro)) |
| Bloqueios | Cada `DP-NN` lista só as tarefas que bloqueia; nenhuma bloqueia ET-00 |
| Componentes condicionais | API, banco, Redis, balanceador, SSE, WebSocket, filas e Worker na leitura continuam fora (DA-05) |
| Hospedagem do site | Workers Static Assets; Pages não é destino (DA-01) |
| Estado | Nenhuma etapa marcada como concluída; nenhum comando declarado como aprovado |
| Escopo da alteração | Somente Markdown em `docs/planejamento/` e o parágrafo de planejamento em [contexto.md](../contexto.md) |

## Limitações desta revisão

- Comandos de build, tipos, lint e testes não foram executados. O shell padrão da máquina estava com Node 18.20.8 e sem pnpm 12.11.2 disponível; isso está registrado como primeira tarefa de ET-00.
- Nenhuma página do TSE, da Cloudflare ou da AWS foi reaberta. Datas, códigos, limites e comportamentos citados vêm da documentação do repositório (consulta de 14/10/2026) e precisam ser reconfirmados pela etapa que os usa.
- A data do segundo turno registrada no repositório (25/10/2026) está a oito dias desta revisão. O plano não estima duração; o alcance temporal é a decisão pendente DP-01.
- Responsáveis, prazos, orçamento, metas e valores operacionais não existem no repositório e ficaram como decisões pendentes, com o ponto em que cada um é necessário.

[Voltar ao contexto](../contexto.md)
