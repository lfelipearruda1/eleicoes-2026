# ET-05 — Publicação local

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-05 |
| Componente | `apps/collector` (publicação em disco, simulador local, servidor estático de desenvolvimento) |
| Tipo predominante | Código com testes de integração em disco |
| Marco | M2 — Fluxo local completo |
| Resultado concreto | O coletor grava versões imutáveis em disco e só depois troca o manifesto. Falha no meio preserva a versão anterior; reinício retoma sem publicar vazio. Um simulador local faz os dados evoluírem e um servidor estático de desenvolvimento entrega os arquivos ao web |

## 2. Escopo e exclusões

**Faz:**

- Implementa a função `publish` (ET-04-T02) para disco local, no layout do contrato.
- Gera caminhos seguros, grava a versão de forma imutável, verifica o conjunto e troca o manifesto por último.
- Preserva o manifesto anterior diante de falha e recupera depois de interrupção.
- Separa ambientes no destino.
- Integra coleta e publicação no processo.
- Cria um simulador local de evolução dos dados e um servidor estático só de desenvolvimento.

**Não faz:**

- Não publica no R2 (ET-08).
- Não remove versão antiga. Retenção é regra de ET-02-T11; remoção só em ET-15 com decisão.
- Não cria backend permanente para o web. O servidor estático é ferramenta de desenvolvimento, fora do build e do deploy.
- Não promete o comportamento de cache da Cloudflare (ET-08, ET-13).

## 3. Contexto e evidências

Estado observado em 17/10/2026: não há código de publicação. A ordem de publicação está em [collector/README.md](../../collector/README.md) e COL-005 em [collector/padroes-de-desenvolvimento.md](../../collector/padroes-de-desenvolvimento.md). SEC-003 e SEC-007 em [codigo-seguro.md](../../seguranca/codigo-seguro.md). A matriz de [testes/seguranca.md](../../testes/seguranca.md) já prevê falha no meio da publicação e caminho com `..`. [.gitignore](../../../.gitignore) ignora `tmp/`, `temp/`, `dist/`, `.cache/`, mas não um diretório de publicação local; ele precisa ser escolhido e ignorado.

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Contrato | ET-02: manifesto, caminhos, identificador, publicabilidade (DP-12, DP-13) | T01, T03, T04, T05 |
| Implementação | ET-03: schemas do manifesto e dos arquivos | T04 |
| Implementação | ET-04: assinatura `publish` e processo em `main.ts` | T10 |
| Decisão | DP-20 (leitura local pelo web) | T12 |

**Pode começar com ET-04 em andamento:** T01 a T09 e T11 dependem só de ET-02 e ET-03; a integração (T10) espera ET-04.

## 5. Entradas e saídas

**Entradas:** conjunto normalizado de um ciclo (tipo de ET-04-T02); schemas de ET-03; diretório raiz da configuração.

**Saídas:**

| Artefato | Garantia | Consumidor |
| --- | --- | --- |
| Árvore em disco: `<raiz>/<ambiente>/<versões>/...` e manifesto, conforme ET-02 | Versão imutável; manifesto aponta só para versão completa e verificada | ET-06 (leitura local), testes |
| Publicador local em `apps/collector/src/publication/` (proposto) | Mesma ordem que o publicador R2 seguirá | ET-08 (referência de comportamento) |
| Suíte de contrato do publicador, reutilizável | Os mesmos cenários rodam contra o publicador R2 com transporte falso | ET-08-T04 |
| Simulador em `apps/collector/scripts/simulador/` (proposto) | Dados sintéticos marcados | ET-06, ET-08, ET-09, ET-13 |
| Servidor estático de desenvolvimento em `apps/collector/scripts/` (proposto) | Só GET e HEAD, só a raiz de publicação | ET-06 |

## 6. Responsabilidades e fronteiras

| Peça | Decide | Efeito |
| --- | --- | --- |
| Montagem de caminho | Se uma chave é segura | Nenhum |
| Publicador local | Ordem: versão → verificação → manifesto | Escrita em disco |
| Orquestração (ET-04) | Quando publicar | Chama `publish` |
| Servidor de desenvolvimento | Nada de regra | Entrega arquivos |

A regra de completude é a mesma do publicador R2; a suíte de contrato (T06, T08) é compartilhada para não duplicar o critério.

