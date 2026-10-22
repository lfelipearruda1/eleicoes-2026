# Contrato público dos snapshots

[Dados e integração com o TSE](README.md) · [Plano da ET-02](../planejamento/etapas/02-contrato-e-snapshots.md)

Este documento é a especificação que `@eleicoes/validation` implementa (PKG-002). Ele está sendo escrito por tarefa da ET-02. Hoje tem:

- o **envelope comum de snapshot** (ET-02-T01, 18/10/2026);
- a disponibilidade e o `sourceTime` opcional (parte da ET-02-T02, DA-18);
- a forma de `dataVersion` (parte da ET-02-T08, DA-19);
- a política de campos não previstos (parte da ET-02-T09, DA-20);
- os horários do manifesto (recorte da DP-14, DA-21);
- o **manifesto mínimo** do publicador local, com canal e `revision` (recorte da ET-02-T07 e da ET-02-T08, ação 2, DA-22);
- o **snapshot presidencial mínimo** de abrangência Brasil, envelope com payload (recorte da ET-02-T03 a T05, 19/10/2026).

Governador, divisão em vários arquivos e os demais campos do manifesto (vários arquivos por versão, retenção, TTL) ainda não foram definidos. Este documento **não é o contrato completo**: a versão inicial completa é a entrega da ET-02-T13. Implementação: `packages/validation/src/contract/` (`envelope.ts`, `manifest.ts`, `president.ts` e `constants.ts`).

## Envelope comum de snapshot

Todo arquivo de snapshot começa com os mesmos metadados. O payload eleitoral, ou seja, candidaturas, votos e andamento, fica fora do envelope e ainda não tem definição.

### Regras gerais

