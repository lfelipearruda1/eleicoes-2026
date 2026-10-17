# ET-03 — Validação e normalização

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-03 |
| Componente | `packages/validation` (schemas do contrato), `apps/collector` (schemas da entrada bruta e normalização) |
| Tipo predominante | Código com testes unitários |
| Marco | Início de M2 — Fluxo local completo |
| Resultado concreto | Funções puras transformam respostas brutas confirmadas em snapshots do contrato, ou recusam com erro explícito. Uma suíte Vitest real, sem rede, prova cada regra |

## 2. Escopo e exclusões

**Faz:**

- Liga as dependências do workspace conforme a decisão de DP-18.
- Torna a suíte de testes real (retira `--passWithNoTests`).
- Escreve os schemas Zod do contrato público em `@eleicoes/validation`, com tipos inferidos.
- Escreve os schemas da entrada bruta somente para campos confirmados por ET-01.
- Escreve as funções puras de normalização: presidente Brasil, presidente UF, governador UF, configuração (UFs e disputas).
- Trata ausência, tipo inválido, precisão, denominador, status desconhecido, origem sem resultado e retificação conforme o contrato.
- Cria fixtures pequenas e rastreáveis.

**Não faz:**

- Não faz requisição HTTP (ET-04).
- Não lê nem grava arquivo de publicação (ET-05).
- Não compara com versão anterior nem detecta mudança: isso é estado, e fica em ET-04-T07.
- Não cria campo que o contrato não tenha.
- Não cria camada de repositório, fábrica ou interface sem segunda implementação (CC-009).

## 3. Contexto e evidências

Estado observado em 17/10/2026: [packages/validation/src/index.ts](../../../packages/validation/src/index.ts) exporta vazio; Zod 4.6.7 é dependência em [packages/validation/package.json](../../../packages/validation/package.json); [packages/types/src/index.ts](../../../packages/types/src/index.ts) exporta vazio; nenhum app depende de pacote; não há `vitest.config.*`; `pnpm test` usa `--passWithNoTests`.

Guias aplicáveis, por referência: PKG-001 a PKG-003 em [padroes/README.md](../../padroes/README.md); SEC-001 e SEC-002 em [codigo-seguro.md](../../seguranca/codigo-seguro.md); TEST-001 a TEST-005 em [unitarios-aaa.md](../../testes/unitarios-aaa.md); CC-008 e CC-009 em [clean-code-e-solid.md](../../padroes/clean-code-e-solid.md); estilo em [code-style-e-nomenclatura.md](../../padroes/code-style-e-nomenclatura.md); TypeScript em [typescript-funcoes-e-assincronismo.md](../../padroes/typescript-funcoes-e-assincronismo.md); COL-001 em [collector/padroes-de-desenvolvimento.md](../../collector/padroes-de-desenvolvimento.md).

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-00: DP-18 decidida (ET-00-T03) | T01, T02 |
| Contrato | ET-02: envelope, disponibilidade, manifesto (ET-02-T01, T02, T07) | T03 |
| Contrato | ET-02: números, candidatura, andamento (ET-02-T03 a T05) | T05 a T08 |
| Decisão | DP-03, DP-09 | T04, T06 |
| Recurso externo | Amostras oficiais de ET-01 | T09 (parte oficial); V04 |

**Podem começar com ET-02 parcial:** T01, T02, T03 (envelope, disponibilidade e manifesto não dependem de campo da origem), T10, T11. T04 a T08 só para os grupos que ET-02 marcou como confirmados.

## 5. Entradas e saídas

**Entradas:** contrato (`docs/dados/contrato.md`, proposto em ET-02-T13); matriz (`docs/dados/matriz-dados-tse.md`, proposto em ET-01-T06); amostras em `packages/election-data/fixtures/` (proposto em ET-01-T04).

**Saídas:**