## 7. Sequência de tarefas

### ET-05-T01 — Implementar o publicador local no layout do contrato

- **Tipo:** código
- **Resultado pretendido:** `publish` grava uma versão nova e devolve seu identificador.
- **Entradas e pré-requisitos:** ET-02-T06 a T08; ET-04-T02.
- **Ações:**
  1. Ler a raiz e o ambiente da configuração.
  2. Gerar o identificador de versão pela regra de ET-02-T08, continuando a partir do manifesto existente.
  3. Encadear T03, T04 e T05.
  4. Escolher o diretório raiz padrão de desenvolvimento e adicioná-lo ao [.gitignore](../../../.gitignore).
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** um publicador ativo por raiz (DA-04). Não abrir dois processos na mesma raiz em teste.
- **Saída:** publicador local.
- **Validações:** ET-05-V02, ET-05-V12
- **Concluída quando:** uma chamada produz versão e manifesto legíveis.
- **Bloqueios ou aprovações:** DP-12.

### ET-05-T02 — Gerar caminhos seguros

- **Tipo:** código
- **Resultado pretendido:** nenhuma escrita sai da raiz (SEC-003).
- **Entradas e pré-requisitos:** identificadores validados.
- **Ações:**
  1. Montar caminhos só a partir de identificadores do contrato.
  2. Recusar `..`, caminho absoluto, separador inesperado e caractere de controle.
  3. Conferir que o caminho resolvido começa na raiz resolvida.
  4. Testes de integração em diretório temporário.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** link simbólico dentro da raiz apontando para fora também é recusado.
- **Saída:** função e testes.
- **Validações:** ET-05-V04
- **Concluída quando:** todos os casos hostis falham e nada é escrito fora da raiz.
- **Bloqueios ou aprovações:** nenhum.

### ET-05-T03 — Gravar os arquivos da versão de forma imutável

- **Tipo:** código
- **Resultado pretendido:** cada arquivo aparece inteiro ou não aparece; versão publicada não é reescrita com outro conteúdo.
- **Entradas e pré-requisitos:** T01, T02.
- **Ações:**
  1. Gravar em arquivo temporário no mesmo sistema de arquivos e renomear.
  2. Se a versão já existir com o mesmo conteúdo, tratar como idempotente; com conteúdo diferente, falhar (COL-003).
  3. Liberar descritores em caso de erro.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** disco cheio e permissão negada são falhas; não deixam arquivo final parcial.
- **Saída:** escrita da versão.
- **Validações:** ET-05-V05
- **Concluída quando:** os dois casos de identificador repetido têm teste.
- **Bloqueios ou aprovações:** nenhum.

### ET-05-T04 — Verificar o conjunto antes de disponibilizá-lo

- **Tipo:** código
- **Resultado pretendido:** o manifesto só é trocado se todos os arquivos exigidos existem, são legíveis e passam no schema.
- **Entradas e pré-requisitos:** ET-02-T10; schemas de ET-03.
- **Ações:**
  1. Reler cada arquivo da versão.
  2. Conferir tamanho e resumo declarados no manifesto novo.
  3. Validar com o schema público.
  4. Qualquer falha encerra a publicação sem tocar no manifesto.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** a verificação usa o schema, não só a existência do arquivo.
- **Saída:** etapa de verificação.
- **Validações:** ET-05-V08
- **Concluída quando:** arquivo ausente e arquivo corrompido mantêm o manifesto anterior.
- **Bloqueios ou aprovações:** DP-13 (o que é exigido).

### ET-05-T05 — Trocar o manifesto de forma atômica e por último

- **Tipo:** código
- **Resultado pretendido:** quem lê o manifesto vê o antigo ou o novo, nunca um arquivo pela metade.
- **Entradas e pré-requisitos:** T04.
- **Ações:**
  1. Gravar o manifesto novo em temporário e renomear sobre o atual.
  2. Validar o manifesto novo com o schema antes de renomear.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** antipadrão: trocar manifesto e depois gravar arquivos (COL-005).
- **Saída:** troca do ponteiro.
- **Validações:** ET-05-V02, ET-05-V06
- **Concluída quando:** leitura concorrente durante a troca só obtém manifestos completos.
- **Bloqueios ou aprovações:** nenhum.

