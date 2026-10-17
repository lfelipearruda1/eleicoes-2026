# ET-01 — Validação dos dados do TSE

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-01 |
| Componente | Origem oficial (TSE), documentação de dados, amostras |
| Tipo predominante | Investigação controlada |
| Marco | M1 — Interpretação dos dados e contrato validados (junto com ET-02) |
| Resultado concreto | Uma matriz liga cada informação da tela a um arquivo e campo confirmados, com semântica e evidência, e lista o que ainda falta confirmar. Amostras identificadas por origem, ambiente, abrangência e momento ficam disponíveis para ET-03 |

## 2. Escopo e exclusões

**Faz:**

- Lê a documentação oficial vigente: página técnica, especificações de EA11, EA14, EA15 e EA20, instruções de download, manual JWS e artigos 264 a 269 da Resolução TSE nº 23.751/2026.
- Confirma ambientes, hosts e identificadores no EA11 vigente.
- Obtém amostras com poucas requisições, identificadas e autorizadas.
- Mapeia resultado presidencial nacional, presidencial de uma UF e governador de uma UF aplicável.
- Identifica votos, denominadores, andamento, status, horários e identificadores de geração.
- Investiga como a origem sinaliza atualização e como os arquivos podem divergir entre si.
- Separa amostra oficial, amostra simulada e dado sintético.

**Não faz:**

- Não escreve o cliente HTTP do coletor nem o ciclo (ET-04).
- Não escreve schema Zod (ET-03).
- Não fecha o contrato público (ET-02).
- Não consulta a origem em laço, não varre caminhos e não faz teste de carga.
- Não fixa lista de candidatos nem de unidades com governador no código.
- Não completa a matriz com campo que não foi encontrado na especificação ou na amostra.

## 3. Contexto e evidências

Documentos lidos para este plano: [dados/README.md](../../dados/README.md), [collector/README.md](../../collector/README.md), [seguranca/README.md](../../seguranca/README.md), [testes/README.md](../../testes/README.md).

Estado registrado em [dados/README.md](../../dados/README.md), a partir de consulta de 14/10/2026 à página técnica do TSE. Não foi reconfirmado nesta revisão:

- Arquivos de interesse: EA11 (configuração), EA14 (acompanhamento Brasil), EA15 (acompanhamento UF), EA20 (resultado unificado).
- Ambiente oficial com URL base e valor `oficial`; simulado com outro host e ambiente `simulado2026`. O próprio FAQ tem trechos desencontrados sobre o simulado.
- Simulados ocorreram em setembro de 2026. Não se sabe se o host continua respondendo.
- Limite de 100 requisições por segundo por IP, bloqueio de 10 minutos renovado por nova tentativa, 404 repetido pode bloquear sem limiar publicado.
- ETag e Last-Modified existem; 304 conta no limite. Não há arquivo de índice de mudanças.
- IDG identifica cada arquivo gerado; não está confirmado que o valor ordena gerações.
- Indicador de andamento final difere entre eleição federal e estadual, segundo o FAQ.
- Códigos do segundo turno foram lidos na página, mas não podem ir para código antes de aparecerem no EA11 vigente.
- Não foram lidos: PDFs de especificação, manual JWS, texto da resolução.

No repositório não há amostra, fixture, matriz de campos nem código que consulte a origem. `packages/election-data/src/index.ts` exporta vazio.

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-00: convenção de evidências (ET-00-T04) | Registro formal das amostras (T04 em diante) |
| Decisão | DP-01 (alcance temporal) | Janela e prioridade de T05 e T07 |
| Decisão | DP-02 (disponibilidade de amostras) | T05, T07, T08 |
| Recurso externo | Documentação oficial publicada | T01, T09 |
| Recurso externo | Arquivos de resultado do segundo turno publicados pelo TSE | Amostra oficial de resultado em T05 |
| Autorização | Quantidade máxima de requisições por execução de consulta, escrita antes de T02 | T02, T03, T05, T07 |

**Podem começar já:** T01 (leitura) e T09 (classificação JWS e resolução), que não fazem requisição a arquivo de resultado. T04 pode começar em paralelo com T01.

## 5. Entradas e saídas

**Entradas:** documentação oficial; acesso de rede ao host oficial; limite de requisições autorizado.