| Artefato | Garantia | Consumidor |
| --- | --- | --- |
| Schemas e tipos inferidos em `packages/validation/src/` (proposto: `contract/`) | Aceitam só o contrato; tipos vêm do schema | ET-04, ET-05, ET-06, ET-08, ET-11 |
| Schemas da entrada bruta em `apps/collector/src/normalization/` (proposto) | Só campos confirmados | ET-04 |
| Funções puras de normalização em `apps/collector/src/normalization/` (proposto) | Determinísticas, sem rede, sem disco, sem relógio implícito | ET-04-T08 |
| Fixtures oficiais recortadas e sintéticas, com metadados | Rastreáveis à amostra de origem | ET-04, ET-05, ET-06 |
| Suíte Vitest executável | `pnpm test` falha sem testes | Todas as etapas |

## 6. Responsabilidades e fronteiras

| Módulo | Decide | Não faz |
| --- | --- | --- |
| `@eleicoes/validation` | Se um objeto obedece ao contrato público | Não conhece campo bruto do TSE; não importa React nem código do coletor (PKG-001) |
| Schema bruto no coletor | Se a resposta da origem tem os campos confirmados | Não é exportado ao web |
| Normalização no coletor | Como transformar bruto validado em contrato | Não faz I/O; recebe horário de coleta como parâmetro (relógio injetado) |
| Web | — | Não normaliza; só valida a resposta recebida com o schema público (WEB-005) |

A mesma regra não pode existir em dois lugares: percentual, ordem e disponibilidade são decididos aqui e só exibidos no web.

## 7. Sequência de tarefas

### ET-03-T01 — Ligar as dependências do workspace

- **Tipo:** configuração
- **Resultado pretendido:** coletor e web importam `@eleicoes/validation` e o build e o typecheck funcionam na ordem certa.
- **Entradas e pré-requisitos:** `DA-NN` resultante de DP-18 (ET-00-T03).
- **Ações:**
  1. Declarar a dependência `workspace:*` em [apps/collector/package.json](../../../apps/collector/package.json) e em [apps/web/package.json](../../../apps/web/package.json).
  2. Aplicar a mudança de `tsconfig` ou de `exports` decidida em DP-18.
  3. Rodar `pnpm install` e conferir que só o lockfile mudou do jeito esperado.
  4. Confirmar que `pnpm build` constrói o pacote antes dos apps.
- **Responsabilidade e caminhos:** `package.json` dos apps; `pnpm-lock.yaml`.
- **Regras, falhas e bordas:** não declarar `@eleicoes/types` ou `@eleicoes/election-data` sem import real.
- **Saída:** apps ligados ao pacote.
- **Validações:** ET-03-V16
- **Concluída quando:** um import do pacote compila nos dois apps e no build limpo (sem `dist` prévio).
- **Bloqueios ou aprovações:** revisão de mudança no lockfile (SEC-008).

### ET-03-T02 — Tornar a suíte de testes real

- **Tipo:** configuração
- **Resultado pretendido:** `pnpm test` falha quando não há teste e roda os testes dos pacotes e do coletor.
- **Entradas e pré-requisitos:** primeiro arquivo de teste de T03.
- **Ações:**
  1. Retirar `--passWithNoTests` do script `test` em [package.json](../../../package.json), na mesma mudança do primeiro `.spec.ts`.
  2. Se necessário, criar `vitest.config.ts` (proposto) com ambiente Node para pacotes e coletor. O ambiente DOM do web é ET-06-T01.
  3. Registrar em `docs/planejamento/evidencias/ET-03.md` (proposto) a quantidade de testes executados.
- **Responsabilidade e caminhos:** [package.json](../../../package.json); `vitest.config.ts` (proposto).
- **Regras, falhas e bordas:** não criar teste trivial para ter "pelo menos um" (TEST-005).
- **Saída:** comando que prova suíte.
- **Validações:** ET-03-V01
- **Concluída quando:** com zero arquivos de teste o comando falha; com a suíte, roda e lista os testes.
- **Bloqueios ou aprovações:** nenhum.

### ET-03-T03 — Escrever os schemas do contrato público

