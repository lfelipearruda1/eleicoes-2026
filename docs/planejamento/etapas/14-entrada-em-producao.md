# ET-14 — Entrada em produção

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo              | Conteúdo                                                                                                                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                 | ET-14                                                                                                                                                                                                                                                                                        |
| Componente         | Produção: site, domínio de resultados, R2, coletor na AWS, workflows com aprovação                                                                                                                                                                                                           |
| Tipo predominante  | Operação                                                                                                                                                                                                                                                                                     |
| Marco              | M7 — Produção validada                                                                                                                                                                                                                                                                       |
| Resultado concreto | O site de produção está publicado no domínio final, lendo resultados oficiais publicados por um coletor de produção com credenciais próprias; verificações antes e depois da abertura passaram; há responsáveis acompanhando a primeira janela e critérios escritos de interrupção e retorno |

## 2. Escopo e exclusões

**Faz:** critérios e autorização; revisão de decisões e riscos; recursos e configuração de produção separados; reconfirmação de fontes e disputas; verificações funcionais e de integridade; ensaio de recuperação em produção antes da divulgação; publicação controlada; verificações posteriores; monitoramento inicial; critérios de interrupção.

**Não faz:**

- Não transforma resultado simulado em produção. O bucket de produção nasce vazio e só recebe dado oficial.
- Não roda carga em produção.
- Não introduz componente novo (API, banco, balanceador) para a abertura.
- Não remove recurso de homologação (ET-15, com decisão).

## 3. Contexto e evidências

Estado observado em 17/10/2026: não há recurso de produção. Base: [infraestrutura/README.md](../../infraestrutura/README.md) (ambientes), [seguranca/README.md](../../seguranca/README.md) (credencial por ambiente, roteiro de incidente), [testes/README.md](../../testes/README.md) (critério "Carga e produção"), [dados/README.md](../../dados/README.md) (oficial e simulado separados).

## 4. Dependências e critérios de entrada

| Tipo            | Item                                                                | Bloqueia                                                     |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| Implementação   | ET-13: relatório e ajustes                                          | T01, T02                                                     |
| Implementação   | ET-12: workflows, manual, retornos                                  | T03, T07                                                     |
| Decisão         | DP-30 (autorização)                                                 | T07                                                          |
| Decisão         | DP-21 (domínios finais), DP-22 (orçamento de produção)              | T03                                                          |
| Decisão         | DP-07 (deveres da resolução) cumpridos                              | T07                                                          |
| Decisão         | DP-31 (política de continuidade) redigida                           | T01 (a política precisa existir antes; sua execução é ET-15) |
| Decisão         | DP-01 (alcance temporal)                                            | T01                                                          |
| Decisão         | DP-16, DP-17, DP-14, DP-27 com valores, ou risco aceito por escrito | T02                                                          |
| Recurso externo | Arquivos oficiais do pleito disponíveis                             | T04, T07                                                     |
| Autorização     | Criação de recursos de produção; publicação                         | T03, T07                                                     |

**Pode começar antes de ET-13 terminar:** T01 (redação dos critérios) e a preparação de T03 em forma de lista, sem criar recurso.

## 5. Entradas e saídas

**Entradas:** relatório de ET-13; manual e workflows de ET-12; decisões de domínio, orçamento e política de continuidade.

**Saídas:**

| Artefato                                                                                  | Consumidor      |
| ----------------------------------------------------------------------------------------- | --------------- |
| Recursos de produção e inventário em `infra/cloudflare/` e `infra/aws/` (propostos)       | Operação, ET-15 |
| Checklist de autorização preenchido em `docs/planejamento/evidencias/ET-14.md` (proposto) | Registro de M7  |
| Registro de abertura e da primeira janela                                                 | ET-15           |

## 6. Responsabilidades e fronteiras

| Papel (nome a designar) | Responsabilidade                            |
| ----------------------- | ------------------------------------------- |
| Quem autoriza           | Decide a abertura com base no checklist     |
| Operação                | Executa a publicação e acompanha a janela   |
| Produto                 | Decide sobre conteúdo exibido e comunicação |
| Segurança               | Confirma credenciais e exposição            |

Uma pessoa pode acumular papéis; o registro diz quem fez o quê.

## 7. Sequência de tarefas

### ET-14-T01 — Definir os critérios de autorização e quem autoriza