**Saídas:**

| Artefato | Garantia | Consumidor |
| --- | --- | --- |
| `docs/dados/matriz-dados-tse.md` (proposto): matriz Informação da tela, Arquivo/campo confirmado, Semântica, Evidência, Pendência | Nenhum campo sem evidência; pendências explícitas | ET-02, ET-03 |
| Amostras em `packages/election-data/fixtures/` (proposto), separadas em `oficial/`, `simulado/` e `sintetico/` | Cada amostra tem arquivo de metadados com origem, ambiente, URL, data e hora, abrangência, ETag e hash | ET-03, ET-04, ET-05 (simulador) |
| Allowlist candidata de hosts e padrões de caminho | Só hosts e caminhos lidos na documentação ou no EA11 | ET-04-T01, ET-04-T03 |
| Classificação de JWS e lista de deveres da resolução | Fonte citada | ET-04, ET-07, ET-08, ET-14 |
| [dados/README.md](../../dados/README.md) atualizado | Pendências resolvidas marcadas, novas registradas | Todos |

## 6. Responsabilidades e fronteiras

A investigação produz evidência, não código de produção. Se for útil um script de consulta única, ele é ferramenta descartável ou fica em `apps/collector/scripts/` (proposto) com execução manual, sem agendamento, e não é reaproveitado como cliente do coletor sem passar por ET-04. O web não participa desta etapa.

## 7. Sequência de tarefas

### ET-01-T01 — Ler e registrar a documentação oficial vigente

- **Tipo:** investigação
- **Resultado pretendido:** saber o que a especificação de 2026 diz sobre cada arquivo de interesse.
- **Entradas e pré-requisitos:** página técnica do TSE e índice de arquivos de divulgação.
- **Ações:**
  1. Localizar e ler as especificações de EA11, EA14, EA15 e EA20 de 2026.
  2. Ler as instruções de download (montagem de caminho, ciclo).
  3. Registrar, por documento: título, URL, data de publicação indicada, data da consulta.
  4. Registrar trechos desencontrados entre documentos, sem escolher um lado sem evidência.
- **Responsabilidade e caminhos:** `docs/planejamento/evidencias/ET-01.md` (proposto).
- **Regras, falhas e bordas:** documento de pleito anterior não substitui o de 2026. Se o PDF não estiver disponível, registrar e manter a pendência.
- **Saída:** lista de fontes com data de consulta.
- **Validações:** ET-01-V01
- **Concluída quando:** cada um dos quatro arquivos tem especificação lida ou ausência registrada.
- **Bloqueios ou aprovações:** nenhum.

### ET-01-T02 — Verificar disponibilidade dos ambientes e montar a allowlist candidata

- **Tipo:** investigação
- **Resultado pretendido:** saber quais hosts respondem hoje e quais podem entrar na allowlist.
- **Entradas e pré-requisitos:** T01; limite de requisições autorizado.
- **Ações:**
  1. Para cada host documentado (oficial e simulado), fazer uma única requisição ao arquivo de configuração cujo caminho está nas instruções.
  2. Registrar status, cabeçalhos relevantes (ETag, Last-Modified, Cache-Control) e horário.
  3. Não tentar caminhos alternativos se a resposta for 404.
  4. Montar a allowlist candidata: esquema, host, porta e prefixo de caminho.
- **Responsabilidade e caminhos:** evidência em `ET-01.md` (proposto).
- **Regras, falhas e bordas:** resposta de bloqueio interrompe todas as consultas da etapa até o fim do prazo documentado. Redirect para outro host é registrado e não seguido.
- **Saída:** tabela de ambientes e allowlist candidata.
- **Validações:** ET-01-V02, ET-01-V05
- **Concluída quando:** cada host documentado tem estado registrado.
- **Bloqueios ou aprovações:** limite de requisições escrito antes.

### ET-01-T03 — Obter o EA11 vigente e extrair identificadores