- **Tipo:** código
- **Resultado pretendido:** schemas Zod do envelope, da disponibilidade, do manifesto e dos arquivos de resultado, com tipos inferidos (PKG-002).
- **Entradas e pré-requisitos:** contrato de ET-02; T01, T02.
- **Ações:**
  1. Escrever o schema do envelope e da disponibilidade.
  2. Escrever o schema do manifesto.
  3. Escrever os schemas de resultado para os grupos confirmados; grupos provisórios ficam fora até confirmação.
  4. Exportar os tipos com inferência, sem interface manual paralela.
  5. Rejeitar campos não previstos de modo explícito e testado.
  6. Testes AAA: exemplo válido aceito; cada obrigatório ausente rejeitado (`it.each`); campo extra tratado conforme a regra.
- **Responsabilidade e caminhos:** `packages/validation/src/contract/` (proposto); [packages/validation/src/index.ts](../../../packages/validation/src/index.ts) passa a exportar.
- **Regras, falhas e bordas:** sem coerção que transforme ausência em zero (SEC-001). Validar manifesto também no web, uma vez por resposta.
- **Saída:** schemas, tipos, testes.
- **Validações:** ET-03-V02, ET-03-V03, ET-03-V11
- **Concluída quando:** os exemplos sintéticos de ET-02 passam e as variações inválidas falham.
- **Bloqueios ou aprovações:** grupos provisórios de ET-02.

### ET-03-T04 — Escrever os schemas da entrada bruta confirmada

- **Tipo:** código
- **Resultado pretendido:** a resposta da origem é validada antes de qualquer transformação.
- **Entradas e pré-requisitos:** matriz de ET-01 (DP-03).
- **Ações:**
  1. Para EA11 (recorte necessário) e EA20 (Brasil e UF, presidente e governador), escrever schemas só com os campos usados.
  2. Decidir campo extra na entrada bruta: ignorado de forma explícita (a origem pode acrescentar campos) e nunca copiado para a saída.
  3. Testes AAA com recorte de amostra oficial e com sintéticos inválidos.
- **Responsabilidade e caminhos:** `apps/collector/src/normalization/` (proposto).
- **Regras, falhas e bordas:** tipo inesperado em campo usado é falha, não conversão.
- **Saída:** schemas brutos e testes.
- **Validações:** ET-03-V05, ET-03-V11
- **Concluída quando:** cada campo usado tem teste de presença e de tipo.
- **Bloqueios ou aprovações:** DP-03.

### ET-03-T05 — Normalizar o resultado presidencial (Brasil e UF)

- **Tipo:** código
- **Resultado pretendido:** EA20 de presidente validado vira snapshot do contrato para Brasil e para cada UF.
- **Entradas e pré-requisitos:** T03, T04.
- **Ações:**
  1. Função pura que recebe o bruto validado, a abrangência e os horários (coleta injetada) e devolve o snapshot.
  2. Ordenar candidaturas pela regra de ET-02-T04.
  3. Testes AAA com valores esperados digitados a partir da amostra, não calculados pela própria função (TEST-001).
- **Responsabilidade e caminhos:** `apps/collector/src/normalization/` (proposto).
- **Regras, falhas e bordas:** o nacional vem do arquivo de abrangência Brasil, nunca de soma ou contagem de UFs.
- **Saída:** função e testes.
- **Validações:** ET-03-V04, ET-03-V09, ET-03-V13
- **Concluída quando:** amostra oficial recortada produz os valores conferidos à mão.
- **Bloqueios ou aprovações:** amostra oficial (ET-01-T05) para V04.

### ET-03-T06 — Implementar as regras numéricas

- **Tipo:** código
- **Resultado pretendido:** votos e percentuais seguem tipo, denominador e precisão do contrato (DP-09).
- **Entradas e pré-requisitos:** ET-02-T03.
- **Ações:**
  1. Converter votos conforme o tipo da origem, recusando texto não numérico, negativo, fracionário e acima do inteiro seguro.
  2. Tratar percentual conforme a decisão: repassar o da origem com validação de faixa, ou calcular com denominador confirmado.
  3. Aplicar precisão e arredondamento definidos.
  4. Testes: zero válido preservado; valores-limite; inválidos rejeitados (`it.each`).
