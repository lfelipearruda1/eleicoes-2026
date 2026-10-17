# ET-15 — Continuidade e encerramento

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-15 |
| Componente | Operação de produção e homologação depois do período principal: site, R2, coletor, credenciais, custos |
| Tipo predominante | Decisão e operação |
| Marco | M8 — Continuidade ou encerramento controlado |
| Resultado concreto | Existe uma decisão escrita sobre o que continua no ar, por quanto tempo e com qual custo; o histórico está preservado e rastreável; a interface informa que a atualização terminou; coleta, credenciais e recursos foram ajustados só no que a decisão autorizou; nada foi apagado automaticamente |

## 2. Escopo e exclusões

A política (T01) pode e deve ser escrita antes da produção, porque ET-14-T01 a exige. A execução (T02 em diante) acontece depois de ET-14. Isso não cria ciclo: ET-14 depende da existência do texto, não da execução desta etapa.

**Faz:** política de continuidade e retenção; preservação do histórico; comunicação de atualização encerrada; parada da coleta quando autorizada; revisão de credenciais; redução de custos; retenção ou remoção conforme decisão; registro de aprendizados.

**Não faz:**

- Não programa exclusão automática de dados nem destruição de recursos sem aprovação.
- Não apaga versões que ainda possam estar referenciadas por cache ou cliente (ET-02-T11).
- Não muda a arquitetura para um "modo arquivo" com componente novo.

## 3. Contexto e evidências

Estado observado em 17/10/2026: não há política de retenção; [collector/README.md](../../collector/README.md) e [infraestrutura/README.md](../../infraestrutura/README.md) registram a retenção como pendente. O sinal de atualização encerrada é definido em ET-02-T02 e tratado pelo web em ET-11-T07.

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-14: produção operando e inventariada | T02–T08 |
| Contrato | ET-02-T02 (sinal de encerramento), ET-02-T11 (retenção mínima) | T03, T07 |
| Decisão | DP-31 (continuidade, retenção, encerramento) | T04–T07 |
| Decisão | DP-15 (retenção mínima) | T07 |
| Autorização | Parada de coleta, revogação, desligamento e qualquer remoção | T04–T07 |

**Pode começar já:** T01 (redação da política). Sem decisão aprovada, a etapa permanece aberta e os recursos seguem como estão.

## 5. Entradas e saídas

**Entradas:** inventários de ET-07, ET-10 e ET-14; registro de abertura; custos lidos em ET-12 e ET-14.

**Saídas:**

| Artefato | Consumidor |
| --- | --- |
| Política em `docs/operacao/continuidade.md` (proposto) | Responsáveis pelo produto e pela operação; ET-14-T01 |
| Arquivo final do histórico com hashes e metadados | Consulta futura, auditoria |
| Inventário final de recursos e custos | Responsável financeiro (a designar) |
| Registro de aprendizados em `docs/planejamento/evidencias/ET-15.md` (proposto) | Próximos projetos |

## 6. Responsabilidades e fronteiras

| Papel (nome a designar) | Responsabilidade |
| --- | --- |
| Produto | Decide o que continua visível e por quanto tempo |
| Operação | Executa parada, revogação e redução de custos autorizadas |
| Quem aprova remoção | Autoriza, por escrito, cada remoção |

## 7. Sequência de tarefas

### ET-15-T01 — Redigir a política de continuidade e retenção

- **Tipo:** documentação
- **Resultado pretendido:** DP-31 resolvida antes de ET-14-T01.
- **Entradas e pré-requisitos:** inventários previstos; regra de ET-02-T11.
- **Ações:**
  1. Decidir: o site continua no ar em modo somente leitura? Por quanto tempo? Com qual custo estimado?
  2. Decidir o que acontece com: coletor de produção, coletor de homologação, site e bucket de homologação, imagens, logs, credenciais.
  3. Decidir onde e como o histórico final é preservado.
  4. Listar o que exige aprovação explícita para remover.
  5. Prazos e valores entram como decisão do responsável, não como número deste plano.