- **Tipo:** investigação
- **Resultado pretendido:** códigos de pleito, eleição, cargo e ciclo do segundo turno, e as unidades com disputa de governador, lidos da configuração oficial (DP-04, DP-05).
- **Entradas e pré-requisitos:** T02 com host oficial respondendo.
- **Ações:**
  1. Guardar o EA11 obtido como amostra oficial com metadados (T04).
  2. Extrair, para o segundo turno: pleito, códigos de eleição federal e estadual, cargos, abrangências.
  3. Extrair a lista de unidades com disputa de governador no segundo turno, se o arquivo a trouxer.
  4. Comparar com os números lidos em 14/10/2026 em [dados/README.md](../../dados/README.md) e registrar diferenças.
- **Responsabilidade e caminhos:** amostra em `packages/election-data/fixtures/oficial/` (proposto).
- **Regras, falhas e bordas:** se o EA11 não trouxer a lista de governadores, registrar de onde ela vem na especificação. Não completar com conhecimento externo.
- **Saída:** tabela de identificadores com campo de origem.
- **Validações:** ET-01-V04, ET-01-V06
- **Concluída quando:** DP-04 e DP-05 resolvidas ou com a lacuna nomeada.
- **Bloqueios ou aprovações:** T02.

### ET-01-T04 — Definir armazenamento e metadados das amostras

- **Tipo:** documentação
- **Resultado pretendido:** amostra oficial, amostra simulada e dado sintético nunca se confundem.
- **Entradas e pré-requisitos:** ET-00-T04.
- **Ações:**
  1. Definir os diretórios `oficial/`, `simulado/` e `sintetico/` em `packages/election-data/fixtures/` (proposto).
  2. Definir o arquivo de metadados por amostra: origem, ambiente, URL, abrangência, cargo, turno, data e hora de obtenção, ETag, Last-Modified, hash do conteúdo, tamanho.
  3. Definir se amostras grandes entram inteiras no Git ou recortadas, com o recorte documentado.
  4. Registrar que amostras não contêm segredo nem dado pessoal além do que a origem publica.
- **Responsabilidade e caminhos:** `packages/election-data/fixtures/README.md` (proposto).
- **Regras, falhas e bordas:** recorte de amostra para teste é dado derivado; o metadado diz isso.
- **Saída:** convenção escrita.
- **Validações:** ET-01-V04
- **Concluída quando:** a primeira amostra de T03 segue a convenção.
- **Bloqueios ou aprovações:** nenhum.

### ET-01-T05 — Obter amostras de resultado identificadas

- **Tipo:** investigação
- **Resultado pretendido:** pelo menos uma amostra de cada recorte: EA14 Brasil; EA20 presidente Brasil; EA20 presidente de uma UF; EA20 governador de uma UF com disputa; EA15 só se DP-10 indicar.
- **Entradas e pré-requisitos:** T03 (caminhos), T04 (convenção), DP-02 (fonte disponível).
- **Ações:**
  1. Montar cada caminho a partir do EA11 e das instruções, nunca por tentativa.
  2. Fazer uma requisição por arquivo; registrar status e cabeçalhos.
  3. Guardar com metadados; marcar turno e ambiente.
  4. Se o arquivo ainda não existir porque a apuração não começou, registrar a ausência e não repetir em laço.
- **Responsabilidade e caminhos:** `packages/election-data/fixtures/` (proposto).
- **Regras, falhas e bordas:** amostra do primeiro turno serve para formato, nunca para códigos ou candidatos do segundo. Arquivo inicial com zero voto é diferente de 404; registrar qual foi observado.
- **Saída:** conjunto de amostras com metadados.
- **Validações:** ET-01-V04, ET-01-V05, ET-01-V06
- **Concluída quando:** cada recorte tem amostra ou ausência registrada com motivo.
- **Bloqueios ou aprovações:** DP-01, DP-02, DP-04; limite de requisições.

### ET-01-T06 — Montar a matriz informação da tela × campo confirmado

- **Tipo:** documentação
- **Resultado pretendido:** cada informação que a tela exibirá tem campo, semântica e evidência, ou pendência explícita (DP-03, DP-09, DP-11).
- **Entradas e pré-requisitos:** T01, T05.
- **Ações:**
  1. Listar as informações da tela a partir de [web/README.md](../../web/README.md): candidato (identificação e nome de exibição), votos, percentual de votos, denominador do percentual, percentual de apuração, status de totalização, indicador de andamento final (federal e estadual), status oficial do candidato, horário de geração, IDG, abrangência, cargo.
  2. Para cada linha, preencher: Informação da tela | Arquivo/campo confirmado | Semântica | Evidência | Pendência.
  3. Evidência é trecho da especificação com página ou campo numa amostra identificada.
  4. Onde não houver evidência, a célula de campo fica vazia e a pendência diz o que falta.