- **Responsabilidade e caminhos:** `apps/collector/src/normalization/` (proposto).
- **Regras, falhas e bordas:** antipadrão `Number(value) || 0` (SEC-001).
- **Saída:** funções e testes.
- **Validações:** ET-03-V05, ET-03-V06, ET-03-V07
- **Concluída quando:** nenhum valor inválido vira número plausível.
- **Bloqueios ou aprovações:** DP-09.

### ET-03-T07 — Implementar andamento, status e status desconhecido

- **Tipo:** código
- **Resultado pretendido:** andamento e status seguem ET-02-T05, inclusive a diferença federal × estadual.
- **Entradas e pré-requisitos:** ET-02-T05; DP-11.
- **Ações:**
  1. Mapear valores conhecidos de status para o contrato.
  2. Aplicar a regra de status desconhecido decidida em ET-02-T05.
  3. Preservar `false` válido em indicadores booleanos.
  4. Testes de cada valor conhecido, de um desconhecido e do booleano falso.
- **Responsabilidade e caminhos:** `apps/collector/src/normalization/` (proposto).
- **Regras, falhas e bordas:** nenhum campo de vencedor calculado.
- **Saída:** função e testes.
- **Validações:** ET-03-V06, ET-03-V08
- **Concluída quando:** status desconhecido segue a regra e é visível no teste.
- **Bloqueios ou aprovações:** DP-03, DP-11.

### ET-03-T08 — Normalizar configuração, governador e "sem disputa"

- **Tipo:** código
- **Resultado pretendido:** a configuração diz quais UFs existem e onde há governador; UF sem disputa produz representação explícita.
- **Entradas e pré-requisitos:** T03, T04; ET-01-T03.
- **Ações:**
  1. Função pura que extrai do EA11 validado a lista de UFs (com DF) e as disputas de governador do segundo turno.
  2. Função pura para EA20 de governador.
  3. Para UF sem disputa, produzir o estado "sem disputa" do contrato.
  4. Distinguir origem sem resultado ainda (arquivo inexistente ou zerado) conforme ET-02-T02.
  5. Testes de cada caso.
- **Responsabilidade e caminhos:** `apps/collector/src/normalization/` (proposto).
- **Regras, falhas e bordas:** lista de UFs com governador nunca escrita à mão no código.
- **Saída:** funções e testes.
- **Validações:** ET-03-V10, ET-03-V15
- **Concluída quando:** UF com disputa, UF sem disputa e disputa sem resultado ainda têm testes separados.
- **Bloqueios ou aprovações:** DP-05 para a fixture oficial; a lógica não espera.

### ET-03-T09 — Montar fixtures pequenas e rastreáveis

- **Tipo:** teste
- **Resultado pretendido:** cada teste usa a menor fixture que demonstra o comportamento, com origem conhecida.
- **Entradas e pré-requisitos:** ET-01-T04; amostras.
- **Ações:**
  1. Recortar amostras oficiais mantendo o metadado com referência ao arquivo de origem.
  2. Criar sintéticos em `sintetico/`, com nome que não se confunda com captura oficial.
  3. Não incluir segredo nem dado pessoal além do publicado.
- **Responsabilidade e caminhos:** `packages/election-data/fixtures/` (proposto).
- **Regras, falhas e bordas:** fixture sintética não imita nome de candidato real.
- **Saída:** fixtures.
- **Validações:** ET-03-V04
- **Concluída quando:** toda fixture usada em teste tem metadado.
- **Bloqueios ou aprovações:** DP-02 para a parte oficial.

### ET-03-T10 — Proteger a entrada contra campos e chaves indevidos