1. **Nomes.** As chaves são identificadores em inglês e `camelCase`, como no código (STYLE-004). Os valores enumerados também ficam em inglês. O texto mostrado ao visitante é responsabilidade do web.
2. **Ausência × `null` × valor.** Nenhum campo do envelope aceita `null`. Campo opcional sem valor fica **ausente**: a chave não aparece. `null`, string vazia ou zero nunca representam "não sei". Um campo obrigatório ausente invalida o arquivo inteiro e nunca é preenchido com valor padrão.
3. **Sem coerção.** O tipo do JSON precisa ser o tipo declarado. `"1"` não vale como `1`, e `"true"` não vale como `true` (SEC-001).
4. **Horários.** Seguem o formato ISO 8601 em UTC, com o sufixo `Z` e frações de segundo opcionais, como em `2026-10-25T21:04:17Z` ou `2026-10-25T21:04:17.512Z`. Sem deslocamento local, sem data isolada e sem número de época. O envelope **não** impõe relação de ordem entre horários. A origem pode estar atrasada, adiantada ou ter relógio próprio. Nenhum horário é preenchido a partir de outro.
5. **Campos não previstos.** Quem publica rejeita; quem lê descarta. Ver [Campos não previstos](#campos-não-previstos-publicação--leitura).

### A. Metadados que a aplicação define

| Campo               | Tipo             | Obrigatório | Significado                                                                                                                                                           | Valores permitidos                                                                                                                                                                                                       | Ausência / `null` | Regra de validação                                                                                                                                               | Quem produz                                                                   | Exemplo                                  | Sustentação                                                                                                                                   |
| ------------------- | ---------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `contractVersion`   | inteiro          | Sim         | Versão da **forma** do contrato com que o arquivo foi escrito. Não é a versão dos dados                                                                               | Inteiro ≥ 1. Esta especificação é a versão `1`                                                                                                                                                                           | Inválido          | Igual a `1`. Publicação e leitura rejeitam qualquer outra versão (DA-20)                                                                                         | Coletor, como constante da versão do código                                   | `1`                                      | ET-02-T01 (lista); separação forma × dados: [dados/README.md](README.md#contrato-conceitual), linha "Versão do snapshot e versão do contrato" |
| `dataVersion`       | string           | Sim         | Identificador de uma versão **imutável** do conjunto publicado (versão dos dados) a que o arquivo pertence. É igual em todos os arquivos da versão e no manifesto     | UUID versão 4, forma canônica com hífens, hexadecimal minúsculo                                                                                                                                                          | Inválido          | Exatamente 8-4-4-4-12 hexadecimais minúsculos, com versão `4` e variante `8`, `9`, `a` ou `b`. Sem espaço, sem chaves, sem coerção. A validação nunca gera valor | Publicador do coletor, ao montar a versão (gerador fora desta tarefa)         | `"0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d"` | DA-06; DA-19. Ver [dataVersion](#dataversion)                                                                                                 |
| `environment`       | string enumerada | Sim         | **Nosso** ambiente de destino da publicação                                                                                                                           | `local`, `staging` (homologação), `production`                                                                                                                                                                           | Inválido          | Um dos três valores, exatamente como escritos (minúsculas)                                                                                                       | Configuração do coletor                                                       | `"local"`                                | [collector/README.md](../collector/README.md) (ambiente de destino local, homologação ou produção); DA-13                                     |
| `sourceEnvironment` | string enumerada | Sim         | Ambiente **do TSE** de onde veio o dado, ou `synthetic` para fixture escrita pelo projeto                                                                             | `official`, `simulated`, `synthetic`                                                                                                                                                                                     | Inválido          | Um dos três valores. Se `environment` for `production`, `sourceEnvironment` precisa ser `official`                                                               | Configuração do coletor (host consultado)                                     | `"simulated"`                            | DA-13 ("Produção nunca aponta para dado simulado"); [dados/README.md](README.md#origem)                                                       |
| `round`             | inteiro          | Sim         | Turno da eleição a que o arquivo se refere                                                                                                                            | `1`, `2`                                                                                                                                                                                                                 | Inválido          | Inteiro igual a 1 ou 2. O produto publica o 2º turno; o valor 1 existe para amostras de formato do 1º turno (DP-02)                                              | Coletor, a partir da configuração confirmada no EA11                          | `2`                                      | [contexto.md](../contexto.md); DP-02. A correspondência entre pleito da origem e turno é do grupo B                                           |
| `office`            | string enumerada | Sim         | Cargo do resultado                                                                                                                                                    | `president`, `governor`                                                                                                                                                                                                  | Inválido          | Um dos dois valores                                                                                                                                              | Coletor, conforme o arquivo normalizado                                       | `"president"`                            | Escopo em [contexto.md](../contexto.md)                                                                                                       |
| `scope`             | string enumerada | Sim         | Abrangência do resultado: Brasil ou uma unidade da Federação                                                                                                          | `BR` ou a sigla, em maiúsculas, de uma das 27 unidades: `AC`, `AL`, `AP`, `AM`, `BA`, `CE`, `DF`, `ES`, `GO`, `MA`, `MT`, `MS`, `MG`, `PA`, `PB`, `PR`, `PE`, `PI`, `RJ`, `RN`, `RS`, `RO`, `RR`, `SC`, `SP`, `SE`, `TO` | Inválido          | Um dos 28 valores. Se `office` for `governor`, `scope` não pode ser `BR`                                                                                         | Coletor, ao normalizar                                                        | `"DF"`                                   | ET-02-T01, ação 3. Ver [identificação da UF](#identificação-da-unidade-da-federação)                                                          |
| `availability`      | string enumerada | Sim         | Situação do resultado neste recorte, como **estado interno** do projeto                                                                                               | `available`, `pending`, `not_applicable`, `unknown`                                                                                                                                                                      | Inválido          | Um dos quatro valores, exatamente como escritos                                                                                                                  | Coletor, ao normalizar (mapeamento a partir da origem ainda não implementado) | `"available"`                            | DA-18. Ver [Disponibilidade](#disponibilidade)                                                                                                |
| `collectedAt`       | string, horário  | Sim         | Instante da consulta à origem que produziu este arquivo. No coletor local é o `requestedAt` da requisição do resultado na captura; nunca o horário do reprocessamento | Regra geral 4                                                                                                                                                                                                            | Inválido          | Formato da regra geral 4                                                                                                                                         | Coletor, com relógio injetado na normalização (ET-03)                         | `"2026-10-25T21:04:19Z"`                 | DA-12; [collector/README.md](../collector/README.md#três-horários)                                                                            |

### B. Informações que dependem da interpretação dos arquivos do TSE

O campo e o tipo são nossos. O **valor** vem da origem e depende da matriz da ET-01 (DP-03, DP-04).

| Campo         | Tipo            | Obrigatório | Significado                                                                   | Valores permitidos                                                | Ausência / `null`                                                                                                                                                                                                                                 | Regra de validação                                                                                                                  | Quem produz                                                                                              | Exemplo                                                                    | Sustentação                                                                                                   |
| ------------- | --------------- | ----------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `sourceTime`  | string, horário | Não         | Instante que o arquivo oficial atribui à totalização ou à geração             | Regra geral 4                                                     | Ausente quando o horário da origem não estiver disponível de forma confirmada e interpretável, em qualquer `availability`. Ausência significa "horário da origem não informado", não "dado recente". `null` e chave com `undefined` são inválidos | Formato da regra geral 4. Nenhuma relação com `collectedAt` é exigida. Nunca é preenchido com `collectedAt` nem com o horário atual | Normalização, convertendo o campo da origem para UTC. Campo, formato e fuso da origem: pendentes (DP-03) | `"2026-10-25T21:03:00Z"` (ilustrativo)                                     | DA-12; ET-02-T12 (horário de origem por arquivo); [collector/README.md](../collector/README.md#três-horários) |
| `source`      | objeto          | Sim         | Rastreabilidade do arquivo consultado                                         | Campos abaixo                                                     | Inválido                                                                                                                                                                                                                                          | Objeto com os campos abaixo                                                                                                         | Coletor                                                                                                  | —                                                                          | [dados/README.md](README.md#contrato-conceitual), linha "Rastreabilidade"                                     |
| `source.file` | string          | Sim         | Caminho do arquivo da origem usado, relativo à URL base do ambiente de origem | Caminhos confirmados no EA11 e nas instruções de download (DP-04) | Inválido                                                                                                                                                                                                                                          | String não vazia; sem esquema nem host (`https://…`), sem query string e sem caminho de disco local (SEC-007)                       | Coletor, a partir da URL que montou                                                                      | `"sintetico/exemplo.json"` (sintético; nenhum caminho real foi confirmado) | [dados/README.md](README.md#arquivos-e-painéis); DP-04                                                        |

`round` também depende da origem quanto à correspondência entre pleito e turno. Essa correspondência é tarefa da normalização com o EA11 vigente. O tipo e os valores do campo, em A, não dependem dela.

### C. Informações ainda não confirmadas

| Campo previsto                                                    | Situação                                                                                                                                      | O que falta                        | Efeito enquanto falta                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| `source.generationId` (IDG)                                       | Fora do envelope. No snapshot presidencial está em `origin.generationId`, só para rastreabilidade                                             | Se ordena gerações (DP-08)         | Não é usado para ordenar nem para detectar mudança isoladamente |
| Código da eleição na origem (6258 e 6260 lidos na página técnica) | Não é campo do envelope. A disputa é identificada por `round`, `office` e `scope`. O código da origem pode entrar depois como rastreabilidade | DP-04: confirmação no EA11 vigente | Nenhum código da origem entra no contrato antes disso           |

### Fora do envelope: horário de publicação

O horário de publicação é "o instante em que a versão ficou endereçada pelo manifesto" ([collector/README.md](../collector/README.md#três-horários)). Os arquivos de uma versão são imutáveis e são gravados **antes** de o manifesto apontar para eles (DA-06). Por isso esse horário não cabe no envelope dos arquivos e pertence ao manifesto (ET-02-T07). Os três horários de DA-12 continuam distintos no contrato: `sourceTime` e `collectedAt` em cada arquivo, a publicação no manifesto.

### Disponibilidade

DA-18. Os quatro valores são **estados internos** do projeto, não códigos oficiais do TSE. Classificar um arquivo real em um deles cabe ao normalizador e depende da ET-01. Esse mapeamento ainda não foi implementado.

| Valor            | Significado                                                                                                  | O que **não** significa                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `available`      | Há resultado validado disponível                                                                             | Que o dado é recente, ou que a apuração terminou. Pode carregar valores zerados quando eles forem dados reais válidos                                              |
| `pending`        | A disputa está confirmada como aplicável, mas ainda não há resultado disponível                              | Falha de rede                                                                                                                                                      |
| `not_applicable` | Há confirmação de que a disputa não se aplica ao recorte (por exemplo, governador numa UF sem segundo turno) | Não pode ser inferido de timeout, erro de parsing ou HTTP 404 isolado. Exige evidência                                                                             |
| `unknown`        | Ainda não há evidência suficiente para determinar a situação                                                 | Não substitui automaticamente um resultado válido numa falha temporária. A última versão válida continua publicada ([collector/README.md](../collector/README.md)) |

Encerramento da apuração não é valor de `availability`. O sinal de atualização encerrada e seus critérios oficiais continuam na ET-02-T02, ação 4, e dependem da ET-01.

O dado simulado é identificado por `sourceEnvironment` (`simulated`) em todo arquivo (ET-02-T02, ação 5). A forma de mostrar isso na tela é da ET-06.

### dataVersion

DA-19.

- `contractVersion` identifica o **formato** do contrato. `dataVersion` identifica uma **versão imutável do conjunto publicado**.
- `dataVersion` não é código eleitoral do TSE, não é `source.generationId` e não é hash de integridade.
- O consumidor **não** ordena UUIDs para descobrir a versão mais recente. UUID v4 não tem ordem.
- Repetir a tentativa de publicar a mesma versão preserva o identificador. Uma verificação sem mudança não cria, por si só, versão nova. O conteúdo de uma versão publicada nunca muda mantendo o identificador.
- O validador não gera valor. A geração e o protocolo de publicação ficam para ET-04 e ET-05. O pacote de validação não importa `node:crypto`, porque roda também no navegador.

A ordem entre manifestos vem do campo `revision` (DA-22), não de `dataVersion`. Ver [Manifesto](#manifesto-recorte-do-publicador-local).

### Campos não previstos: publicação × leitura

DA-20. Esta política concilia a ET-03-T03, ação 5, com a ET-02-V06, separando quem publica de quem lê. Vale para o contrato dos nossos snapshots. Não define a política dos parsers dos arquivos brutos do TSE (ET-03-T04).

| Contexto   | Quem usa                         | Chave não prevista                                                    | Campo conhecido inválido ou ausente | `contractVersion` diferente de `1` | Schema                  |
| ---------- | -------------------------------- | --------------------------------------------------------------------- | ----------------------------------- | ---------------------------------- | ----------------------- |
| Publicação | Coletor, antes de gravar (ET-05) | **Rejeitada**, no topo e em `source`                                  | Rejeitado                           | Rejeitado                          | `publishEnvelopeSchema` |
| Leitura    | Web e qualquer consumidor        | **Descartada**: não aparece no objeto validado, no topo e em `source` | Rejeitado                           | Rejeitado                          | `readEnvelopeSchema`    |

- Os dois schemas compartilham campos e regras cruzadas. Só muda o tratamento de chave extra.
- Um campo opcional novo só é compatível se não mudar o significado nem as exigências dos campos anteriores. Nesse caso o cliente antigo lê e ignora o campo (ET-02-V06).
- Mudança incompatível exige novo `contractVersion`. O leitor não aceita versão desconhecida só porque os campos parecem semelhantes.
- Ainda falta (ET-02-T09, ação 3): se o coletor publica as duas versões em caminhos distintos durante uma transição incompatível.

### Envelope × snapshot completo

`publishEnvelopeSchema` e `readEnvelopeSchema` validam **só o objeto do envelope** e não devem ser aplicados a um arquivo com payload. O snapshot completo usa `publishResultSnapshotSchema` e `readResultSnapshotSchema` (abaixo), que compõem os mesmos campos e regras cruzadas do envelope com o payload e aplicam DA-20 ao documento inteiro, inclusive aos objetos aninhados. Não existe `payload` genérico. O publicador e o leitor locais usam o schema completo.

## Snapshot presidencial (recorte mínimo, 19/10/2026)

Implementação: `packages/validation/src/contract/result.ts`, sem `node:*` (importável pelo web). Normalização: `apps/collector/src/president/normalize.ts`. Campos no topo, junto do envelope. `office` é `president` (abrangência `BR` ou UF) ou `governor` (só UF), desde 20/10/2026; os schemas são `publishResultSnapshotSchema` e `readResultSnapshotSchema`. `availability` só aceita `pending` ou `available`: `unknown` e `not_applicable` não têm payload definido e são recusados.

| Campo                                    | Tipo              | Quando                      | Regra                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------- | ----------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `votesReleased`                          | booleano          | Sempre                      | `dv` do EA20 (`s`/`n`). Condição de exibição da votação presidencial                                                                                                                                                                                                                                  |
| `totalization.status`                    | enum              | Sempre                      | `not_started`, `in_progress`, `finished`, de `and` (`n`, `p`, `f`; EA20 pp. 9–10). Andamento, separado da disponibilidade                                                                                                                                                                             |
| `totalization.finalIndicator`            | booleano          | Sempre                      | `tf` (`s`/`n`): totalização final, quando o juiz eleitoral finaliza a eleição, elegendo ou não. Não é sinônimo de `and` = `f` (EA20 p. 9)                                                                                                                                                             |
| `sections.total` / `totalized`           | string decimal    | Sempre                      | `s.ts`, `s.st`. `totalized` ≤ `total`                                                                                                                                                                                                                                                                 |
| `sections.totalizedPercentage`           | string `d.dd`     | Sempre                      | `s.pst` com vírgula trocada por ponto. Não recalculado                                                                                                                                                                                                                                                |
| `pendingReason`                          | enum              | Só em `pending`             | `votes_not_released` (`dv` = `n`) ou `totalization_not_started` (`dv` = `s` e `and` = `n`). Motivo interno, coerente com os indicadores                                                                                                                                                               |
| `votes.total` / `valid` / `contestant`   | string decimal    | Só em `available`           | `v.tv`, `v.vv`, `v.vvc`. Categorias distintas; nenhuma derivada de outra (EA20, p. 20)                                                                                                                                                                                                                |
| `candidates[].candidateId`               | string de dígitos | Sempre                      | `sqcand`. Identidade estável; sem repetição. A ordem do array é por `candidateId` e não é identidade nem classificação                                                                                                                                                                                |
| `candidates[].number`, `ballotName`      | string            | Sempre                      | `n` (sem repetição) e `nmu`                                                                                                                                                                                                                                                                           |
| `candidates[].photo`                     | string            | Opcional                    | `fotos/<candidateId>.jpeg`, relativo à raiz das publicações (não ao canal). Só aparece depois que o coletor gravou a foto baixada do TSE (`<eleição>/fotos/<br\|uf>/<sqcand>.jpeg`, tipo `ft` do EA11) e conferiu que é JPEG. Ausente quando o TSE não publica a foto ou ela ainda não foi baixada    |
| `candidates[].votes`                     | string decimal    | Só em `available`           | `vap`: votos computados, antes das regras de totalização (EA20 p. 14, nota 1 da p. 22)                                                                                                                                                                                                                |
| `candidates[].contestantVotesPercentage` | string `d.dd`     | Só em `available`           | `pvap` com ponto. Base: votos a votáveis concorrentes, `vvc` (EA20, p. 14). Não é percentual de votos válidos e não é renormalizado                                                                                                                                                                   |
| `candidates[].voteDestination`           | enum              | Só em `available`, opcional | `dvt` do EA20: `valid` (Válido), `valid_party` (Válido (legenda)), `annulled` (Anulado), `annulled_sub_judice` (Anulado sub judice). Comparação sem acento nem caixa; texto desconhecido recusa a entrada; vazio ou ausente = não informado. Exigido na tela pelo art. 265, § 2º, da Res. 23.751/2026 |
| `origin.electionCode`                    | string de dígitos | Sempre                      | `ele`. Rastreabilidade                                                                                                                                                                                                                                                                                |
| `origin.generationId`                    | string de dígitos | Sempre                      | `idg`. Não ordena versões                                                                                                                                                                                                                                                                             |
| `origin.generatedAt` / `totalizedAt`     | `{date, time}`    | `totalizedAt` opcional      | `dg`/`hg` e `dt`/`ht` **como a origem envia** (`dd/mm/aaaa`, `hh:mm:ss`). Fuso não confirmado: por isso `sourceTime` fica ausente                                                                                                                                                                     |

Regras:

1. **Contagens** são strings decimais canônicas (`0` ou sem zero à esquerda), nunca `Number`. Valores acima de 2⁵³ são preservados.
2. **Pending** traz candidaturas só com identidade; votos e percentuais não aparecem, nem como zero. **Available** exige `votesReleased` e totalização iniciada. Zeros num `available` são dados válidos.
3. **Sem vencedor**: não há campo de eleito nem de classificação. `e`/`st` do EA20 não entram.
4. A decisão de disponibilidade é **do produto**, não estado literal do TSE. Valor desconhecido em `dv`, `and` ou `tf` é erro do parser. `and` = `n` com seções totalizadas ou votos é contradição (`TSE_RESULT_CONTRADICTION`) e a entrada não é publicada.
5. Nenhum campo opcional aceita `null`. DA-20 vale em todos os níveis: publicação rejeita chave extra, leitura descarta.
6. `synthetic` identifica fixture do projeto. O coletor só publica captura sintética em canal com prefixo `demo-`, e captura oficial só em canal sem esse prefixo.

Fonte das semânticas: especificação EA20 de 13/10/2026 (22 páginas), lida em 20/10/2026 a partir do PDF baixado pelo usuário ([ET-01.md](../planejamento/evidencias/ET-01.md)). Ela define `and` como `n`, `p` ou `f`. O código `a`, usado antes a partir de um trecho fornecido em conversa, **não existe** nessa versão: o parser passou a aceitar `p` e recusar `a`. `n` e `f` também foram observados em capturas oficiais.

### Horários do manifesto (recorte da DP-14)

DA-21. O manifesto mínimo e a publicação local foram implementados depois (DA-22). Desde 20/10/2026, `president-publish` grava `checkedAt` quando a captura é **oficial** (consulta registrada em `requests[]`, com 200 ou 304) e o conteúdo eleitoral é igual ao da versão atual: `checkedAt` recebe o `requestedAt` da consulta, `revision` soma 1 e `current` não muda. Só avança: consulta igual ou mais antiga que o último `checkedAt` (ou que o `collectedAt` da versão atual) não regrava o manifesto. Captura sintética e `publish` genérico nunca preenchem `checkedAt`, porque ler um arquivo local não comprova consulta à origem. Não há agendador: a frequência das regravações é a das execuções manuais (regra 8 depende de DP-16).

| Horário       | Onde                      | O que representa                                               |
| ------------- | ------------------------- | -------------------------------------------------------------- |
| `sourceTime`  | Cada arquivo, opcional    | Horário informado pela origem, quando disponível               |
| `collectedAt` | Cada arquivo              | Coleta que produziu aquele snapshot                            |
| `publishedAt` | Manifesto (nome proposto) | Publicação da versão referenciada                              |
| `checkedAt`   | Manifesto (nome proposto) | Última verificação válida relacionada ao conjunto referenciado |

O manifesto pode registrar `checkedAt` sem recriar os snapshots imutáveis. Regras:

1. Uma verificação bem-sucedida sem mudança pode atualizar `checkedAt`. Ela não altera `dataVersion`, os arquivos da versão nem `publishedAt`.
2. Regravar o manifesto não muda `publishedAt`.
3. Falha de consulta não atualiza `checkedAt`. Processo ativo não equivale a consulta bem-sucedida.
4. Consulta ao acompanhamento (EA14) não comprova que todos os resultados foram verificados. Um horário global não é atualizado como se todas as UFs tivessem sido verificadas quando só parte foi. Se a verificação for parcial, o horário fica no nível que ela cobriu, ou não é atualizado.
5. Se uma versão nova foi detectada e a publicação dela falhou, `checkedAt` não registra uma confirmação da versão anterior como se ela fosse a atual da origem.
6. `checkedAt` não prova que a origem gerou dados novos.
7. O manifesto continua utilizável sem verificação recente. O aviso de desatualização usa os horários; ele não invalida o manifesto.
8. Atualizações operacionais do manifesto são agrupadas e têm frequência controlada. Cada regravação é uma escrita e afeta o cache do ponteiro (DA-07).

Ficam fora deste recorte, sem valor inventado: intervalo de coleta (DP-16), limiar de desatualização (DP-14, parte do produto), TTL do manifesto (DP-17) e o formato de `checkedAt` por abrangência quando a verificação for parcial (ET-02-T07).

### Identificação da unidade da Federação

O contrato usa **código próprio e estável**: a sigla em maiúsculas das 26 unidades e do Distrito Federal. Brasil é `BR`, que não colide com nenhuma sigla.

- O conjunto de 27 unidades é fato da organização federativa, não dado da apuração. Não contraria a regra de não fixar listas de candidatos ou de unidades com segundo turno ([contexto.md](../contexto.md)). Quais UFs têm disputa de governador continua vindo do EA11 (ET-03-T08).
- O código da origem (formato, maiúsculas ou minúsculas) não entra no contrato. A conversão do código da origem para a sigla é da normalização e depende da ET-01 (grupo B).
- Votos no exterior não são uma abrangência deste contrato. O agregado `BR` é o que o arquivo oficial de abrangência Brasil publica, qualquer que seja a composição dele. Não é soma de UFs.

### Exemplo sintético do envelope

Dado sintético, sem relação com a apuração real. É um envelope válido para `publishEnvelopeSchema`. Não é um snapshot completo, porque o payload ainda não tem definição.

```json
{
  "contractVersion": 1,
  "dataVersion": "0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d",
  "environment": "local",
  "sourceEnvironment": "simulated",
  "round": 2,
  "office": "governor",
  "scope": "DF",
  "availability": "pending",
  "collectedAt": "2026-10-25T21:04:19Z",
  "sourceTime": "2026-10-25T21:03:00Z",
  "source": { "file": "sintetico/exemplo.json" }
}
```

### Critérios de validação do envelope

Cada linha tem teste em `packages/validation/testes/units/envelope.spec.ts`.

| #    | Entrada                                                                                                                                                                               | Resultado exigido                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| E-01 | Envelope com todos os obrigatórios válidos                                                                                                                                            | Aceito, com os mesmos valores (sem transformação)                                           |
| E-02 | Cada obrigatório ausente, um caso por campo                                                                                                                                           | Rejeitado, com o caminho do campo no erro                                                   |
| E-03 | Cada campo com `null`                                                                                                                                                                 | Rejeitado                                                                                   |
| E-04 | Tipo errado: `"1"` em `contractVersion` ou `round`; número em campo enumerado                                                                                                         | Rejeitado, sem conversão                                                                    |
| E-05 | `contractVersion` `0`, negativo ou fracionário                                                                                                                                        | Rejeitado                                                                                   |
| E-06 | `round` `0`, `3` ou `2.5`                                                                                                                                                             | Rejeitado                                                                                   |
| E-07 | Valor fora do enumerado em `environment`, `sourceEnvironment`, `office` e `scope`, incluindo a forma minúscula (`"sp"`, `"br"`)                                                       | Rejeitado                                                                                   |
| E-08 | `environment` `production` com `sourceEnvironment` `simulated`                                                                                                                        | Rejeitado                                                                                   |
| E-09 | `office` `governor` com `scope` `BR`                                                                                                                                                  | Rejeitado                                                                                   |
| E-10 | `office` `president` com `scope` `BR` e com uma UF; `governor` com uma UF                                                                                                             | Aceito                                                                                      |
| E-11 | Horário sem `Z`, com deslocamento (`-03:00`), só data, número de época, data impossível                                                                                               | Rejeitado                                                                                   |
| E-12 | Horário com e sem fração de segundo                                                                                                                                                   | Aceito                                                                                      |
| E-13 | `collectedAt` anterior a `sourceTime`                                                                                                                                                 | Aceito (o envelope não impõe ordem)                                                         |
| E-14 | `source.file` vazio, com `https://`, com query string                                                                                                                                 | Rejeitado                                                                                   |
| E-15 | `availability` com cada um dos quatro valores; valor desconhecido (`closed`, `AVAILABLE`, vazio); `sourceTime` ausente; `sourceTime` `null` ou com chave presente e valor `undefined` | Os quatro aceitos; desconhecido rejeitado; ausência aceita; `null` e `undefined` rejeitados |
| E-16 | `dataVersion` UUID v4 minúsculo; UUID v1 e v7; variante inválida; maiúsculas (todas ou uma); espaços; sem hífens; entre chaves; vazio; número                                         | Só o primeiro aceito                                                                        |
| E-17 | Chave não prevista no topo e em `source`, inclusive `generationId`                                                                                                                    | Publicação: rejeitada. Leitura: descartada do resultado, sem alterar a entrada              |
| E-18 | Na leitura: valor desconhecido de enum, `contractVersion` `2`, `source.file` ausente, `governor` com `BR`                                                                             | Rejeitado, como na publicação                                                               |

### Pendências restantes

P-01 (disponibilidade e `sourceTime`), P-02 (forma de `dataVersion`) e P-03 (campos não previstos) foram resolvidas por DA-18, DA-19 e DA-20.

| Ponto                                                                                                                        | Efeito                                                                                                                                             | Onde se resolve        |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Classificação dos arquivos reais em `available`, `pending`, `not_applicable` e `unknown`, e a conversão do horário da origem | Normalização                                                                                                                                       | ET-01, ET-03-T04 a T08 |
| Sinal de atualização encerrada                                                                                               | Parar o polling                                                                                                                                    | ET-02-T02, ação 4      |
| Publicação dupla numa mudança incompatível                                                                                   | Transição de `contractVersion`                                                                                                                     | ET-02-T09, ação 3      |
| `source.generationId` e código da eleição da origem                                                                          | Rastreabilidade                                                                                                                                    | DP-08, DP-04           |
| Restrição "sem caminho de disco local" em `source.file`                                                                      | O schema não distingue caminho da origem de caminho de disco. O publicador local nunca usa `source.file` como caminho; a garantia vale só para ele | ET-05                  |

Resolvida depois: regra de regressão com `dataVersion` sem ordem (R-19), por `revision` no manifesto (DA-22).

## Manifesto (recorte do publicador local)

DA-22. Implementação: `packages/validation/src/contract/manifest.ts` (sem `node:*`, roda no navegador). Este recorte cobre **um snapshot por versão** e só o envelope; não é o manifesto completo da ET-02-T07.

| Campo                   | Tipo             | Obrigatório | Regra                                                                                                                                       |
| ----------------------- | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `contractVersion`       | inteiro          | Sim         | `1`. Outro valor é rejeitado na publicação e na leitura                                                                                     |
| `channel`               | string           | Sim         | Chave interna do operador, não código oficial. `^[a-z0-9]+(-[a-z0-9]+)*$`, até 64 caracteres: nunca vira caminho arbitrário                 |
| `revision`              | inteiro          | Sim         | Inteiro positivo seguro em JavaScript (≤ 2⁵³−1). Ordena os manifestos do canal                                                              |
| `environment` … `scope` | como no envelope | Sim         | Os mesmos schemas e regras cruzadas do envelope (`environment`, `sourceEnvironment`, `round`, `office`, `scope`). Fixos depois da revisão 1 |
| `current.dataVersion`   | string           | Sim         | Forma de [dataVersion](#dataversion)                                                                                                        |
| `current.path`          | string           | Sim         | Exatamente `snapshots/<current.dataVersion>.json`, relativo ao diretório do canal. Sem URL, caminho absoluto ou `..`                        |
| `current.publishedAt`   | string, horário  | Sim         | Regra geral 4. Instante em que a versão passou a ser a atual                                                                                |
| `checkedAt`             | string, horário  | Não         | DA-21. Só a partir de captura oficial sem mudança                                                                                           |

DA-20 vale também aqui: `publishManifestSchema` rejeita chave extra no topo e em `current`; `readManifestSchema` descarta.

### Regras

1. **Correspondência.** O snapshot referenciado precisa ter o mesmo `dataVersion`, `environment`, `sourceEnvironment`, `round`, `office` e `scope` do manifesto (`findSnapshotMismatches`). Divergência invalida o par.
2. **Revisão.** A primeira publicação de um canal novo tem `revision` 1. Cada troca efetiva do manifesto soma 1, a partir do valor persistido. Repetir a versão atual não muda a revisão nem `publishedAt`. No limite de inteiro seguro, a publicação falha; a sequência nunca recomeça sozinha.
3. **O que não ordena.** UUID, `publishedAt` e relógio não definem a ordem. A revisão ordena nossas publicações; não prova que a origem tem dado mais novo. Retificação oficial que reduz votos não é regressão do manifesto.
4. **Canal.** Um canal é um fluxo com contexto fixo. Documento de outro contexto é recusado. Uma eleição futura usa outro canal: o publicador não tem como reconhecer o ano, então a chave é responsabilidade do operador.
5. **checkedAt.** Uma atualização de `checkedAt` soma 1 a `revision`, sem mudar `current`. Não é copiado de uma versão para outra.

### Decisão do consumidor

`decideManifestUpdate(aceito, recebido)` é função pura:

| Situação                             | Resultado      | Efeito                                                   |
| ------------------------------------ | -------------- | -------------------------------------------------------- |
| Nada aceito ainda                    | `newer`        | Candidato                                                |
| Outro canal ou outro contexto        | `incomparable` | Não é a mesma sequência; não substitui                   |
| `revision` menor                     | `stale`        | Ignorado                                                 |
| `revision` igual, mesmo conteúdo     | `same`         | Nada muda                                                |
| `revision` igual, conteúdo diferente | `conflict`     | Não substitui em silêncio                                |
| `revision` maior                     | `newer`        | Candidato: só vira estado aceito com o snapshot validado |

Manifesto recebido, snapshot carregado e estado aceito são três coisas distintas. Se o snapshot do manifesto novo falta ou é inválido, o consumidor mantém o último estado válido. Não é proteção criptográfica contra adulteração.

### Exemplo sintético

```json
{
  "contractVersion": 1,
  "channel": "demo-local-presidente-br-2t",
  "revision": 2,
  "environment": "local",
  "sourceEnvironment": "simulated",
  "round": 2,
  "office": "president",
  "scope": "BR",
  "current": {
    "dataVersion": "0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d",
    "path": "snapshots/0b7c9a52-3f1e-4d2a-9c4b-6e8f1a2b3c4d.json",
    "publishedAt": "2026-10-25T21:05:00Z"
  }
}
```

## Resumo por UF para o mapa (20/10/2026)

Implementação: `packages/validation/src/contract/ufSummary.ts` (`publishUfSummarySchema`, `readUfSummarySchema`). Publicado no canal `<prefixo>-mapa-presidente-<turno>t` com o mesmo manifesto, revisão e versões imutáveis dos demais.

| Campo              | Regra                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Envelope           | Igual ao dos snapshots, com `kind` `uf-summary`, `office` `president`, `scope` `BR` e `availability` `available`                                                     |
| `collectedAt`      | A coleta mais antiga entre as UFs incluídas                                                                                                                          |
| `ufs[]`            | Uma entrada por UF publicada, sem repetição e nunca `BR`: `scope`, `dataVersion` e `collectedAt` do snapshot da UF, `availability`, `totalizationStatus`, `sections` |
| `ufs[].candidates` | `pending`: só `candidateId`. `available`: `candidateId`, `votes`, `contestantVotesPercentage` e `voteDestination` opcional, copiados do snapshot da UF               |

O resumo não decide quem lidera: o web aplica a mesma regra do painel. UF ausente do resumo é "dados indisponíveis".
