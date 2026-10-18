# ET-02 — Contrato e snapshots

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo              | Conteúdo                                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                 | ET-02                                                                                                                                                                              |
| Componente         | Contrato público compartilhado (documento), manifesto, snapshots versionados                                                                                                       |
| Tipo predominante  | Documentação técnica com decisões de contrato                                                                                                                                      |
| Marco              | M1 — Interpretação dos dados e contrato validados                                                                                                                                  |
| Resultado concreto | Um documento de contrato permite que três pessoas implementem, sem conversar entre si, a validação (ET-03), a publicação (ET-05) e a leitura (ET-06), e que o resultado se encaixe |

## 2. Escopo e exclusões

**Faz:**

- Define o modelo normalizado e o contrato público: eleição, turno, cargo, abrangência, disponibilidade.
- Define a semântica de zero, ausência, sem disputa, resultado parcial, status oficial e atualização encerrada.
- Define representação de votos, percentuais e precisão, conforme o que ET-01 confirmou.
- Define os três horários e o sinal de verificação sem mudança.
- Define versionamento do contrato e identificador de versão dos dados.
- Define a divisão dos arquivos segundo a leitura do web, o manifesto e os caminhos versionados.
- Define quando uma versão é publicável e a retenção mínima.

**Não faz:**

- Não escreve schema Zod nem tipo TypeScript (ET-03).
- Não grava arquivo (ET-05).
- Não fixa TTL, intervalo de polling nem limiar de desatualização em número (DP-14, DP-17); só define onde esses valores atuam.
- Não cria campo para informação que ET-01 não confirmou. O grupo fica marcado como provisório.

## 3. Contexto e evidências

Documentos lidos: [dados/README.md](../../dados/README.md) (contrato conceitual e "o que o contrato precisa permitir ao frontend"), [collector/README.md](../../collector/README.md) (publicação e três horários), [web/README.md](../../web/README.md) (estados da interface), [arquitetura/README.md](../../arquitetura/README.md) (versões e manifesto), [padroes/README.md](../../padroes/README.md) (PKG-001 a PKG-003).

Estado observado em 17/10/2026: não há schema, tipo, exemplo de snapshot nem manifesto no repositório. `latest.json` é proposta citada em [arquitetura/README.md](../../arquitetura/README.md) e [collector/README.md](../../collector/README.md).

Conceitos já adotados: disponibilidade explícita (ausência não é zero), três horários (DA-12), versão imutável e manifesto como ponteiro (DA-06), oficial e simulado separados (DA-13), agregado nacional oficial e não contagem de UFs.

## 4. Dependências e critérios de entrada

| Tipo            | Item                                                                    | Bloqueia                                               |
| --------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| Implementação   | ET-01: matriz de campos, amostras e tamanhos                            | T03, T04, T05; tamanho em T06                          |
| Decisão         | DP-03 (campos), DP-09 (denominadores, precisão), DP-11 (status oficial) | T03, T04, T05                                          |
| Decisão         | DP-08 (sinal de atualização)                                            | Uso do IDG no envelope (T01, campo de rastreabilidade) |
| Recurso externo | Nenhum                                                                  | —                                                      |

**Podem começar antes de ET-01 terminar:** T01 (envelope), T02 (disponibilidade e atualidade), T07 (manifesto), T08 (identificador de versão), T09 (versionamento), T10 (publicabilidade), T11 (retenção), T12 (consistência). Nenhuma delas depende de nome de campo da origem.

## 5. Entradas e saídas

**Entradas:** matriz `docs/dados/matriz-dados-tse.md` (proposto, ET-01-T06); amostras e tamanhos (ET-01-T05, T07); estados de [web/README.md](../../web/README.md).

**Saídas:**

| Artefato                                                                                                                   | Consumidor                                                                          |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `docs/dados/contrato.md` (proposto) ou seção nova em [dados/README.md](../../dados/README.md): contrato público com versão | ET-03 (schemas), ET-05 (publicador), ET-06 e ET-11 (leitura), ET-08 (publicador R2) |
| Exemplos sintéticos de manifesto e de snapshot, escritos à mão no documento                                                | Revisão; depois viram fixtures de ET-03                                             |
| `DA-NN` novas para DP-12, DP-13, DP-14 (mecanismo) e DP-15 (regra)                                                         | Todas as etapas seguintes                                                           |

