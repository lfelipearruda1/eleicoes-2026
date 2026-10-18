# ET-12 — Automação e operação

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo              | Conteúdo                                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                 | ET-12                                                                                                                                                                                                                                                       |
| Componente         | GitHub Actions (`.github/workflows/`), observabilidade, alertas, procedimentos de operação; Cloudflare e AWS de homologação                                                                                                                                 |
| Tipo predominante  | Configuração e operação                                                                                                                                                                                                                                     |
| Marco              | Preparação de M6 — Prontidão operacional                                                                                                                                                                                                                    |
| Resultado concreto | Verificações e publicações saem de workflows reproduzíveis com privilégio mínimo; coleta, publicação, leitura e atualidade são observáveis; cada alerta tem ação escrita; rotação de credencial, retorno de versão e alertas foram ensaiados em homologação |

## 2. Escopo e exclusões

Esta etapa consolida práticas que já existem desde as etapas anteriores (testes desde ET-03, proteção básica em ET-07, logs e alertas mínimos em ET-10). Ela não é a primeira vez em que essas proteções aparecem e não autoriza operar sem elas até aqui.

**Faz:** workflow de verificação; auditoria de dependências e detecção de segredo; deploy do site por ambiente; build e implantação da imagem; observabilidade consolidada; alertas com ação; rotação; retorno de versão; manual de operação; ensaios.

**Não faz:**

- Não executa deploy de produção (ET-14). Prepara o caminho com aprovação obrigatória.
- Não roda carga (ET-13).
- Não instala Sentry, OpenTelemetry ou Grafana por obrigação: decide com base no que já existe (DA-14, DP-26).

## 3. Contexto e evidências

Estado observado em 17/10/2026: `.github/workflows/` só tem `.gitkeep`; não há segredo de CI, ambiente do GitHub, alarme ou manual de operação. Base: SEC-008 (workflow com permissão mínima, action fixada por commit, segredo fora de contribuição não confiável) em [codigo-seguro.md](../../seguranca/codigo-seguro.md); roteiro de incidente em [seguranca/README.md](../../seguranca/README.md); REV-002, REV-004 e REV-007 em [revisao-de-codigo.md](../../padroes/revisao-de-codigo.md); "O que observar" em [performance.md](../../padroes/performance.md).

## 4. Dependências e critérios de entrada

| Tipo            | Item                                                                     | Bloqueia                         |
| --------------- | ------------------------------------------------------------------------ | -------------------------------- |
| Implementação   | ET-10: coletor contínuo em homologação, alarmes mínimos                  | T04, T05, T06, T07, T08          |
| Implementação   | ET-11: build final do web                                                | T03                              |
| Implementação   | ET-03 em diante: suíte de testes                                         | T01                              |
| Decisão         | DP-26 (canal, ferramentas, verificação externa)                          | T05, T06                         |
| Decisão         | DP-23 (ferramenta de deploy)                                             | T03                              |
| Decisão         | DP-14 (limiar de atraso)                                                 | Valor do alerta de atraso em T06 |
| Recurso externo | Repositório no GitHub com permissão para configurar ambientes e segredos | T01–T04                          |
| Autorização     | Criação de tokens de CI com escopo mínimo                                | T03, T04                         |

