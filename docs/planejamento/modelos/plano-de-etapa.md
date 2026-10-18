# Modelo de plano de etapa

[Planejamento](../README.md) · [Plano mestre](../plano-mestre.md) · [Catálogo das etapas](../etapas/README.md)

Este modelo define o formato dos planos em [etapas/](../etapas/README.md). Ele serve para criar uma etapa nova ou reescrever uma existente. Copie o bloco "Modelo" para `docs/planejamento/etapas/NN-nome-curto.md` e substitua cada instrução entre `<>` pelo conteúdo real.

## Regras de preenchimento

- **Conteúdo específico.** Cada seção descreve esta etapa. Uma seção que poderia estar em qualquer outro plano sem mudança está genérica demais. Se a seção não se aplica, diga em uma frase por quê.
- **Fato, decisão, proposta e desconhecido.** Marque o que foi observado no repositório (com caminho), o que é decisão adotada (`DA-NN`), o que é proposta e o que é pendente (`DP-NN`). Caminho que não existe aparece em código e com "(proposto)", nunca como link.
- **Status fora do plano.** Estado documental, estado da implementação e prontidão ficam somente no [catálogo](../etapas/README.md). O plano não repete esses valores, para não divergir.
- **Sem números inventados.** Prazos, responsáveis, orçamento, carga, intervalos, TTLs e metas de recuperação aparecem como decisão pendente, com a indicação de quem ou de qual evidência decide e em que ponto o valor é necessário.
- **Guias por referência.** Cite o identificador da regra (`COL-005`, `SEC-003`, `TEST-001`...) e o link do guia. Não copie o texto da regra.
- **IDs estáveis.** Tarefas `ET-XX-TYY`, validações `ET-XX-VYY`. Não renumere para melhorar a aparência. Tarefa substituída fica no lugar com "Substituída por ET-XX-TZZ" e o motivo.
- **Granularidade.** Uma tarefa produz algo revisável e verificável. "Implementar collector" é grande demais; "renomear arquivo" isolado é pequeno demais.
- **Evidência real.** Não registre comando como aprovado sem execução. Não escreva resultado de benchmark, log ou captura que não exista.

### Classificação de comandos

| Classe                                           | Uso                                                    |
| ------------------------------------------------ | ------------------------------------------------------ |
| Existente e verificado por inspeção              | O script existe no `package.json`; o conteúdo foi lido |
| Existente, não executado nesta tarefa            | Existe, mas o resultado não foi observado              |
| Proposto para criação futura                     | Ainda não existe; a etapa o cria                       |
| Dependente de ferramenta ou configuração ausente | Exige instalação ou recurso que ainda não existe       |

### Níveis de validação

Unitário, integração, interface, ponta a ponta, homologação, carga e resiliência, verificação operacional. Os significados estão em [testes/seguranca.md](../../testes/seguranca.md) e no [plano mestre](../plano-mestre.md#7-estratégia-de-testes-e-segurança). Mock não prova CDN, permissão nem transação real. Ausência de teste não é aprovação.

### Tipos de dependência

Separe sempre: **implementação** (código de outra etapa precisa existir), **contrato** (formato precisa estar definido), **decisão** (`DP-NN` precisa estar resolvida) e **recurso externo** (conta, domínio, credencial, dado oficial).

## Modelo

```markdown
# ET-XX — <Nome da etapa>

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo              | Conteúdo                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| ID                 | ET-XX                                                                         |
| Componente         | <aplicação, pacote, recurso de nuvem ou operação>                             |
| Tipo predominante  | <investigação, código, infraestrutura, integração, operação, documentação>    |
| Marco              | <M0 a M8, ou contribuição para um marco>                                      |
| Resultado concreto | <o que passa a ser possível, observável por alguém que não escreveu o código> |

## 2. Escopo e exclusões

<O que a etapa faz. Depois, o que não pode ser antecipado, com o motivo ou a etapa que o fará.>

## 3. Contexto e evidências

<Documentos lidos, com link. Estado observado no repositório, com caminho real e data da inspeção. Caminhos inexistentes marcados como propostos.>

## 4. Dependências e critérios de entrada

| Tipo            | Item             | Bloqueia  |
| --------------- | ---------------- | --------- |
| Implementação   | <ET-YY: entrega> | <tarefas> |
| Contrato        | <...>            | <...>     |
| Decisão         | <DP-NN>          | <...>     |
| Recurso externo | <...>            | <...>     |

<Quais tarefas podem começar apesar dos bloqueios.>

## 5. Entradas e saídas

<Artefatos recebidos e a garantia exigida de cada um. Artefatos produzidos e quem os consome.>

## 6. Responsabilidades e fronteiras

<Qual módulo decide, qual adapta transporte, qual produz efeito. Onde a lógica não pode ser duplicada entre web, coletor e API.>

## 7. Sequência de tarefas

### ET-XX-T01 — <Verbo + entrega específica>

- **Tipo:** <código | infraestrutura | configuração | investigação | teste | documentação>
- **Resultado pretendido:** <...>
- **Entradas e pré-requisitos:** <...>
- **Ações:**
  1. <...>
- **Responsabilidade e caminhos:** <existentes como link; propostos em código com "(proposto)">
- **Regras, falhas e bordas:** <...>
- **Saída:** <...>
- **Validações:** <ET-XX-Vnn>
- **Concluída quando:** <critério objetivo>
- **Bloqueios ou aprovações:** <DP-NN, autorização, ou "nenhum">

## 8. Contratos e compatibilidade

<Dados afetados, mudança esperada, consumidores, versionamento, decisões que não podem ser tomadas em silêncio.>

## 9. Segurança, integridade e performance

<Riscos concretos desta etapa (R-NN), controles, limites, métricas e custo relevante. Não repetir lista genérica.>

## 10. Plano de validação

| ID  | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | ------- | ---------- | ---- | ------- | -------- | ----- | -------- | ------ |

<O que esses níveis não provam.>

## 11. Infraestrutura e ações externas

<Recurso, acesso, trabalho manual, trabalho automatizável, aprovação. Se não se aplica, dizer isso.>

## 12. Falha, reversão e recuperação

<Como detectar. Como preservar o estado válido. Reversão de código, de dados, de configuração e de infraestrutura, separadas.>

## 13. Critérios de conclusão

- [ ] <código>
- [ ] <testes>
- [ ] <integração>
- [ ] <documentação>
- [ ] <operação>

## 14. Pendências e passagem adiante

<O que falta decidir, o que bloqueia, e o que a próxima etapa recebe.>

## 15. Brief de execução

<Objetivo, tarefas, referências, exclusões e validações em poucas linhas. Não substitui o plano.>
```

## Checklist de revisão de um plano

- Os 15 itens existem e têm conteúdo da etapa.
- Todo cartão tem as dez partes e pelo menos uma validação.
- Toda validação aponta para uma tarefa e diz o que caracteriza falha.
- Dependências citam IDs que existem no [catálogo](../etapas/README.md) e não criam ciclo.
- Toda `DP-NN` e todo `R-NN` citados existem em [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- Nenhum caminho proposto aparece como link.
- Nenhum status de implementação aparece no plano.
- Requisitos atendidos aparecem em [rastreabilidade.md](../rastreabilidade.md).