## 6. Responsabilidades e fronteiras

- O contrato é do projeto, não do TSE. Ele não carrega nome de campo bruto.
- O coletor é o único produtor. O web só consome. Nenhum dos dois calcula o que o outro já calculou: percentual exibido é o publicado (ver [web/README.md](../../web/README.md)).
- O schema será a fonte do tipo (PKG-002). Este documento é a especificação que o schema implementa.

## 7. Sequência de tarefas

### ET-02-T01 — Definir o envelope comum de snapshot

- **Tipo:** documentação
- **Resultado pretendido:** todo arquivo de snapshot começa com os mesmos metadados.
- **Entradas e pré-requisitos:** contrato conceitual de [dados/README.md](../../dados/README.md).
- **Ações:**
  1. Listar os metadados: versão do contrato, identificador da versão de dados, nosso ambiente (local, homologação, produção), ambiente da origem (oficial, simulado), eleição, turno, cargo, abrangência (Brasil ou UF), disponibilidade, horários, rastreabilidade (arquivo de origem e identificador de geração, quando confirmado).
  2. Definir tipo e obrigatoriedade de cada metadado.
  3. Definir como a UF é identificada no contrato (código estável próprio ou o da origem, conforme ET-01), incluindo DF.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** campo de rastreabilidade que depende de DP-08 fica opcional e marcado como provisório.
- **Saída:** tabela do envelope.
- **Validações:** ET-02-V04, ET-02-V08
- **Concluída quando:** cada metadado tem tipo, obrigatoriedade e origem (nossa ou da fonte).
- **Bloqueios ou aprovações:** nenhum.

### ET-02-T02 — Definir disponibilidade, atualidade e encerramento

- **Tipo:** documentação
- **Resultado pretendido:** cada estado de [web/README.md](../../web/README.md) tem representação inequívoca, e o web distingue "origem sem novidade" de "coletor parado" (DP-14).
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Definir os valores de disponibilidade por arquivo: disponível; ainda não disponível na origem; sem disputa nesta abrangência (governador).
  2. Registrar que resposta inválida, timeout e bloqueio não geram arquivo: aparecem como ausência de versão nova e envelhecimento, nunca como dado (regra de [collector/README.md](../../collector/README.md)).
  3. Decidir o mecanismo de DP-14: manifesto com horário da última verificação bem-sucedida, regravado mesmo sem versão nova, ou somente horário de publicação. Registrar o custo (uma escrita por ciclo) e a consequência para o cache do manifesto.
  4. Definir o sinal de atualização encerrada no manifesto, usado por ET-15 e ET-11 para parar o polling.
  5. Definir a marcação de dado simulado visível ao web.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** zero voto com arquivo presente é "disponível" com zero; não confundir com "ainda não disponível".
- **Saída:** tabela estado da interface × representação no contrato.
- **Validações:** ET-02-V02, ET-02-V03
- **Concluída quando:** cada estado da interface aponta para exatamente uma combinação do contrato.
- **Bloqueios ou aprovações:** valor numérico do limiar continua em DP-14; não bloqueia esta tarefa.

### ET-02-T03 — Definir a representação de votos, percentuais e precisão

- **Tipo:** documentação
- **Resultado pretendido:** o web exibe números sem recalcular, e o coletor sabe exatamente o que produzir (DP-09).
- **Entradas e pré-requisitos:** ET-01-T06 (matriz); DP-09.
- **Ações:**
  1. Votos: inteiro não negativo; definir se o contrato aceita número ou texto, conforme a origem e o limite de inteiro seguro.
  2. Percentual de votos e percentual de apuração: nomes distintos, denominador citado, precisão (casas) e forma de arredondamento, conforme a origem.
  3. Decidir se o contrato publica o percentual da origem ou um calculado, registrando a recomendação de DP-09.
  4. Definir como totais auxiliares (brancos, nulos, comparecimento) entram, se a matriz os confirmar.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** sem confirmação do denominador, o percentual fica provisório e bloqueia só a exibição dele em ET-06-T05.