**Pode começar antes:** um workflow mínimo de verificação (T01 sem deploy) pode nascer assim que ET-03 tiver a primeira suíte; ver [plano mestre](../plano-mestre.md#5-paralelismo-e-início-parcial).

## 5. Entradas e saídas

**Entradas:** scripts de verificação existentes; procedimento de deploy manual de ET-08-T06 e ET-10-T06; alarmes de ET-10-T08; credenciais de ET-07 e ET-10.

**Saídas:**

| Artefato                                                                                      | Consumidor             |
| --------------------------------------------------------------------------------------------- | ---------------------- |
| Workflows em `.github/workflows/` (propostos: verificação, deploy do site, imagem do coletor) | ET-13, ET-14           |
| Tabela de alertas com ação em `docs/operacao/alertas.md` (proposto)                           | Operação, ET-13, ET-14 |
| Manual de operação em `docs/operacao/README.md` (proposto)                                    | ET-13, ET-14, ET-15    |
| Ferramenta de retorno do manifesto em `apps/collector/scripts/` (proposto)                    | Operação, ET-14        |
| Evidências dos ensaios                                                                        | M6                     |

## 6. Responsabilidades e fronteiras

| Peça                       | Responsabilidade                                | Privilégio                                                      |
| -------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Workflow de verificação    | Rodar tipos, lint, formatação, testes e build   | Leitura do repositório; nenhum segredo                          |
| Workflow de deploy do site | Publicar build no ambiente escolhido            | Token de deploy do ambiente; aprovação em produção              |
| Workflow de imagem         | Construir e enviar a imagem com marca imutável  | Escrita no registro; identidade de curta duração, se disponível |
| Ferramenta de retorno      | Apontar o manifesto para versão anterior válida | Credencial de publicação do ambiente, usada manualmente         |
| Alertas                    | Avisar com ação                                 | Leitura de métricas e logs                                      |

## 7. Sequência de tarefas

### ET-12-T01 — Criar o workflow de verificação

- **Tipo:** configuração
- **Resultado pretendido:** todo PR e todo push na branch principal rodam as verificações e falham quando devem.
- **Entradas e pré-requisitos:** suíte de ET-03 em diante.
- **Ações:**
  1. Disparo em `pull_request` e `push`; nunca em evento que dê segredo a código de fork.
  2. `permissions` somente leitura.
  3. Node e pnpm nas versões do repositório; `pnpm install --frozen-lockfile`.
  4. `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`.
  5. Verificação do bundle (comando proposto em ET-06-T10).
  6. Recusar `.only` em testes (REV-007), por regra de lint ou verificação de texto.
  7. Actions fixadas por commit (SEC-008).
- **Responsabilidade e caminhos:** `.github/workflows/verificacao.yml` (proposto).
- **Regras, falhas e bordas:** o workflow não usa segredo.
- **Saída:** workflow.
- **Validações:** ET-12-V01, ET-12-V02, ET-12-V12
- **Concluída quando:** PR com erro falha; PR limpo passa; PR de fork não tem segredo.
- **Bloqueios ou aprovações:** nenhum.

### ET-12-T02 — Auditar dependências e detectar segredos

- **Tipo:** configuração
- **Resultado pretendido:** vulnerabilidade conhecida e segredo acidental são apontados antes do merge.
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Escolher e registrar o mecanismo de auditoria de dependências (comando do gerenciador ou serviço da plataforma).
  2. Habilitar detecção de segredo da plataforma ou ferramenta escolhida.
  3. Definir o que bloqueia merge e o que só avisa.
- **Responsabilidade e caminhos:** workflow ou configuração do repositório.
- **Regras, falhas e bordas:** atualização de dependência é deliberada, não em massa (SEC-008). Scanner sem achado não prova ausência.
- **Saída:** verificação ativa.
- **Validações:** ET-12-V03
- **Concluída quando:** um segredo de teste óbvio é apontado; auditoria roda.
- **Bloqueios ou aprovações:** nenhum.

### ET-12-T03 — Automatizar o deploy do site por ambiente

- **Tipo:** configuração
- **Resultado pretendido:** o site de homologação é publicado de um commit identificado; produção exige aprovação.
- **Entradas e pré-requisitos:** DP-23; ET-11.
- **Ações:**
  1. Ambientes do GitHub para homologação e produção, com segredos separados.
  2. Token da Cloudflare com escopo de deploy do projeto do ambiente.
  3. Build com a URL base do ambiente; verificação do bundle antes do deploy.
  4. Produção: aprovação manual obrigatória; não executar até ET-14.
- **Responsabilidade e caminhos:** `.github/workflows/deploy-web.yml` (proposto).
- **Regras, falhas e bordas:** o workflow de deploy não roda para PR.
- **Saída:** workflow.
- **Validações:** ET-12-V04, ET-12-V10
- **Concluída quando:** deploy de homologação reproduzido a partir de commit; produção configurada com aprovação.
- **Bloqueios ou aprovações:** criação dos tokens.

### ET-12-T04 — Automatizar a imagem do coletor e sua implantação

- **Tipo:** configuração
- **Resultado pretendido:** imagem construída no CI com marca do commit e implantada na instância de homologação por procedimento controlado.
- **Entradas e pré-requisitos:** ET-09; ET-10.
- **Ações:**
  1. Workflow que constrói a imagem e a envia ao registro com marca do commit.
  2. Preferir identidade de curta duração entre GitHub e AWS, se disponível e confirmada na documentação vigente, em vez de chave longa.
  3. Implantação na instância: comando remoto do mecanismo administrativo ou passo manual documentado; registrar a decisão.
  4. Registrar qual marca está em execução em cada ambiente.
- **Responsabilidade e caminhos:** `.github/workflows/imagem-coletor.yml` (proposto).
- **Regras, falhas e bordas:** implantação respeita o publicador único: o container antigo para antes do novo começar.
- **Saída:** workflow e procedimento.
- **Validações:** ET-12-V05
- **Concluída quando:** uma mudança no coletor chega à homologação pela automação, com publicador único.
- **Bloqueios ou aprovações:** permissões na AWS.

### ET-12-T05 — Consolidar a observabilidade

- **Tipo:** configuração
- **Resultado pretendido:** é possível responder "o coletor está rodando?", "a última publicação deu certo?", "o site está servindo?", "o dado está atual?" e "quanto estamos gastando?" (DP-26).
- **Entradas e pré-requisitos:** ET-10-T08; ET-07-T12.
- **Ações:**
  1. Coleta: sucesso e falha por ciclo, duração, requisições à origem.
  2. Publicação: versão, horário, erros.
  3. Leitura: requisições, acerto de cache, erros 4xx/5xx por host (painéis da Cloudflare).
  4. Atualidade: idade do manifesto público medida de fora.
  5. Custo: Cloudflare e AWS.
  6. Decidir se Sentry, OpenTelemetry ou Grafana entram agora, com a justificativa (DA-14).
- **Responsabilidade e caminhos:** `docs/operacao/README.md` (proposto).
- **Regras, falhas e bordas:** sem segredo nem corpo da origem nos sinais (SEC-006); cardinalidade limitada (PERF-003).
- **Saída:** painel ou lista de onde olhar.
- **Validações:** ET-12-V11
- **Concluída quando:** as cinco perguntas têm resposta documentada e verificada.
- **Bloqueios ou aprovações:** DP-26.

### ET-12-T06 — Definir alertas com ação

- **Tipo:** documentação + configuração
- **Resultado pretendido:** cada alerta diz o que aconteceu, quem recebe (a designar) e o que fazer.
- **Entradas e pré-requisitos:** T05.
- **Ações:**
  1. Tabela: alerta | condição | limiar | destinatário | ação | link do procedimento.
  2. Mínimo: processo parado; dado atrasado; falhas seguidas de publicação; bloqueio pela origem; custo acima do limiar; erro 5xx no domínio de resultados.
  3. Configurar os que faltam desde ET-10.
- **Responsabilidade e caminhos:** `docs/operacao/alertas.md` (proposto).
- **Regras, falhas e bordas:** alerta sem ação não entra.
- **Saída:** tabela e configuração.
- **Validações:** ET-12-V06
- **Concluída quando:** cada alerta foi disparado em ensaio e a ação foi seguida.
- **Bloqueios ou aprovações:** DP-14 e DP-26 para valores e canal.

### ET-12-T07 — Escrever e ensaiar a rotação de credenciais

- **Tipo:** documentação + teste
- **Resultado pretendido:** trocar qualquer credencial sem expor valor e com interrupção de publicação conhecida.
- **Entradas e pré-requisitos:** credenciais de ET-07, ET-10, T03, T04.
- **Ações:**
  1. Inventário: credencial, escopo, onde está guardada, quem pode trocar, validade.
  2. Procedimento por credencial: criar nova, atualizar cofre, reiniciar consumidor, verificar, revogar a antiga.
  3. Ensaiar com a credencial de publicação da instância em homologação.
- **Responsabilidade e caminhos:** `docs/operacao/credenciais.md` (proposto), sem valores.
- **Regras, falhas e bordas:** a antiga só é revogada depois que a nova funciona.
- **Saída:** procedimento e evidência.
- **Validações:** ET-12-V07
- **Concluída quando:** a credencial antiga falha e a publicação continua com a nova.
- **Bloqueios ou aprovações:** nenhum além dos acessos.

### ET-12-T08 — Escrever e ensaiar o retorno à versão anterior

- **Tipo:** código + teste
- **Resultado pretendido:** voltar o manifesto a uma versão válida anterior, o site a um deploy anterior e o coletor a uma imagem anterior, cada um com seu procedimento.
- **Entradas e pré-requisitos:** ET-05, ET-08 (versões imutáveis retidas).
- **Ações:**
  1. Ferramenta de linha de comando que, dado um identificador de versão existente, valida a versão e reescreve o manifesto apontando para ela.
  2. Procedimento: pausar o coletor antes (senão ele publica de novo no ciclo seguinte), aplicar o retorno, conferir pela tela, decidir quando retomar.
  3. Retorno do site: deploy de commit anterior ou recurso de versões da ferramenta.
  4. Retorno da imagem: marca anterior.
  5. Ensaiar os três em homologação.
- **Responsabilidade e caminhos:** `apps/collector/scripts/` (proposto); `docs/operacao/retorno.md` (proposto).
- **Regras, falhas e bordas:** a ferramenta recusa versão inexistente ou inválida; registra quem e quando.
- **Saída:** ferramenta, procedimentos e evidência.
- **Validações:** ET-12-V08, ET-12-V09
- **Concluída quando:** os três retornos foram executados em homologação.
- **Bloqueios ou aprovações:** nenhum.

### ET-12-T09 — Escrever o manual de operação

- **Tipo:** documentação
- **Resultado pretendido:** quem estiver de plantão sabe ligar, desligar, verificar, voltar e escalar.
- **Entradas e pré-requisitos:** T05–T08; roteiro de incidente de [seguranca/README.md](../../seguranca/README.md).
- **Ações:**
  1. Procedimentos: iniciar e parar coletor; verificar saúde; pausar publicação; retornar versão; rotacionar credencial; restringir acesso público em emergência.
  2. Responsabilidades: papéis (operação, decisão de produto, segurança), com nomes "a designar".
  3. Roteiro de incidente adaptado aos procedimentos.
- **Responsabilidade e caminhos:** `docs/operacao/README.md` (proposto).
- **Regras, falhas e bordas:** sem segredo, sem ID de conta.
- **Saída:** manual.
- **Validações:** ET-12-V11
- **Concluída quando:** alguém que não escreveu o manual executa um procedimento só com ele.
- **Bloqueios ou aprovações:** nenhum.

### ET-12-T10 — Registrar os ensaios

- **Tipo:** documentação
- **Resultado pretendido:** evidência de que alertas, rotação e retorno funcionam.
- **Entradas e pré-requisitos:** T06–T09.
- **Ações:**
  1. Registrar data, cenário, resultado e tempo de cada ensaio.
  2. Abrir pendência para cada desvio.
- **Responsabilidade e caminhos:** `docs/planejamento/evidencias/ET-12.md` (proposto).
- **Regras, falhas e bordas:** —
- **Saída:** registro.
- **Validações:** ET-12-V06 a ET-12-V09, ET-12-V11
- **Concluída quando:** todos os ensaios previstos estão registrados.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

- A ferramenta de retorno escreve um manifesto válido pelo mesmo schema; não cria formato paralelo.
- Marcas de imagem e commits de deploy tornam-se a referência de "o que está no ar".

## 9. Segurança, integridade e performance

- SEC-008: permissão mínima, action fixada, segredo fora de fork (V02).
- R-07: segredo fora de log de CI (V10); rotação (V07).
- R-04: retorno do manifesto com coletor pausado (V08).
- R-05 e R-10: alertas com ação (V06).
- Custo: minutos de CI e armazenamento de imagem entram na leitura de custo.

## 10. Plano de validação

| ID        | Cenário                       | Preparação                                                             | Ação                                         | Sucesso                                                                     | Falha se                                                 | Nível                             | Ambiente            | Tarefa   |
| --------- | ----------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------- | ------------------- | -------- |
| ET-12-V01 | Verificação falha quando deve | PR com erro de lint; PR com teste falhando; PR limpo (casos separados) | Abrir PR                                     | Os dois primeiros falham; o terceiro passa                                  | Erro passa                                               | Verificação operacional           | GitHub              | T01      |
| ET-12-V02 | Privilégio e fork             | Workflow                                                               | Ler `permissions` e referências; PR de fork  | Somente leitura; actions por commit; fork sem segredo                       | Permissão ampla, tag móvel ou segredo acessível          | Revisão + verificação operacional | GitHub              | T01      |
| ET-12-V03 | Auditoria e segredo           | Segredo de teste óbvio em branch descartável                           | Rodar verificações                           | Segredo apontado; auditoria executada                                       | Nenhum apontamento                                       | Verificação operacional           | GitHub              | T02      |
| ET-12-V04 | Deploy por ambiente           | Commit identificado                                                    | Deploy de homologação; tentativa em produção | Homologação publicada; produção espera aprovação                            | Produção sem aprovação                                   | Verificação operacional           | GitHub + Cloudflare | T03      |
| ET-12-V05 | Imagem e implantação          | Mudança no coletor                                                     | Workflow e implantação                       | Marca do commit em execução; um publicador                                  | Dois publicadores ou marca móvel                         | Verificação operacional           | GitHub + AWS        | T04      |
| ET-12-V06 | Alertas                       | Cada condição provocada em homologação                                 | Observar                                     | Aviso no canal; ação seguida                                                | Sem aviso ou ação ambígua                                | Verificação operacional           | Homologação         | T06, T10 |
| ET-12-V07 | Rotação                       | Credencial da instância                                                | Executar o procedimento                      | Nova funciona; antiga recusada; interrupção registrada                      | Antiga ainda aceita ou publicação parada sem registro    | Verificação operacional           | Homologação         | T07      |
| ET-12-V08 | Retorno do manifesto          | Versões A e B; B no ar                                                 | Pausar coletor; retornar para A              | Domínio serve A dentro do TTL; tela mostra A; coletor pausado não republica | Coletor sobrescreve ou ferramenta aceita versão inválida | Verificação operacional           | Homologação         | T08      |
| ET-12-V09 | Retorno do site e da imagem   | Deploys e marcas anteriores                                            | Executar retornos                            | Versão anterior no ar                                                       | Sem caminho de retorno                                   | Verificação operacional           | Homologação         | T08      |
| ET-12-V10 | Log de CI limpo               | Execuções de deploy                                                    | Ler logs                                     | Nenhum valor de segredo                                                     | Valor aparece                                            | Revisão                           | GitHub              | T03      |
| ET-12-V11 | Manual utilizável             | Manual                                                                 | Outra pessoa executa um procedimento         | Executado sem ajuda                                                         | Passo faltando                                           | Verificação operacional           | Homologação         | T05, T09 |
| ET-12-V12 | Teste focado bloqueado        | PR com `.only`                                                         | Rodar verificação                            | Falha                                                                       | Passa                                                    | Verificação operacional           | GitHub              | T01      |

Ensaio em homologação não prova o volume de produção nem as metas de capacidade (ET-13).

## 11. Infraestrutura e ações externas

| Recurso                                           | Manual               | Automatizável      | Aprovação                 |
| ------------------------------------------------- | -------------------- | ------------------ | ------------------------- |
| Ambientes e segredos do GitHub                    | Configuração inicial | —                  | Sim                       |
| Tokens de deploy (Cloudflare) e de registro (AWS) | Criação              | Rotação            | Sim                       |
| Alarmes e canal                                   | Configuração         | —                  | Sim                       |
| Ensaios                                           | Execução e registro  | Parte dos disparos | Sim, por usar homologação |

## 12. Falha, reversão e recuperação

- **Workflow defeituoso:** reverter o arquivo; deploy manual documentado continua disponível.
- **Deploy ruim:** retorno de T08.
- **Credencial do CI vazada:** revogar no provedor, trocar no ambiente do GitHub, revisar execuções recentes.
- **Alerta ruidoso:** ajustar limiar com registro; não desligar sem substituto.

## 13. Critérios de conclusão

- [ ] Verificação automática com privilégio mínimo (V01, V02, V12).
- [ ] Auditoria e detecção de segredo (V03); logs de CI limpos (V10).
- [ ] Deploy do site e da imagem por ambiente (V04, V05).
- [ ] Observabilidade e alertas com ação ensaiados (V06, V11).
- [ ] Rotação e retornos ensaiados (V07–V09).
- [ ] Manual de operação utilizável (V11).

## 14. Pendências e passagem adiante

- Valores de alerta podem ser revistos em ET-13.
- ET-13 recebe: observabilidade para ler durante a carga, alertas, manual e retornos ensaiados.
- ET-14 recebe: workflows com aprovação para produção e o manual.

## 15. Brief de execução

Criar workflow de verificação sem segredo e com actions fixadas; auditoria e detecção de segredo; deploy do site por ambiente com aprovação em produção; imagem do coletor com marca do commit e implantação com publicador único. Consolidar observabilidade (coleta, publicação, leitura, atualidade, custo), alertas com ação, rotação e retorno de versão, e o manual. Ensaiar tudo em homologação. Não fazer deploy de produção nem carga. Validações V01–V12. Referências: SEC-006, SEC-008, REV-007, [seguranca/README.md](../../seguranca/README.md).