### ET-05-T06 — Preservar o manifesto anterior quando a publicação falhar

- **Tipo:** código
- **Resultado pretendido:** uma tentativa incompleta não se torna a versão atual.
- **Entradas e pré-requisitos:** contrato de manifesto aprovado; T01–T05; uma versão válida já publicada.
- **Ações:**
  1. Identificar todos os artefatos exigidos pela nova versão.
  2. Publicá-los pelo protocolo de T03.
  3. Impedir a alteração do manifesto antes da confirmação de T04.
  4. Tratar a falha sem transformá-la em sucesso; devolver erro tipado ao ciclo.
  5. Registrar diagnóstico sem segredo e sem caminho sensível.
  6. Liberar arquivos temporários e descritores.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto); escrita injetável para simular falha.
- **Regras, falhas e bordas:** a falha pode ocorrer em qualquer arquivo; o teste cobre a falha no meio.
- **Saída:** comportamento e teste.
- **Validações:** ET-05-V01, ET-05-V02
- **Concluída quando:** no cenário de falha nenhuma leitura do manifesto aponta para B; o erro é observável; A continua utilizável. O cenário de sucesso é teste separado.
- **Bloqueios ou aprovações:** nenhum. **Limite da evidência:** este teste local não comprova o cache da Cloudflare, que tem validações próprias em ET-08 e ET-13.

### ET-05-T07 — Recuperar depois de interrupção ou reinício

- **Tipo:** código
- **Resultado pretendido:** o processo volta, reconhece a última versão válida e nunca publica conjunto vazio.
- **Entradas e pré-requisitos:** T05.
- **Ações:**
  1. Na partida, ler e validar o manifesto atual.
  2. Ignorar temporários e diretórios de versão não referenciados (não apagar; registrar).
  3. Se o manifesto for inválido ou ausente, não criar manifesto vazio: aguardar a primeira coleta completa.
  4. Continuar a sequência de identificadores.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** restos de tentativa anterior nunca são promovidos a versão.
- **Saída:** rotina de partida e testes.
- **Validações:** ET-05-V03
- **Concluída quando:** interrupção simulada entre arquivos e manifesto, seguida de reinício, mantém A e permite publicar C.
- **Bloqueios ou aprovações:** nenhum.

### ET-05-T08 — Ler uma versão sem mistura

- **Tipo:** teste
- **Resultado pretendido:** prova de que quem segue o manifesto lê só arquivos daquela versão.
- **Entradas e pré-requisitos:** T05.
- **Ações:**
  1. Leitor de teste: lê manifesto, depois os arquivos do caminho base da versão.
  2. Publicar B enquanto o leitor já tem o manifesto de A; confirmar que o leitor ainda lê A inteiro.
- **Responsabilidade e caminhos:** teste de integração (proposto).
- **Regras, falhas e bordas:** só vale porque versões não são removidas (ET-02-T11).
- **Saída:** teste.
- **Validações:** ET-05-V06
- **Concluída quando:** nenhuma combinação de A e B aparece numa leitura.
- **Bloqueios ou aprovações:** nenhum.

### ET-05-T09 — Separar ambientes no destino local

- **Tipo:** código
- **Resultado pretendido:** dado simulado e oficial nunca dividem o mesmo prefixo (DA-13).
- **Entradas e pré-requisitos:** T01; ET-02-T07.
- **Ações:**
  1. Incluir nosso ambiente e o ambiente da origem no caminho.
  2. Recusar configuração em que o prefixo não corresponda ao ambiente.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** o manifesto carrega o ambiente; o leitor confere.
- **Saída:** regra e testes.
- **Validações:** ET-05-V07
- **Concluída quando:** publicar com ambientes trocados falha.
- **Bloqueios ou aprovações:** nenhum.

### ET-05-T10 — Integrar coleta e publicação

- **Tipo:** código
- **Resultado pretendido:** `main.ts` usa o publicador local; o ciclo completo grava versões em disco.
- **Entradas e pré-requisitos:** ET-04-T14; T01–T09.
- **Ações:**
  1. Selecionar o publicador local pela configuração.
  2. Na partida, informar ao ciclo a última versão conhecida (T07).
  3. Rodar `--once` e o modo agendado contra o simulador (T11).