- **Tipo:** código
- **Resultado pretendido:** campo não previsto não chega ao JSON público; chave de protótipo não altera objeto (SEC-001, SEC-002).
- **Entradas e pré-requisitos:** T03, T04.
- **Ações:**
  1. Construir a saída copiando só os campos do contrato.
  2. Não usar mescla recursiva de objeto não confiável.
  3. Testes com campo extra e com chave `__proto__` em fixture sintética.
- **Responsabilidade e caminhos:** `apps/collector/src/normalization/` (proposto).
- **Regras, falhas e bordas:** —
- **Saída:** testes.
- **Validações:** ET-03-V11, ET-03-V12
- **Concluída quando:** os dois testes passam.
- **Bloqueios ou aprovações:** nenhum.

### ET-03-T11 — Garantir determinismo e serialização estável

- **Tipo:** código
- **Resultado pretendido:** a mesma entrada produz o mesmo JSON byte a byte; isso permite a ET-04 detectar mudança pelo conteúdo.
- **Entradas e pré-requisitos:** T05 a T08.
- **Ações:**
  1. Definir ordem estável de chaves e de listas na serialização.
  2. Garantir que nenhum horário implícito (`Date.now`) entra na função pura.
  3. Teste: duas execuções com a mesma entrada e o mesmo horário injetado produzem a mesma string.
- **Responsabilidade e caminhos:** `apps/collector/src/normalization/` (proposto).
- **Regras, falhas e bordas:** horário de coleta faz parte do envelope; a comparação de mudança em ET-04 deve excluir os horários nossos.
- **Saída:** função de serialização e teste.
- **Validações:** ET-03-V13, ET-03-V14
- **Concluída quando:** teste de determinismo passa e revisão confirma ausência de I/O.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

- Implementa o contrato de ET-02 sem acrescentar campo. Diferença encontrada vira mudança no documento de contrato primeiro (PKG-003).
- O tipo exportado por `@eleicoes/validation` é o único tipo público. `@eleicoes/types` continua sem uso até haver necessidade; não duplicar.
- Retificação: a normalização não tem memória da versão anterior, então não rejeita total menor (R-14). A regra de comparação fica em ET-04-T07.

## 9. Segurança, integridade e performance

- R-01: valor esperado nos testes vem da amostra conferida, não da implementação.
- R-14: total menor aceito (V09).
- SEC-001: sem coerção; limite de tamanho é aplicado antes do parse em ET-04-T03, não aqui.
- SEC-002: sem mescla de objeto não confiável (V12).
- Performance: função pura sem cópia repetida de objeto grande (PERF-003). Não otimizar sem medida (PERF-001).

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-03-V01 | Suíte real | Flag retirado | `pnpm test` com e sem arquivos de teste | Sem testes: falha; com testes: lista os executados | Passa sem testes | Integração | Local | T02 |
| ET-03-V02 | Contrato válido aceito | Exemplos sintéticos de ET-02 | `parse` | Aceito e tipado | Rejeitado | Unitário | Local | T03 |
| ET-03-V03 | Obrigatório ausente | Exemplo sem cada campo obrigatório | `safeParse` (`it.each`, um caso por campo) | Rejeição com caminho do campo | Aceito, ou campo preenchido com padrão | Unitário | Local | T03 |
| ET-03-V04 | Amostra oficial | Fixture oficial recortada e valores digitados à mão da amostra | Normalizar | Saída igual aos valores digitados | Divergência, ou valor esperado calculado pela própria função | Unitário | Local | T05, T09 |
| ET-03-V05 | Tipo inválido | Voto como texto não numérico, negativo, fracionário | Normalizar | Erro explícito; nenhuma saída | Saída com zero ou número convertido | Unitário | Local | T04, T06 |
| ET-03-V06 | Zero e `false` válidos | Fixture com voto 0 e indicador `false` | Normalizar | 0 e `false` na saída | Ausência, `null` ou `true` | Unitário | Local | T06, T07 |
| ET-03-V07 | Precisão | Valores de borda de arredondamento | Normalizar | Valores conforme a regra de ET-02-T03 | Arredondamento diferente | Unitário | Local | T06 |
| ET-03-V08 | Status desconhecido | Fixture com status não mapeado | Normalizar | Comportamento definido em ET-02-T05 | Status inventado ou silêncio | Unitário | Local | T07 |
| ET-03-V09 | Retificação | Duas fixtures, a segunda com total menor | Normalizar a segunda | Saída normal, sem rejeição | Rejeição por "queda" | Unitário | Local | T05 |
| ET-03-V10 | Origem sem resultado | Fixture zerada e ausência de arquivo | Normalizar cada caso | Estados distintos conforme ET-02-T02 | Os dois iguais | Unitário | Local | T08 |
| ET-03-V11 | Campo extra | Bruto com campo não usado | Normalizar | Campo ausente da saída | Campo copiado | Unitário | Local | T03, T04, T10 |
| ET-03-V12 | Chave de protótipo | Bruto com `__proto__` | Normalizar | Protótipo intacto; chave ausente da saída | Objeto poluído | Unitário | Local | T10 |
| ET-03-V13 | Determinismo | Mesma entrada e horário | Serializar duas vezes | Strings idênticas | Diferença de ordem | Unitário | Local | T05, T11 |
| ET-03-V14 | Sem I/O nas funções puras | Código das funções | Revisão de imports (`node:fs`, `fetch`, `Date.now`) | Nenhum | Algum presente | Revisão | Local | T11 |
| ET-03-V15 | UF sem governador | Configuração sem disputa na UF | Normalizar | Estado "sem disputa" | Painel vazio ou erro | Unitário | Local | T08 |
| ET-03-V16 | Pacote consumido | T01 | `pnpm build` limpo e `pnpm typecheck` | Os dois passam; apps importam o schema | Falha por `dist` ausente ou tipo antigo | Integração | Local | T01 |