- **Responsabilidade e caminhos:** `docs/dados/matriz-dados-tse.md` (proposto).
- **Regras, falhas e bordas:** não inferir campo por nome parecido. Distinguir votos válidos, nominais, brancos, nulos e comparecimento só se a especificação os definir.
- **Saída:** matriz.
- **Validações:** ET-01-V03
- **Concluída quando:** toda linha tem evidência ou pendência; nenhuma célula preenchida por suposição.
- **Bloqueios ou aprovações:** T01 e T05.

### ET-01-T07 — Investigar sinais de atualização e diferenças entre arquivos

- **Tipo:** investigação
- **Resultado pretendido:** saber como detectar que a apuração mudou (DP-08) e quanto EA14 e EA20 podem divergir.
- **Entradas e pré-requisitos:** T05; quantidade máxima de requisições aprovada.
- **Ações:**
  1. Ler na especificação o significado de IDG, horários de totalização e geração.
  2. Se houver janela de apuração ou simulado disponível, repetir a leitura de um mesmo arquivo um número pequeno e aprovado de vezes, espaçadas, registrando ETag, Last-Modified, IDG e horário.
  3. Registrar se um 304 foi recebido com validação condicional.
  4. Registrar se o horário do EA14 de uma UF difere do horário do EA20 da mesma UF no mesmo momento.
  5. Medir o tamanho de cada arquivo, para DP-12 e DP-16.
- **Responsabilidade e caminhos:** evidência em `ET-01.md` (proposto).
- **Regras, falhas e bordas:** isto não é laço de coleta. Se a janela não existir, registrar a lacuna e manter DP-08 com a recomendação de comparar conteúdo normalizado.
- **Saída:** registro do comportamento observado e dos tamanhos.
- **Validações:** ET-01-V05
- **Concluída quando:** DP-08 tem evidência ou lacuna explícita.
- **Bloqueios ou aprovações:** DP-01, DP-02; limite de requisições.

### ET-01-T08 — Comparar a interpretação com a referência oficial

- **Tipo:** investigação
- **Resultado pretendido:** confirmar que a leitura dos campos de votos e de andamento produz os mesmos números que o TSE exibe oficialmente no mesmo momento.
- **Entradas e pré-requisitos:** T05, T06; acesso a uma referência oficial de exibição.
- **Ações:**
  1. Escolher um recorte com amostra e referência do mesmo momento.
  2. Comparar votos de cada candidato e percentual de apuração.
  3. Registrar a fonte, o horário e o resultado da comparação.
- **Responsabilidade e caminhos:** `ET-01.md` (proposto).
- **Regras, falhas e bordas:** diferença por instante distinto não é erro de interpretação; registrar os dois horários.
- **Saída:** registro da comparação ou da inviabilidade.
- **Validações:** ET-01-V08
- **Concluída quando:** comparação feita ou inviabilidade justificada.
- **Bloqueios ou aprovações:** DP-02.

### ET-01-T09 — Classificar a verificação JWS e os deveres da resolução

- **Tipo:** investigação
- **Resultado pretendido:** DP-06 e DP-07 resolvidas.
- **Entradas e pré-requisitos:** manual JWS e texto da Resolução TSE nº 23.751/2026.
- **Ações:**
  1. Ler o manual JWS e registrar se a verificação é exigida, recomendada ou não aplicável aos arquivos consumidos.
  2. Se exigida, registrar o que precisa ser verificado e qual material público é necessário, sem escrever o algoritmo.
  3. Ler os artigos 264 a 269 e listar cada dever de quem divulga.
  4. Indicar em qual etapa cada dever é cumprido (por exemplo, identificação da fonte na tela em ET-06 e ET-11).