- **Saída:** regras numéricas.
- **Validações:** ET-02-V01, ET-02-V09
- **Concluída quando:** cada número tem tipo, precisão e fonte na matriz.
- **Bloqueios ou aprovações:** DP-03, DP-09.

### ET-02-T04 — Definir o modelo de candidatura e de resultado

- **Tipo:** documentação
- **Resultado pretendido:** lista de candidaturas com identificador estável e ordem definida, sem lista fixa no repositório.
- **Entradas e pré-requisitos:** ET-01-T06.
- **Ações:**
  1. Identificador estável da candidatura no contrato (vindo da origem).
  2. Campos de exibição confirmados (nome de urna, número, partido ou federação), conforme a matriz.
  3. Ordem de apresentação: a da origem ou por votos, e o desempate.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** texto vindo da origem é dado para exibir como texto (SEC-004).
- **Saída:** modelo de resultado.
- **Validações:** ET-02-V01, ET-02-V09
- **Concluída quando:** todo campo tem origem na matriz.
- **Bloqueios ou aprovações:** DP-03.

### ET-02-T05 — Definir andamento e status oficial

- **Tipo:** documentação
- **Resultado pretendido:** o contrato diz o andamento da apuração e, se decidido, o status oficial, sem permitir leitura de liderança como eleição confirmada (DP-11).
- **Entradas e pré-requisitos:** ET-01-T06; DP-11.
- **Ações:**
  1. Percentual de seções ou urnas totalizadas, conforme a origem.
  2. Indicador de totalização final, com a diferença entre eleição federal e estadual que o FAQ menciona.
  3. Status desconhecido: decidir se invalida o arquivo ou se é publicado como "status não reconhecido" com o resto do arquivo. Registrar a consequência para ET-03-T07.
  4. Status oficial de candidato: incluir ou excluir conforme DP-11.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** o contrato não tem campo "vencedor" calculado por nós.
- **Saída:** modelo de andamento.
- **Validações:** ET-02-V02, ET-02-V09
- **Concluída quando:** status desconhecido tem regra; não existe campo de vencedor calculado.
- **Bloqueios ou aprovações:** DP-03, DP-11.

### ET-02-T06 — Definir a divisão dos arquivos pela leitura do web

- **Tipo:** documentação
- **Resultado pretendido:** o primeiro carregamento lê poucos arquivos pequenos; a troca de UF lê só o que muda (DP-12).
- **Entradas e pré-requisitos:** tamanhos de ET-01-T07; telas de [web/README.md](../../web/README.md).
- **Ações:**
  1. Listar as leituras do web: abertura (Brasil), seleção de UF, atualização.
  2. Comparar opções: um arquivo por abrangência e cargo; um arquivo agregado por cargo; um arquivo de configuração com UFs, disputas e rótulos.
  3. Estimar o tamanho de cada opção a partir das amostras.
  4. Escolher e registrar como `DA-NN`, com a estimativa.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** município fica fora (escopo). A divisão não pode exigir que o web junte arquivos de versões diferentes.
- **Saída:** lista de arquivos de uma versão, com caminhos relativos.
- **Validações:** ET-02-V04
- **Concluída quando:** cada leitura do web aponta para arquivos nomeados da versão.
- **Bloqueios ou aprovações:** tamanhos de ET-01; sem eles, registrar como estimativa provisória.

### ET-02-T07 — Definir o manifesto

- **Tipo:** documentação
- **Resultado pretendido:** um ponteiro mutável único que o web segue (DP-12).
- **Entradas e pré-requisitos:** T06, T08.
- **Ações:**
  1. Decidir o nome (adotar ou substituir a proposta `latest.json`).
  2. Campos: versão do contrato, identificador da versão de dados, ambientes, horário de publicação, horário da última verificação (se T02 decidir), sinal de atualização encerrada, caminho base da versão, lista de arquivos com tamanho e hash.
  3. Caminho dos arquivos versionados: prefixo que contenha o identificador da versão.
  4. Separação por ambiente no caminho (oficial e simulado nunca no mesmo prefixo).
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** o manifesto não contém segredo, caminho interno de disco nem credencial (SEC-007).
- **Saída:** especificação do manifesto e exemplo sintético.
- **Validações:** ET-02-V04, ET-02-V05
- **Concluída quando:** com o manifesto e o caminho base, o web encontra todos os arquivos da versão sem outra informação.
- **Bloqueios ou aprovações:** nenhum.