- **Responsabilidade e caminhos:** `apps/collector/src/main.ts` (proposto).
- **Regras, falhas e bordas:** sem mudança na origem não gera versão (ET-04-T07).
- **Saída:** fluxo local de dados completo.
- **Validações:** ET-05-V09
- **Concluída quando:** a evolução do simulador gera a sequência de versões esperada.
- **Bloqueios ou aprovações:** nenhum.

### ET-05-T11 — Criar o simulador local de evolução dos dados

- **Tipo:** código
- **Resultado pretendido:** uma origem local, controlada, que muda ao longo do tempo e falha quando pedido.
- **Entradas e pré-requisitos:** fixtures sintéticas de ET-03-T09.
- **Ações:**
  1. Servidor `node:http` que serve uma sequência de estados por arquivo, avançando por comando ou por tempo.
  2. Sequência mínima: inicial sem resultado; parcial; mais apurado; retificação com total menor; sem mudança; resposta inválida; timeout; bloqueio.
  3. Todas as respostas marcadas como sintéticas.
  4. Script em `apps/collector/package.json` (proposto, por exemplo `simulate`).
- **Responsabilidade e caminhos:** `apps/collector/scripts/simulador/` (proposto).
- **Regras, falhas e bordas:** o simulador não imita nome de candidato real; não é publicado em nenhum ambiente público.
- **Saída:** simulador.
- **Validações:** ET-05-V10
- **Concluída quando:** cada estado da sequência é alcançável e documentado.
- **Bloqueios ou aprovações:** nenhum.

### ET-05-T12 — Servir a publicação local ao web em desenvolvimento

- **Tipo:** código
- **Resultado pretendido:** o web local lê os arquivos por HTTP, de outra origem, sem backend permanente (DP-20).
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Registrar a decisão de DP-20 como `DA-NN`.
  2. Se adotada a recomendação, servidor `node:http` que entrega só a raiz de publicação, só GET e HEAD, com tipo de conteúdo JSON e cabeçalhos de cache diferentes para manifesto e versão, para aproximar a homologação.
  3. Responder CORS para a origem do Vite local.
  4. Script em `apps/collector/package.json` (proposto, por exemplo `serve:local`).
- **Responsabilidade e caminhos:** `apps/collector/scripts/` (proposto).
- **Regras, falhas e bordas:** recusar caminho fora da raiz (mesma função de T02). Não entra em imagem nem em deploy.
- **Saída:** servidor de desenvolvimento.
- **Validações:** ET-05-V11
- **Concluída quando:** o navegador local obtém o manifesto e os arquivos; caminho com `..` recebe recusa.
- **Bloqueios ou aprovações:** DP-20.

## 8. Contratos e compatibilidade

- Implementa `publish` de ET-04-T02 e o layout de ET-02. Qualquer divergência vira mudança de contrato, não ajuste local.
- O publicador R2 (ET-08) roda a mesma suíte de contrato. Divergência de comportamento entre os dois é defeito.
- Retenção: nada é removido. Crescimento do diretório local é aceito em desenvolvimento.

## 9. Segurança, integridade e performance