- **Tipo:** documentação
- **Resultado pretendido:** checklist objetivo de go/no-go, com dono (DP-30).
- **Entradas e pré-requisitos:** relatório de ET-13; DP-01; DP-31 redigida.
- **Ações:**
  1. Listar critérios: marcos M2 a M6 com evidência; DPs resolvidas ou risco aceito; deveres da resolução cumpridos; política de continuidade escrita; recursos de produção verificados (T05); recuperação ensaiada (T06).
  2. Nomear o papel que autoriza e o que pode vetar.
  3. Registrar o aceite de DP-01.
- **Responsabilidade e caminhos:** `docs/planejamento/evidencias/ET-14.md` (proposto).
- **Regras, falhas e bordas:** critério sem evidência é "não cumprido".
- **Saída:** checklist.
- **Validações:** ET-14-V01
- **Concluída quando:** checklist aprovado pelo papel que autoriza.
- **Bloqueios ou aprovações:** DP-30.

### ET-14-T02 — Revisar decisões, bloqueios e riscos aceitos

- **Tipo:** documentação
- **Resultado pretendido:** nenhuma decisão pendente que afete produção fica implícita.
- **Entradas e pré-requisitos:** [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Ações:**
  1. Percorrer todas as `DP-NN` e marcar: resolvida, não aplicável à produção, ou risco aceito por escrito com quem aceitou.
  2. Percorrer os `R-NN` e registrar o risco remanescente aceito.
- **Responsabilidade e caminhos:** [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Regras, falhas e bordas:** —
- **Saída:** registro atualizado.
- **Validações:** ET-14-V02
- **Concluída quando:** nenhuma DP sem classificação.
- **Bloqueios ou aprovações:** quem autoriza.

### ET-14-T03 — Criar a configuração e os recursos de produção separados

- **Tipo:** infraestrutura
- **Recurso e acesso:** projeto Workers de produção; bucket R2 de produção; domínios finais; regras de cache, CORS e proteção; credencial de publicação de produção; instância (ou container) de produção; segredos de produção no GitHub e na AWS.
- **Configuração a decidir:** domínios finais (DP-21); valores revisados em ET-13.
- **Resultado pretendido:** produção replica a homologação com recursos, credenciais e dados próprios.
- **Entradas e pré-requisitos:** T01; ET-07 e ET-10 como receita.
- **Ações:**
  1. Repetir as tarefas de ET-07 (T05–T12) e ET-10 (T03–T08) para produção, com nomes de produção.
  2. Credenciais novas; nenhuma reutilizada da homologação.
  3. Coletor de produção com ambiente da origem `oficial` e destino de produção.
  4. Decidir se o coletor de homologação fica parado durante a janela de produção (publicador único por ambiente continua valendo; ele não publica em produção de todo modo).
- **Responsabilidade e caminhos:** inventários (propostos).
- **Regras, falhas e bordas:** configuração de produção recusa ambiente da origem `simulado` (ET-04-T01).
- **Saída:** recursos de produção.
- **Validações:** ET-14-V03, ET-14-V08
- **Concluída quando:** recursos criados e inventariados; escopos de credencial verificados nos dois sentidos.
- **Bloqueios ou aprovações:** autorização; DP-21; DP-22.

### ET-14-T04 — Confirmar fontes e disputas aplicáveis

- **Tipo:** investigação
- **Resultado pretendido:** a configuração de produção usa o EA11 vigente no momento da abertura (DP-04, DP-05).
- **Entradas e pré-requisitos:** T03.
- **Ações:**
  1. Obter o EA11 oficial vigente com uma requisição.
  2. Conferir códigos, ciclo e UFs com governador contra a configuração de produção.
  3. Registrar divergência e corrigir a configuração antes de T07.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** códigos de outro turno ou do simulado nunca entram.
- **Saída:** confirmação.
- **Validações:** ET-14-V05
- **Concluída quando:** a configuração corresponde ao EA11 vigente.
- **Bloqueios ou aprovações:** arquivo oficial disponível.

### ET-14-T05 — Executar as verificações funcionais e de integridade antes da abertura

- **Tipo:** teste
- **Resultado pretendido:** a produção se comporta como a homologação comprovou.
- **Entradas e pré-requisitos:** T03, T04.
- **Ações:**
  1. Site no domínio final; build com a URL base de produção; bundle sem segredo.
  2. Domínio de resultados: caminho alternativo desligado, escrita recusada, CORS só para o site, regras de cache por tipo.
  3. Primeira publicação oficial: manifesto e arquivos válidos; ambiente da origem `oficial`.
  4. Inventário do bucket: nada além de manifesto e versões oficiais.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** se a origem ainda não tiver resultado, o primeiro manifesto mostra "ainda não disponível", não zero.
- **Saída:** verificações registradas.
- **Validações:** ET-14-V04, ET-14-V06, ET-14-V08
- **Concluída quando:** todas passam.
- **Bloqueios ou aprovações:** nenhum além de T03.

### ET-14-T06 — Ensaiar a recuperação na produção antes de divulgar

- **Tipo:** teste
- **Resultado pretendido:** os procedimentos de ET-12 funcionam com os recursos de produção.
- **Entradas e pré-requisitos:** T05.
- **Ações:**
  1. Parar e religar o coletor de produção; observar alerta e retomada.
  2. Executar a ferramenta de retorno do manifesto entre duas versões oficiais válidas já publicadas (com o coletor pausado), e voltar.
  3. Confirmar que os alertas chegam aos responsáveis de produção.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** só com versões oficiais válidas; nenhuma versão de teste no bucket de produção.
- **Saída:** registro.
- **Validações:** ET-14-V07, ET-14-V10
- **Concluída quando:** os três ensaios foram feitos.
- **Bloqueios ou aprovações:** quem autoriza.

### ET-14-T07 — Publicar de forma controlada

- **Tipo:** operação
- **Resultado pretendido:** abertura do site ao público com autorização registrada.
- **Entradas e pré-requisitos:** T01–T06 com checklist aprovado.
- **Ações:**
  1. Confirmar checklist e obter a autorização.
  2. Executar o deploy de produção pelo workflow com aprovação.
  3. Divulgar o endereço conforme decisão de produto.
  4. Registrar horário, versão do site, marca da imagem e versão de dados no ar.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** qualquer critério não cumprido interrompe a publicação.
- **Saída:** produção aberta.
- **Validações:** ET-14-V12
- **Concluída quando:** registro de abertura completo.
- **Bloqueios ou aprovações:** DP-30; DP-07.

### ET-14-T08 — Verificar após a publicação

- **Tipo:** teste
- **Resultado pretendido:** confirmação de que o que está no ar é o que foi autorizado.
- **Entradas e pré-requisitos:** T07.
- **Ações:**
  1. Repetir as verificações de T05 contra o endereço público.
  2. Conferir versão nova chegando à tela sem rebuild.
  3. Conferir que os números exibidos batem com uma referência oficial do mesmo instante, quando viável.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** divergência de número aciona T10.
- **Saída:** registro.
- **Validações:** ET-14-V09
- **Concluída quando:** verificações passam.
- **Bloqueios ou aprovações:** nenhum.

### ET-14-T09 — Acompanhar a primeira janela

- **Tipo:** operação
- **Resultado pretendido:** alguém com o manual em mãos acompanha alertas, custo e atualidade durante a janela definida.
- **Entradas e pré-requisitos:** T07; manual de ET-12.
- **Ações:**
  1. Definir a janela e os responsáveis (a designar).
  2. Acompanhar: alertas, idade do manifesto, erros, acerto de cache, custo.
  3. Registrar ocorrências.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** —
- **Saída:** registro da janela.
- **Validações:** ET-14-V10
- **Concluída quando:** janela encerrada com registro.
- **Bloqueios ou aprovações:** nenhum.

### ET-14-T10 — Aplicar critérios de interrupção ou retorno

- **Tipo:** operação
- **Resultado pretendido:** se algo der errado, a ação é conhecida e rápida.
- **Entradas e pré-requisitos:** manual de ET-12.
- **Ações:**
  1. Critérios escritos: número divergente da referência oficial; manifesto apontando para conjunto inválido; segredo exposto; custo acima do teto; ataque que a proteção não contém.
  2. Ação para cada um: pausar publicação; retornar manifesto; retornar site; restringir acesso; comunicar desatualização na interface.
  3. Ensaiar a pausa de publicação em produção (sem retorno, se T06 já cobriu).
- **Responsabilidade e caminhos:** manual de operação.
- **Regras, falhas e bordas:** retorno nunca aponta para versão de outro ambiente.
- **Saída:** critérios e ensaio.
- **Validações:** ET-14-V11
- **Concluída quando:** critérios escritos e pausa ensaiada.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

Nenhuma mudança de contrato na abertura. Mudança de contrato depois da abertura exige a política de compatibilidade de ET-02-T09, porque haverá navegadores com o build anterior.

## 9. Segurança, integridade e performance

- R-09: produção só com oficial (V04).
- R-07: credenciais de produção novas e com escopo cruzado verificado (V03).
- R-01: conferência com referência oficial (V09).
- R-02: aceite de DP-01 registrado (V01).
- R-11: custo acompanhado na janela (V10).

## 10. Plano de validação

| ID        | Cenário                           | Preparação                               | Ação                                                 | Sucesso                                            | Falha se                                     | Nível                   | Ambiente               | Tarefa   |
| --------- | --------------------------------- | ---------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- | -------------------------------------------- | ----------------------- | ---------------------- | -------- |
| ET-14-V01 | Checklist                         | T01                                      | Revisar                                              | Cada critério com evidência e aprovação            | Critério sem evidência marcado como cumprido | Revisão                 | Documento              | T01      |
| ET-14-V02 | Decisões classificadas            | T02                                      | Revisar registro                                     | Nenhuma DP sem classificação                       | DP ignorada                                  | Revisão                 | Documento              | T02      |
| ET-14-V03 | Escopo cruzado                    | Credenciais de homologação e de produção | Gravar em produção com a de homologação e vice-versa | Ambas recusadas                                    | Alguma aceita                                | Verificação operacional | Produção + homologação | T03      |
| ET-14-V04 | Só oficial                        | Bucket de produção                       | Inventário e leitura do manifesto                    | Só objetos oficiais; ambiente `oficial`            | Objeto simulado ou de teste                  | Verificação operacional | Produção               | T05      |
| ET-14-V05 | Fontes vigentes                   | EA11 do momento                          | Comparar com a configuração                          | Coincidem                                          | Divergência não corrigida                    | Revisão                 | Produção               | T04      |
| ET-14-V06 | Verificações pré-abertura         | T05                                      | Executar a lista                                     | Todas passam                                       | Alguma falha                                 | Homologação de produção | Produção               | T05      |
| ET-14-V07 | Recuperação em produção           | T06                                      | Parar e religar; retorno e volta                     | Comportamento igual ao de homologação              | Diferença                                    | Verificação operacional | Produção               | T06      |
| ET-14-V08 | Bundle e configuração de produção | Build de produção                        | Buscar segredo; conferir URL base                    | URL de produção; nenhum segredo                    | URL de homologação ou segredo                | Integração              | Produção               | T03, T05 |
| ET-14-V09 | Pós-publicação                    | T07                                      | Repetir verificações e conferir números              | Passam; números coincidem ou divergência explicada | Divergência sem explicação                   | Verificação operacional | Produção               | T08      |
| ET-14-V10 | Acompanhamento                    | T06, T09                                 | Conferir alertas e registro da janela                | Alertas chegam; janela registrada                  | Alerta não chega                             | Verificação operacional | Produção               | T06, T09 |
| ET-14-V11 | Interrupção                       | T10                                      | Pausar publicação                                    | Pausa efetiva; site com último válido e aviso      | Publicação continua                          | Verificação operacional | Produção               | T10      |
| ET-14-V12 | Registro de abertura              | T07                                      | Revisar                                              | Horário, versões e autorização registrados         | Falta item                                   | Revisão                 | Documento              | T07      |

## 11. Infraestrutura e ações externas

Todos os recursos de produção são criados aqui, com autorização, seguindo as receitas de ET-07 e ET-10. Deploy por workflow com aprovação (ET-12-T03, ET-12-T04).

## 12. Falha, reversão e recuperação

- **Dados:** retorno do manifesto a versão oficial válida anterior; pausa de publicação.
- **Site:** retorno ao deploy anterior.
- **Coletor:** retorno à marca anterior.
- **Configuração:** domínio ou regra errada → corrigir uma de cada vez, com o estado anterior registrado.
- **Exposição indevida:** restringir acesso e revogar credencial.

## 13. Critérios de conclusão

- [ ] Checklist aprovado (V01, V02).
- [ ] Recursos de produção separados e verificados (V03, V04, V05, V06, V08).
- [ ] Recuperação ensaiada em produção (V07, V11).
- [ ] Publicação controlada registrada (V12).
- [ ] Verificações posteriores e janela acompanhada (V09, V10).

## 14. Pendências e passagem adiante

- ET-15 recebe: registro de abertura, inventário de produção, política de continuidade aprovada antes desta etapa.

## 15. Brief de execução

Escrever e aprovar o checklist de abertura; revisar todas as decisões e riscos; criar produção com recursos e credenciais próprios seguindo ET-07 e ET-10; reconfirmar o EA11 vigente; verificar tudo antes de divulgar; ensaiar recuperação em produção; publicar com autorização; verificar depois; acompanhar a primeira janela com critérios de interrupção. Nunca colocar dado simulado em produção. Validações V01–V12. Referências: [seguranca/README.md](../../seguranca/README.md), manual de ET-12.