### ET-02-T08 — Definir o identificador de versão dos dados

- **Tipo:** documentação
- **Resultado pretendido:** identificador nunca reutilizado e que permite ao web recusar regressão.
- **Entradas e pré-requisitos:** T07.
- **Ações:**
  1. Escolher a forma (por exemplo, sequência ordenável combinada com resumo do conteúdo).
  2. Definir como o web compara duas versões para não voltar a uma mais antiga servida por outra cópia de cache.
  3. Definir o comportamento depois de reinício do coletor: continuar a sequência a partir do manifesto publicado.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** relógio da máquina pode voltar; a regra de ordem não pode depender só dele.
- **Saída:** regra de identificador.
- **Validações:** ET-02-V05
- **Concluída quando:** existe regra de ordem e regra de unicidade.
- **Bloqueios ou aprovações:** nenhum.

### ET-02-T09 — Definir o versionamento do contrato e a compatibilidade

- **Tipo:** documentação
- **Resultado pretendido:** um navegador com JavaScript antigo em cache não quebra quando o contrato evolui.
- **Entradas e pré-requisitos:** T01, T07.
- **Ações:**
  1. Definir o que é mudança compatível (campo opcional novo) e incompatível (campo removido, semântica alterada).
  2. Definir o comportamento do web diante de versão de contrato não suportada: estado explícito pedindo recarregar, sem tentar ler.
  3. Definir se, numa mudança incompatível, o coletor publica as duas versões em caminhos distintos durante a transição.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** mudança incompatível exige atualizar [dados/README.md](../../dados/README.md) no mesmo conjunto (PKG-003).
- **Saída:** política de versão.
- **Validações:** ET-02-V06
- **Concluída quando:** os dois cenários de V06 têm comportamento definido.
- **Bloqueios ou aprovações:** nenhum.

### ET-02-T10 — Definir quando uma versão é publicável

- **Tipo:** documentação
- **Resultado pretendido:** regra objetiva de completude e resposta a DP-13.
- **Entradas e pré-requisitos:** T06, T07.
- **Ações:**
  1. Uma versão é publicável quando todos os arquivos listados existem, passam no schema e têm o tamanho e o hash declarados.
  2. Decidir DP-13: falha de um arquivo derruba a versão ou o arquivo reaproveita o último conteúdo válido com seu horário real.
  3. Definir o conjunto mínimo exigido (por exemplo, configuração e Brasil presidente) e o que pode estar "ainda não disponível".