- R-04: V01, V03, V06, V08.
- R-09: V07.
- SEC-003: V04, V11.
- SEC-007: manifesto sem caminho interno nem credencial.
- Performance: escritas por versão contadas (número de arquivos de ET-02-T06); a verificação relê arquivos pequenos. Nada a otimizar sem medida (PERF-001).

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-05-V01 | Falha preserva A | Estado válido A publicado; escrita injetada que falha no meio de B | Publicar B; ler o manifesto | Manifesto referencia A; erro devolvido; arquivos de A legíveis | Manifesto aponta para B, ou erro engolido | Integração | Disco temporário | T06 |
| ET-05-V02 | Sucesso troca para B | Estado A | Publicar B sem falha | Manifesto referencia B; arquivos de B legíveis | Manifesto em A ou B incompleto | Integração | Disco temporário | T01, T05, T06 |
| ET-05-V03 | Interrupção e reinício | Processo interrompido após gravar arquivos de B e antes do manifesto | Reiniciar e publicar C | Partida lê A; restos de B não promovidos; C publicada; nenhum manifesto vazio | Manifesto vazio, B promovida, ou falha em publicar C | Integração | Disco temporário | T07 |
| ET-05-V04 | Caminho hostil | Identificadores com `..`, absoluto, controle, link simbólico | Publicar | Recusa; nada fora da raiz | Arquivo escrito fora | Integração | Disco temporário | T02 |
| ET-05-V05 | Identificador repetido | Versão existente | Republicar com mesmo conteúdo; com conteúdo diferente (casos separados) | Primeiro idempotente; segundo falha | Conteúdo sobrescrito | Integração | Disco temporário | T03 |
| ET-05-V06 | Leitura sem mistura | Leitor com manifesto de A | Publicar B; leitor lê arquivos | Leitor obtém só A | Mistura de A e B | Integração | Disco temporário | T05, T08 |
| ET-05-V07 | Ambientes separados | Configuração simulado e oficial | Publicar nos dois; publicar com prefixo trocado | Prefixos distintos; troca recusada | Mesmo prefixo, ou troca aceita | Integração | Disco temporário | T09 |
| ET-05-V08 | Conjunto inválido | Arquivo ausente; arquivo que não passa no schema (casos separados) | Publicar | Manifesto inalterado; erro | Manifesto trocado | Integração | Disco temporário | T04 |
| ET-05-V09 | Ciclo integrado | Simulador em estados 1, 2, 2 | Três ciclos | Duas versões; terceiro ciclo sem versão nova | Versão por ciclo sem mudança, ou falta versão | Integração | Local | T10 |
| ET-05-V10 | Simulador | Sequência completa | Percorrer estados | Cada estado respondido como documentado; marcação sintética | Estado inalcançável ou sem marca | Integração | Local | T11 |
| ET-05-V11 | Servidor de desenvolvimento | Raiz com versões | GET manifesto; GET arquivo; GET com `..`; POST | Dois primeiros 200 com JSON; `..` recusado; POST recusado | Arquivo fora da raiz ou escrita aceita | Integração | Local | T12 |
| ET-05-V12 | Sem remoção | Várias publicações | Listar versões | Todas presentes | Alguma removida | Integração | Disco temporário | T01 |

Disco local tem renomeação atômica por arquivo; o R2 e a CDN não. Esses testes não provam a ordem nem a visibilidade no R2 e no cache (ET-08-V04, ET-08-V06, ET-13).

## 11. Infraestrutura e ações externas

Não se aplica. Apenas disco e rede local.

## 12. Falha, reversão e recuperação

- **Detecção:** erro do `publish` registrado pelo ciclo; manifesto inalterado.
- **Dados:** a versão anterior continua no manifesto. Para voltar a uma versão mais antiga em desenvolvimento, apontar o manifesto manualmente para uma versão existente, validando-a antes (o procedimento formal é ET-12-T08).
- **Código:** reversão por commit.
- **Restos de tentativa:** mantidos e ignorados; limpeza só manual, depois de conferir que não são referenciados.

## 13. Critérios de conclusão

- [ ] Publicador local implementado com ordem COL-005 (V02).
- [ ] Falha, interrupção, conjunto inválido e caminho hostil testados (V01, V03, V04, V08).
- [ ] Imutabilidade e leitura sem mistura (V05, V06, V12).
- [ ] Ambientes separados (V07).
- [ ] Ciclo integrado e simulador (V09, V10).
- [ ] Servidor de desenvolvimento conforme DP-20 (V11).
- [ ] Suíte de contrato do publicador pronta para reutilização em ET-08.

## 14. Pendências e passagem adiante

- DP-20 decidida aqui.
- ET-06 recebe: diretório de publicação local, servidor de desenvolvimento e simulador.
- ET-08 recebe: suíte de contrato do publicador e comportamento de referência.
- ET-09 recebe: processo completo para empacotar.

## 15. Brief de execução

Implementar `publish` em disco: caminhos seguros, versão imutável (temporário + renomeação), verificação com schema, manifesto atômico e por último. Provar que falha no meio mantém A, que reinício não publica vazio e que leitura não mistura versões. Integrar ao ciclo, criar simulador local e servidor estático só de desenvolvimento. Não publicar no R2, não remover versões. Validações V01–V12. Referências: COL-003, COL-005, SEC-003, SEC-007.