Testes unitários com fixture não provam que a origem continuará no mesmo formato. Mudança de formato é detectada em tempo de execução pelo schema (ET-04).

## 11. Infraestrutura e ações externas

Não se aplica. Sem recurso externo. Não consulta o TSE.

## 12. Falha, reversão e recuperação

- **Código:** cada tarefa é uma mudança revisável; reversão por `git revert`.
- **Contrato errado:** corrigir primeiro o documento de ET-02, depois schema e testes.
- **Dados:** nenhum dado publicado nesta etapa.

## 13. Critérios de conclusão

- [ ] Dependências do workspace ligadas; build limpo funciona (V16).
- [ ] `pnpm test` prova suíte (V01).
- [ ] Schemas do contrato e da entrada com testes de aceitação e recusa (V02, V03, V05, V11, V12).
- [ ] Normalização dos grupos confirmados com amostra oficial (V04), números (V06, V07), status (V08), retificação (V09), disponibilidade (V10, V15).
- [ ] Determinismo e ausência de I/O (V13, V14).
- [ ] [dados/README.md](../../dados/README.md) coerente com o schema (PKG-003).

## 14. Pendências e passagem adiante

- Grupos provisórios em ET-02 continuam sem schema; ET-04 não os coleta.
- Fixture oficial do segundo turno pode chegar depois; quando chegar, V04 é repetida com ela.
- ET-04 recebe: schemas brutos, normalização, serialização estável.
- ET-05 recebe: schema do manifesto e dos arquivos para verificar antes de publicar.
- ET-06 recebe: schema público para validar respostas.

## 15. Brief de execução

Ligar `@eleicoes/validation` aos apps, retirar `--passWithNoTests`, escrever os schemas do contrato e da entrada confirmada, e as funções puras de normalização (presidente Brasil e UF, governador, configuração). Cobrir ausência, tipo inválido, zero e `false`, precisão, status desconhecido, origem sem resultado, retificação, campo extra, `__proto__` e determinismo, com testes AAA de um comportamento cada. Sem rede, disco ou relógio implícito. Validações V01–V16. Referências: PKG-001 a PKG-003, SEC-001, SEC-002, TEST-001 a TEST-005.