- **Responsabilidade e caminhos:** [decisoes-e-riscos.md](../decisoes-e-riscos.md) (novas `DA-NN`), `ET-01.md` (proposto).
- **Regras, falhas e bordas:** se um dever for incompatível com a arquitetura, registrar e escalar; não ajustar a arquitetura em silêncio.
- **Saída:** classificação e lista de deveres.
- **Validações:** ET-01-V07
- **Concluída quando:** DP-06 e DP-07 marcadas como resolvidas, com fonte.
- **Bloqueios ou aprovações:** nenhum.

### ET-01-T10 — Decidir a necessidade do EA15

- **Tipo:** investigação
- **Resultado pretendido:** DP-10 resolvida.
- **Entradas e pré-requisitos:** T01, T06.
- **Ações:**
  1. Verificar se o painel estadual de presidente e governador é atendido só por EA20 e EA14.
  2. Registrar se EA15 traria apenas dado municipal, fora do escopo.
- **Responsabilidade e caminhos:** `DA-NN` nova.
- **Regras, falhas e bordas:** na dúvida, EA15 fica fora da coleta (decisão já registrada em [dados/README.md](../../dados/README.md)).
- **Saída:** decisão.
- **Validações:** ET-01-V09
- **Concluída quando:** decisão escrita com a evidência.
- **Bloqueios ou aprovações:** nenhum.

### ET-01-T11 — Atualizar a documentação de dados e passar os bloqueios para ET-02

- **Tipo:** documentação
- **Resultado pretendido:** [dados/README.md](../../dados/README.md) reflete o que foi confirmado; ET-02 sabe o que pode fechar.
- **Entradas e pré-requisitos:** T01–T10.
- **Ações:**
  1. Marcar pendências resolvidas na tabela de [dados/README.md](../../dados/README.md), com link para a evidência.
  2. Registrar pendências novas.
  3. Atualizar o estado de DP-02 a DP-11 em [decisoes-e-riscos.md](../decisoes-e-riscos.md).
  4. Listar para ET-02 quais grupos do contrato podem ser fechados e quais continuam provisórios.
- **Responsabilidade e caminhos:** documentos citados.
- **Regras, falhas e bordas:** PKG-003: mudança de entendimento do contrato atualiza a documentação no mesmo conjunto.
- **Saída:** documentação atualizada.
- **Validações:** ET-01-V10
- **Concluída quando:** nenhuma pendência resolvida aparece como aberta, e vice-versa.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

Esta etapa não define o contrato público. Ela define a fronteira de entrada: quais campos brutos existem e o que significam. ET-02 decide o que desse conjunto vai para o contrato. Nada nesta etapa autoriza o web a conhecer nome de campo bruto.

Decisões que não podem ser tomadas em silêncio aqui: denominador de percentual (DP-09), uso do IDG como ordem (DP-08), exibição de status oficial (DP-11).

## 9. Segurança, integridade e performance

- R-03: bloqueio do IP. Controles: requisições contadas e autorizadas; caminho só do EA11; parada em bloqueio; nenhum 404 por tentativa.
- R-01: interpretação errada. Controle: matriz com evidência (T06) e comparação com a referência (T08).
- R-09: mistura oficial e simulado. Controle: diretórios e metadados separados (T04).
- R-13: JWS e resolução. Controle: T09 antes de qualquer exposição.
- Custo: nenhum recurso pago. O tamanho dos arquivos medido em T07 alimenta DP-12, DP-16 e o custo de tráfego de ET-07.

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-01-V01 | Fontes registradas | T01 | Revisar a lista de fontes | Cada fonte tem URL, data indicada e data de consulta | Fonte sem data ou de pleito anterior usada como 2026 | Revisão | Documento | T01 |
| ET-01-V02 | Allowlist candidata | T02 | Revisar hosts listados | Só hosts lidos na documentação ou no EA11 | Host inferido ou de terceiro | Revisão | Documento | T02 |
| ET-01-V03 | Matriz sem invenção | T06 | Para cada linha, abrir a evidência citada | Toda célula de campo aponta para trecho ou amostra; vazias têm pendência | Campo sem evidência | Revisão | Documento | T06 |
| ET-01-V04 | Amostras identificadas | T03–T05 | Conferir metadados de cada amostra | Todos os campos de metadados preenchidos; diretório coerente com a natureza | Amostra sem metadado, ou sintética fora de `sintetico/` | Revisão | Repositório | T03, T04, T05 |
| ET-01-V05 | Disciplina de consulta | T02, T05, T07 | Somar requisições registradas por execução | Total dentro do autorizado; nenhum 404 por tentativa; nenhuma tentativa durante bloqueio | Requisição não registrada, varredura ou repetição em bloqueio | Verificação operacional | Rede real, controlada | T02, T05, T07 |
| ET-01-V06 | Códigos confirmados | T03 | Cruzar cada código usado em URL com o EA11 guardado | Todos presentes no EA11 vigente | Código vindo só da página ou de outro turno | Revisão | Repositório | T03, T05 |
| ET-01-V07 | JWS e resolução | T09 | Ler as `DA-NN` criadas | DP-06 e DP-07 resolvidas, com fonte e etapa de cada dever | Pendência sem classificação | Revisão | Documento | T09 |
| ET-01-V08 | Comparação com referência | T08 | Ler o registro | Valores coincidem no mesmo instante, ou divergência explicada, ou inviabilidade justificada | Diferença sem explicação | Revisão | Documento | T08 |
| ET-01-V09 | EA15 | T10 | Ler a decisão | Decisão com evidência | Decisão sem evidência | Revisão | Documento | T10 |
| ET-01-V10 | Documentação coerente | T11 | Comparar [dados/README.md](../../dados/README.md) e [decisoes-e-riscos.md](../decisoes-e-riscos.md) | Estados coincidem | Pendência resolvida aparecendo aberta, ou o contrário | Revisão | Documento | T11 |