- **Responsabilidade e caminhos:** `DA-NN` nova; `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** se o reaproveitamento for escolhido, o horário de origem por arquivo é obrigatório.
- **Saída:** regra de publicabilidade.
- **Validações:** ET-02-V03, ET-02-V08
- **Concluída quando:** ET-05-T04 consegue implementar a verificação sem decisão adicional.
- **Bloqueios ou aprovações:** decisão do responsável técnico (a designar) para DP-13.

### ET-02-T11 — Definir a retenção mínima de versões

- **Tipo:** documentação
- **Resultado pretendido:** nenhuma versão ainda referenciada por cliente ou cache é removida (DP-15).
- **Entradas e pré-requisitos:** T07.
- **Ações:**
  1. Expressar a retenção mínima em função do TTL do manifesto e do intervalo de polling (DP-17), mais uma margem decidida.
  2. Registrar que nenhuma etapa remove versão automaticamente; remoção futura é ET-15 com decisão.
- **Responsabilidade e caminhos:** `DA-NN` nova.
- **Regras, falhas e bordas:** retenção também vale para o publicador local (disco).
- **Saída:** regra de retenção.
- **Validações:** ET-02-V07
- **Concluída quando:** a regra é uma fórmula sobre valores nomeados, não um número inventado.
- **Bloqueios ou aprovações:** nenhum.

### ET-02-T12 — Registrar consistência própria × sincronização da origem

- **Tipo:** documentação
- **Resultado pretendido:** ninguém lê o snapshot como se os arquivos do TSE tivessem nascido no mesmo instante.
- **Entradas e pré-requisitos:** ET-01-T07.
- **Ações:**
  1. Registrar que a versão garante: arquivos da mesma coleta e publicação, conjunto completo, ponteiro único.
  2. Registrar que a versão não garante que EA14 e EA20, ou dois EA20, refletem a mesma geração da origem.
  3. Definir que cada arquivo carrega o próprio horário de origem.
- **Responsabilidade e caminhos:** `docs/dados/contrato.md` (proposto).
- **Regras, falhas e bordas:** —
- **Saída:** seção de garantias e não garantias.
- **Validações:** ET-02-V08
- **Concluída quando:** o texto existe e o envelope tem horário de origem por arquivo.
- **Bloqueios ou aprovações:** nenhum.

### ET-02-T13 — Publicar o contrato na documentação de dados

- **Tipo:** documentação
- **Resultado pretendido:** um só documento de contrato, com versão, ligado de [dados/README.md](../../dados/README.md).
- **Entradas e pré-requisitos:** T01–T12.
- **Ações:**
  1. Consolidar o contrato e marcar grupos provisórios.
  2. Atualizar a tabela "Contrato conceitual" de [dados/README.md](../../dados/README.md).
  3. Atualizar DP-12 a DP-15 em [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Responsabilidade e caminhos:** documentos citados.
- **Regras, falhas e bordas:** PKG-003.
- **Saída:** contrato versão inicial.
- **Validações:** ET-02-V10
- **Concluída quando:** ET-03, ET-05 e ET-06 conseguem citar seções do contrato em seus cartões.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

Esta etapa é o contrato. Consumidores: `packages/validation` (schema), `apps/collector` (produtor, publicador local e R2), `apps/web` (leitor). A API, se um dia existir, consome o mesmo contrato ([api/README.md](../../api/README.md)).

Não podem ser decididos em silêncio: forma do identificador de versão, política de falha parcial (DP-13), presença de status oficial (DP-11), denominador de percentual (DP-09). Mudança posterior em qualquer um deles é mudança de contrato com versão.

## 9. Segurança, integridade e performance

- R-04: conjunto incompleto. Controle: T10 define a regra que ET-05 implementa.
- R-05: dado envelhecido. Controle: T02 e T12 garantem horários suficientes para o aviso.
- R-09: mistura de ambientes. Controle: ambiente no envelope e no caminho (T01, T07).
- R-19: regressão de versão no navegador. Controle: T08.
- Performance: T06 escolhe a divisão por tamanho medido. Arquivo pequeno e imutável favorece cache longo (DA-07). O manifesto é o arquivo mais lido; manter pequeno.
- O manifesto não expõe caminho interno nem credencial (SEC-007).

## 10. Plano de validação

| ID        | Cenário                       | Preparação                                                      | Ação                                                             | Sucesso                                                                                    | Falha se                                             | Nível   | Ambiente  | Tarefa        |
| --------- | ----------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------- | --------- | ------------- |
| ET-02-V01 | Cobertura da matriz           | Matriz de ET-01 e contrato                                      | Cruzar cada informação da tela com o contrato                    | Cada uma tem campo no contrato ou pendência                                                | Informação da tela sem representação e sem pendência | Revisão | Documento | T03, T04      |
| ET-02-V02 | Estados da interface          | Tabela de estados de [web/README.md](../../web/README.md)       | Para cada estado, escrever a combinação de contrato que o produz | Uma combinação por estado, sem ambiguidade                                                 | Dois estados com a mesma representação               | Revisão | Documento | T02, T05      |
| ET-02-V03 | Zero × ausência × sem disputa | Três exemplos sintéticos                                        | Ler cada um como o web leria                                     | Os três são distinguíveis sem heurística                                                   | Um exige adivinhar                                   | Revisão | Documento | T02, T10      |
| ET-02-V04 | Exemplos completos            | Manifesto e snapshots sintéticos escritos à mão                 | Conferir campo a campo contra a especificação                    | Todos os obrigatórios presentes; caminhos resolvem                                         | Campo obrigatório ausente ou caminho que não resolve | Revisão | Documento | T01, T06, T07 |
| ET-02-V05 | Regressão de versão           | Dois manifestos sintéticos, um mais antigo                      | Aplicar a regra de T08                                           | O mais antigo é reconhecido como antigo                                                    | Regra depende só do relógio local ou é ambígua       | Revisão | Documento | T07, T08      |
| ET-02-V06 | Compatibilidade               | Cliente da versão N; contrato N+1 compatível e N+1 incompatível | Seguir a política de T09                                         | Compatível: cliente lê ignorando o novo; incompatível: cliente mostra estado de recarregar | Cliente antigo exibe dado errado                     | Revisão | Documento | T09           |
| ET-02-V07 | Retenção                      | Regra de T11                                                    | Ler a regra                                                      | Fórmula sobre TTL, polling e margem nomeados                                               | Número sem origem                                    | Revisão | Documento | T11           |
| ET-02-V08 | Horários                      | Exemplo sintético                                               | Conferir horários                                                | Origem por arquivo, coleta e publicação presentes e distintos                              | Horário único ou ausente                             | Revisão | Documento | T01, T10, T12 |
| ET-02-V09 | Sem campo não confirmado      | Contrato e matriz                                               | Para cada campo vindo da origem, achar a linha da matriz         | Todos com evidência ou marcados provisórios                                                | Campo da origem sem evidência e sem marca            | Revisão | Documento | T03, T04, T05 |
| ET-02-V10 | Documentação única            | T13                                                             | Procurar descrições concorrentes do contrato em `docs/`          | Uma fonte, citada pelas demais                                                             | Duas definições diferentes                           | Revisão | Documento | T13           |

A prova executável do contrato é ET-03 (schemas e testes). Esta etapa só prova coerência documental.

## 11. Infraestrutura e ações externas

Não se aplica. Nenhum recurso, acesso ou aprovação externa.

## 12. Falha, reversão e recuperação

- **Erro de contrato descoberto depois:** abrir mudança de contrato com versão (T09), atualizar documentação e schema juntos. Não corrigir o schema sem o documento.
- **Grupo provisório confirmado com outro significado:** registrar como mudança incompatível se algum consumidor já tiver implementado.

## 13. Critérios de conclusão

- [ ] Envelope, disponibilidade, números, candidatura, andamento definidos (V01, V02, V08, V09).
- [ ] Divisão de arquivos, manifesto, identificador e versionamento definidos (V04, V05, V06).
- [ ] Publicabilidade e retenção definidas (V03, V07).
- [ ] Contrato publicado numa fonte única (V10).
- [ ] DP-12 a DP-15 resolvidas como `DA-NN`; DP-09 e DP-11 resolvidas ou com grupo provisório explícito.

## 14. Pendências e passagem adiante

- Grupos que dependem de dado oficial do segundo turno ainda não publicado podem ficar provisórios. Eles bloqueiam a verificação final de ET-03 com fixture oficial, não a escrita do schema dos grupos já confirmados.
- ET-03 recebe: o contrato, os exemplos sintéticos e a regra de status desconhecido.
- ET-05 recebe: manifesto, caminhos, identificador, publicabilidade e retenção.
- ET-06 recebe: divisão de arquivos, estados e compatibilidade.

## 15. Brief de execução

Escrever o contrato público a partir da matriz de ET-01: envelope, disponibilidade (zero, ausência, sem disputa, encerrado), números, candidatura, andamento, três horários, divisão de arquivos, manifesto, identificador de versão, versionamento, publicabilidade, retenção. Marcar como provisório o que ET-01 não confirmou. Não escrever schema nem código. Validações V01–V10. Referências: [dados/README.md](../../dados/README.md), [collector/README.md](../../collector/README.md), [web/README.md](../../web/README.md).
