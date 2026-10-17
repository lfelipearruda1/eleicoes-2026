# Prompt — executar uma etapa

[Planejamento](../README.md) · [Catálogo das etapas](../etapas/README.md) · [Plano mestre](../plano-mestre.md)

Este arquivo é um prompt para uma sessão futura de agente (Cursor, Claude Code ou equivalente). Ele executa **uma** etapa já planejada. Não planeja o projeto de novo e não gera outro prompt. Os planos das 16 etapas já existem em [etapas/](../etapas/README.md); este prompt não os substitui.

Copie o bloco abaixo, preencha os parâmetros e envie.

---

```text
Você está trabalhando no repositório eleicoes-2026.

PARÂMETROS
ETAPA: <ID, por exemplo ET-00. Se vazio, ver "Sem ETAPA" abaixo>
TAREFAS: <opcional: lista de IDs, por exemplo ET-04-T01, ET-04-T03. Vazio = todas as tarefas elegíveis da etapa>
AMBIENTE: <opcional: local | homologação | produção. Obrigatório quando a etapa toca nuvem>
AUTORIZAÇÕES: <opcional: ações externas autorizadas por escrito, por exemplo
  "criar bucket R2 de homologação, teto X", "uma execução única contra o host oficial,
  no máximo N requisições". Vazio = nenhuma ação externa autorizada>
MODO: <executar | revisar | planejar. Padrão: executar>

SEM ETAPA
Se ETAPA estiver vazio: leia docs/planejamento/etapas/README.md, indique a primeira
etapa elegível e as tarefas que podem começar, explique por quê, e pare. Não altere
nenhum arquivo.

MODO
- revisar: leia e relate divergências entre plano, catálogo e repositório. Não implemente.
- planejar: atualize somente Markdown em docs/planejamento/. Não implemente.
- executar: siga as instruções abaixo.
Pedido de revisão ou de planejamento nunca é autorização de implementação.

1. LER ANTES DE TOCAR EM QUALQUER COISA
- Instruções locais: AGENTS.md e .cursor/rules/ se existirem (hoje não existem; confirme).
- docs/planejamento/README.md, plano-mestre.md, etapas/README.md (estado),
  o plano da ETAPA em etapas/, decisoes-e-riscos.md e rastreabilidade.md.
- Os guias citados pelo plano (padroes/, seguranca/, testes/, collector/, web/, dados/,
  infraestrutura/). Leia as regras citadas pelo ID; não reescreva os guias.
- Evidências anteriores em docs/planejamento/evidencias/, se existirem.

2. CONFERIR O ESTADO REAL
- Rode `git status` e preserve alterações existentes. Não reverta nada que não é seu.
- Confira os critérios de entrada da seção 4 do plano contra o repositório e o catálogo.
- Para cada tarefa pedida, verifique se já foi concluída com evidência. Se sim, não refaça;
  registre e passe para a próxima.
- Se uma dependência de implementação, contrato, decisão (DP-NN) ou recurso externo não
  estiver atendida, a tarefa não é elegível.

3. SELECIONAR O ESCOPO
- Elegíveis = tarefas pedidas (ou todas da etapa) cujos bloqueios estão resolvidos.
- Liste as elegíveis e as bloqueadas, com o motivo de cada bloqueio, antes de começar.
- Não amplie o escopo: nada de outras etapas, nada de componente condicional
  (API, banco, Redis, balanceador, SSE, WebSocket, fila, Worker na leitura).

4. EXECUTAR
- Siga a ordem das ações de cada cartão.
- Incrementos pequenos e revisáveis: uma tarefa por vez, com seus testes no mesmo passo.
- Padrões do projeto: módulos com responsabilidade clara, SOLID sem camada artificial,
  guard clauses, if permitido, sem else / else if no código novo, testes AAA com um
  comportamento por teste, sem rede nem relógio real nos unitários.
- Dependência nova só quando o cartão prevê, com versão fixa e justificativa (SEC-008).
- Se descobrir que o plano está errado ou incompleto, pare essa tarefa, registre a
  divergência e proponha a correção no plano. Não improvise contrato.

5. AÇÕES EXTERNAS
- Não crie recurso, não gaste orçamento, não publique, não faça deploy, não consulte
  o TSE e não exponha endpoint sem a autorização correspondente em AUTORIZAÇÕES e sem
  as decisões que o cartão exige.
- Nunca faça carga contra o TSE. Consulta à origem é única, contada e dentro do limite
  autorizado; pare diante de bloqueio.
- Não invente credencial, ID de conta, domínio, URL, código eleitoral, candidato,
  lista de UF, TTL, intervalo, orçamento nem meta. Se faltar, a tarefa fica bloqueada.
- Não leia, imprima nem copie segredos. Não coloque segredo em código, exemplo, log,
  documento ou commit.

6. VALIDAR E REGISTRAR
- Execute as validações (ET-XX-Vnn) das tarefas feitas. Para cada uma, registre:
  comando ou ação, ambiente, resultado observado, se passou, limitação.
- Registre em docs/planejamento/evidencias/ET-XX.md (crie se não existir, conforme a
  convenção de ET-00-T04).
- Não declare aprovado o que não executou. Não fabrique saída, captura ou medição.
  `pnpm test` com zero testes não prova suíte.

7. ATUALIZAR ESTADO
- Atualize docs/planejamento/etapas/README.md somente nas células afetadas e somente
  com evidência. "Concluída com evidências" exige todos os critérios da seção 13.
- Decisão tomada: registre como DA-NN em decisoes-e-riscos.md e marque a DP como resolvida.
- Mudança de contrato: atualize docs/dados no mesmo conjunto (PKG-003).

8. BLOQUEIOS
- Interrompa apenas a tarefa bloqueada; continue as independentes.
- Preserve o trabalho já feito. Não apague arquivos para "recomeçar".

9. ENCERRAR
- Pare ao terminar o escopo selecionado. Não comece a próxima etapa.
- Não faça commit nem push, salvo pedido explícito.
- Relato final:
  a. tarefas concluídas, com as validações e o resultado de cada uma;
  b. tarefas bloqueadas e o que as desbloqueia;
  c. arquivos alterados;
  d. comandos executados e o que não foi executado;
  e. decisões registradas e riscos novos;
  f. estado atualizado no catálogo;
  g. próxima ação recomendada (sem executá-la).
```

---

## Notas de uso

- Uma sessão, uma etapa. Para fazer duas etapas, rode o prompt duas vezes.
- Para tarefas de nuvem, escreva em AUTORIZAÇÕES o recurso, o ambiente e o teto. Sem isso, o executor deve parar antes de criar o recurso.
- O antigo [gerar-documentacao-das-etapas.md](gerar-documentacao-das-etapas.md) não é mais pré-requisito: os planos já foram escritos.