Nenhuma dessas validações prova o coletor. Elas provam que a interpretação tem base. Comportamento sob falha da origem é ET-04.

## 11. Infraestrutura e ações externas

- **Recurso:** acesso de rede ao host oficial a partir da máquina de quem executa. Não há conta nem cadastro, segundo o FAQ lido em 14/10/2026.
- **Manual:** leitura de documentos; requisições únicas; registro.
- **Automatizável:** nada nesta etapa justifica automação.
- **Aprovação:** limite de requisições por execução, escrito antes da primeira consulta.

## 12. Falha, reversão e recuperação

- **Bloqueio pela origem:** parar todas as consultas, registrar horário e aguardar pelo menos o prazo documentado antes de nova tentativa. Não trocar de rede para contornar.
- **Amostra mal identificada:** mover para o diretório correto e corrigir o metadado no mesmo commit; não apagar sem registro.
- **Interpretação corrigida depois:** atualizar a matriz e [dados/README.md](../../dados/README.md) juntos; avisar ET-02 e ET-03 pela pendência.

## 13. Critérios de conclusão

- [ ] Especificações de 2026 lidas ou ausência registrada (V01).
- [ ] EA11 vigente guardado e identificadores extraídos (V06).
- [ ] Amostras identificadas para cada recorte, ou ausência justificada (V04).
- [ ] Matriz completa, sem campo inventado (V03).
- [ ] Requisições contadas e dentro do autorizado (V05).
- [ ] JWS, resolução e EA15 classificados (V07, V09).
- [ ] Documentação de dados coerente (V10).

## 14. Pendências e passagem adiante

- Se o segundo turno ainda não tiver arquivo de resultado publicado, a matriz pode ficar completa quanto ao formato (pela especificação e pelo primeiro turno) e pendente quanto à confirmação com dado real. Essa pendência bloqueia só a verificação final de ET-03 com fixture oficial do segundo turno, não a escrita do schema.
- ET-02 recebe: matriz, amostras, tamanhos, classificação de JWS e da resolução.
- ET-04 recebe: allowlist candidata, padrões de caminho, comportamento de bloqueio e de 304 observados.

## 15. Brief de execução

Ler a documentação oficial de 2026, obter o EA11 vigente e poucas amostras identificadas (presidente Brasil, presidente UF, governador UF aplicável), e montar a matriz Informação | Arquivo/campo | Semântica | Evidência | Pendência. Separar oficial, simulado e sintético. Contar cada requisição, não varrer caminho, parar em bloqueio. Classificar JWS, resolução e EA15. Não escrever coletor, schema nem contrato. Validações V01–V10. Referências: [dados/README.md](../../dados/README.md), [collector/README.md](../../collector/README.md).