- **Responsabilidade e caminhos:** `docs/operacao/continuidade.md` (proposto); `DA-NN` em [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Regras, falhas e bordas:** sem política aprovada, nenhum desligamento nem remoção.
- **Saída:** política aprovada.
- **Validações:** ET-15-V01
- **Concluída quando:** aprovada por quem decide (a designar), com data.
- **Bloqueios ou aprovações:** responsável pelo produto.

### ET-15-T02 — Preservar o histórico e a rastreabilidade

- **Tipo:** operação
- **Resultado pretendido:** cópia íntegra do estado final e das versões que a política mandar manter.
- **Entradas e pré-requisitos:** T01; ET-14.
- **Ações:**
  1. Identificar a versão final e as versões a preservar.
  2. Copiar para o destino de arquivo definido, com resumo de cada arquivo, manifesto final e metadados de origem (arquivo, ambiente, horários, identificador de geração).
  3. Verificar a cópia pelo resumo.
- **Responsabilidade e caminhos:** destino definido na política.
- **Regras, falhas e bordas:** cópia não substitui o original até a política autorizar.
- **Saída:** arquivo verificado.
- **Validações:** ET-15-V02
- **Concluída quando:** todos os resumos conferem.
- **Bloqueios ou aprovações:** T01.

### ET-15-T03 — Comunicar atualização encerrada

- **Tipo:** operação
- **Resultado pretendido:** o visitante sabe que os números são finais (ou os últimos publicados) e que não haverá atualização.
- **Entradas e pré-requisitos:** ET-02-T02; ET-11-T07; T01.
- **Ações:**
  1. Publicar um manifesto com o sinal de atualização encerrada, apontando para a versão final.
  2. Confirmar na tela a mensagem e a parada do polling.
- **Responsabilidade e caminhos:** ferramenta de publicação ou de retorno de ET-12-T08.
- **Regras, falhas e bordas:** o texto não declara vencedor por conta própria.
- **Saída:** site em modo somente leitura.
- **Validações:** ET-15-V03
- **Concluída quando:** mensagem visível e nenhum pedido periódico novo após o sinal.
- **Bloqueios ou aprovações:** T01.

### ET-15-T04 — Interromper a coleta quando autorizada

- **Tipo:** operação
- **Resultado pretendido:** o coletor de produção para e não volta sozinho.
- **Entradas e pré-requisitos:** T03; autorização.
- **Ações:**
  1. Parar o container e desativar a política de reinício e o início automático.
  2. Ajustar ou desligar os alertas que deixariam de fazer sentido (processo parado, atraso), para não gerar ruído.
  3. Confirmar que nenhuma versão nova aparece.
- **Responsabilidade e caminhos:** manual de operação.
- **Regras, falhas e bordas:** a instância pode continuar existindo até T06; parar o processo não remove nada.
- **Saída:** coleta parada.
- **Validações:** ET-15-V04
- **Concluída quando:** nenhuma publicação nova após a parada.
- **Bloqueios ou aprovações:** autorização.

### ET-15-T05 — Revisar e revogar credenciais

- **Tipo:** operação
- **Resultado pretendido:** nenhuma credencial sem uso continua válida.
- **Entradas e pré-requisitos:** T04; inventário de ET-12-T07.
- **Ações:**
  1. Revogar a credencial de publicação de produção e as de homologação sem uso.
  2. Revogar ou restringir tokens de deploy no GitHub e na Cloudflare, conforme a política.
  3. Rever quem tem acesso administrativo à AWS e à Cloudflare.
  4. Registrar cada revogação ou o agendamento escrito dela.
- **Responsabilidade e caminhos:** inventário (sem valores).
- **Regras, falhas e bordas:** manter pelo menos um acesso administrativo nominal para cumprir a política.
- **Saída:** inventário atualizado.
- **Validações:** ET-15-V06
- **Concluída quando:** credenciais revogadas falham ao serem usadas.
- **Bloqueios ou aprovações:** autorização.

### ET-15-T06 — Reduzir custos

- **Tipo:** infraestrutura
- **Resultado pretendido:** só o que a política mantém continua gerando custo, e esse custo residual é conhecido.
- **Entradas e pré-requisitos:** T04, T05; T01.
- **Ações:**
  1. Desligar ou encerrar a instância de produção e a de homologação, se a política autorizar.
  2. Rever regras e recursos da Cloudflare que deixaram de ser necessários.
  3. Rever retenção de logs e de imagens.
  4. Ajustar alertas de orçamento ao custo residual.
  5. Registrar o custo residual mensal estimado a partir das tabelas vigentes.
- **Responsabilidade e caminhos:** inventário.
- **Regras, falhas e bordas:** encerrar instância só depois de confirmar que nada vive apenas nela (o histórico está no R2 e no arquivo de T02).
- **Saída:** custo residual registrado.
- **Validações:** ET-15-V07
- **Concluída quando:** cada recurso restante tem dono e custo.
- **Bloqueios ou aprovações:** autorização.

### ET-15-T07 — Reter ou remover conforme decisão explícita

- **Tipo:** operação
- **Resultado pretendido:** remoção só do que a política autorizou, com registro antes e depois.
- **Entradas e pré-requisitos:** T01, T02; DP-15.
- **Ações:**
  1. Inventário antes.
  2. Para cada item a remover: aprovação escrita de quem tem autoridade.
  3. Respeitar a retenção mínima de versões ainda referenciáveis.
  4. Executar a remoção manualmente ou por regra de ciclo de vida criada só depois da aprovação, e registrar.
  5. Inventário depois.
- **Responsabilidade e caminhos:** registro em evidência.
- **Regras, falhas e bordas:** nenhuma regra automática de exclusão sem aprovação. Na dúvida, reter.
- **Saída:** inventários e aprovações.
- **Validações:** ET-15-V05
- **Concluída quando:** cada remoção tem aprovação e aparece na diferença dos inventários.
- **Bloqueios ou aprovações:** quem aprova remoção.

### ET-15-T08 — Registrar aprendizados e limites observados

- **Tipo:** documentação
- **Resultado pretendido:** o que se aprendeu fica disponível para a próxima edição.
- **Entradas e pré-requisitos:** registros de ET-13, ET-14 e da operação.
- **Ações:**
  1. O que funcionou, o que falhou, limites observados (cache, coleta, custo), incidentes.
  2. Decisões que mudariam numa próxima vez, como proposta.
  3. Atualizar o catálogo com o estado final de cada etapa.
- **Responsabilidade e caminhos:** `docs/planejamento/evidencias/ET-15.md` (proposto).
- **Regras, falhas e bordas:** sem segredo, sem dado pessoal.
- **Saída:** registro.
- **Validações:** ET-15-V08
- **Concluída quando:** registro publicado e catálogo atualizado.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

O sinal de atualização encerrada é parte do contrato desde ET-02. Navegadores com build antigo que não conheçam o sinal continuam lendo o manifesto final; a política de compatibilidade (ET-02-T09) cobre esse caso.

## 9. Segurança, integridade e performance

- R-20: nenhuma remoção sem aprovação (V05).
- R-07: credenciais revogadas (V06).
- R-11: custo residual conhecido (V07).
- Integridade: arquivo final verificado por resumo (V02).

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-15-V01 | Política aprovada | T01 | Revisar | Decisões, responsáveis e itens que exigem aprovação escritos; data de aprovação | Execução sem política | Revisão | Documento | T01 |
| ET-15-V02 | Histórico íntegro | T02 | Recalcular resumos da cópia | Todos conferem | Divergência | Verificação operacional | Produção | T02 |
| ET-15-V03 | Encerramento visível | T03 | Abrir o site; observar rede | Mensagem visível; polling parado | Polling segue ou mensagem ausente | Verificação operacional | Produção | T03 |
| ET-15-V04 | Coleta parada | T04 | Observar manifesto e logs por uma janela | Nenhuma versão nova; nenhum reinício automático | Processo volta sozinho | Verificação operacional | Produção | T04 |
| ET-15-V05 | Remoção autorizada | T07 | Comparar inventários e aprovações | Toda remoção tem aprovação; nada além foi removido | Remoção sem aprovação | Revisão | Produção | T07 |
| ET-15-V06 | Credenciais revogadas | T05 | Tentar usar cada credencial revogada | Recusa | Aceita | Verificação operacional | Produção | T05 |
| ET-15-V07 | Custo residual | T06 | Ler inventário e custo | Cada recurso com dono e custo | Recurso sem dono | Revisão | Produção | T06 |
| ET-15-V08 | Aprendizados | T08 | Revisar | Registro publicado; catálogo atualizado | Ausente | Revisão | Documento | T08 |

## 11. Infraestrutura e ações externas

Ações manuais com autorização: parada de coleta, revogação, desligamento de instância, ajustes de regras e remoções aprovadas. Nenhuma automação de exclusão é criada sem aprovação.

## 12. Falha, reversão e recuperação

- **Parada indevida da coleta:** religar o container (se a instância existir) e remover o sinal de encerramento do manifesto.
- **Revogação indevida:** criar credencial nova pelo procedimento de ET-12-T07.
- **Remoção indevida:** restaurar a partir do arquivo de T02; por isso T02 vem antes de T07.

## 13. Critérios de conclusão

- [ ] Política aprovada antes de ET-14 (V01).
- [ ] Histórico preservado e verificado (V02).
- [ ] Encerramento comunicado; coleta parada (V03, V04).
- [ ] Credenciais revistas (V06); custo residual conhecido (V07).
- [ ] Remoções só com aprovação (V05); aprendizados registrados (V08).

## 14. Pendências e passagem adiante

- DP-31 é a pendência central. Sem ela, T02 em diante não começam.
- Não há etapa seguinte. Uma nova edição do projeto começa de um novo planejamento, usando o registro de T08.

## 15. Brief de execução

Escrever e aprovar a política de continuidade antes da produção. Depois do período principal e com autorização: preservar o histórico com resumos, publicar o sinal de atualização encerrada, parar a coleta sem reinício automático, revogar credenciais sem uso, reduzir custos e registrar o residual, remover só o que tiver aprovação escrita e registrar aprendizados. Nada de exclusão automática. Validações V01–V08.
