# ET-08 — Integração com a Cloudflare

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-08 |
| Componente | `apps/collector` (publicador R2), `apps/web` (build de homologação), Cloudflare de homologação |
| Tipo predominante | Integração (código e verificação em infraestrutura real) |
| Marco | M3 — Caminho Cloudflare validado |
| Resultado concreto | O coletor, rodando no computador, publica versões no R2 de homologação; o site de homologação, com o mesmo build, passa a exibir a versão nova; cache, CORS e preservação do último válido foram observados na infraestrutura real |

## 2. Escopo e exclusões

**Faz:** adaptador de publicação no R2 com a mesma ordem do publicador local; separação de configuração local e homologação; tratamento seguro de credenciais; build e publicação do frontend de homologação; verificação real de cache, CORS e atualização; falha de upload sem substituir o último válido.

**Não faz:**

- Não roda o coletor em container nem na AWS (ET-09, ET-10).
- Não cria produção (ET-14).
- Não cria função Worker para ler ou transformar os JSON.
- Não promete que todos os visitantes veem a versão nova ao mesmo tempo: cada cópia de cache expira no seu tempo.
- Não faz carga (ET-13).

## 3. Contexto e evidências

Estado observado em 17/10/2026: não há cliente de armazenamento, SDK ou credencial no repositório. Comportamento de referência: publicador local de ET-05. Consistência do R2 registrada em [collector/padroes-de-desenvolvimento.md](../../collector/padroes-de-desenvolvimento.md) (COL-005, consulta de 14/10/2026): leitura após escrita forte no acesso direto ao bucket; com cache no domínio, o objeto antigo pode continuar na borda até o TTL ou um purge; vários objetos mais manifesto mais cache não são uma escrita única. Ressalvas de mock em [testes/seguranca.md](../../testes/seguranca.md).

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-07: bucket, domínio, regras de cache, CORS, credencial, site, ferramenta de deploy | T05 (parte real), T06–T09 |
| Implementação | ET-05: publicador local e suíte de contrato | T01, T04 |
| Implementação | ET-06: leitura parametrizada pela URL base | T06 |
| Decisão | DP-24 (cliente e autenticação do R2) | T01 |
| Decisão | DP-06 (JWS), se exigido, e DP-07 | T07 com dado oficial |
| Recurso externo | Credencial de homologação de ET-07-T10 | T03, T05 real, T07 |
| Autorização | Publicação em homologação; uso do orçamento de homologação | T07, T08 |

**Pode começar antes de ET-07 terminar:** T01 a T04 e a parte com transporte falso de T05.

## 5. Entradas e saídas

**Entradas:** conjunto normalizado (ET-04-T02); regras de cabeçalho por tipo (ET-07-T08); domínio e bucket de homologação; credencial.

**Saídas:**

| Artefato | Consumidor |
| --- | --- |
| Publicador R2 em `apps/collector/src/publication/` (proposto) | ET-09, ET-10, ET-14 |
| Configuração por ambiente documentada em `.env.example` | ET-09, ET-10 |
| Site de homologação lendo o domínio de resultados | ET-11, ET-13 |
| Evidência de cache, CORS e atualização | M3; ET-13 |

## 6. Responsabilidades e fronteiras

| Peça | Decide | Adapta transporte | Efeito |
| --- | --- | --- | --- |
| Publicador R2 | Ordem: versões → verificação → manifesto (a mesma de ET-05) | Cliente compatível com S3 | Upload |
| Configuração | Qual publicador e qual destino | `process.env` | Recusa partida incoerente |
| Web | — | `fetch` para a URL base | Leitura |

A regra de completude não é reescrita: o publicador R2 implementa a mesma assinatura e passa pela mesma suíte de contrato que o local.

## 7. Sequência de tarefas

### ET-08-T01 — Escrever o publicador R2

- **Tipo:** código
- **Resultado pretendido:** `publish` grava a versão no R2, confere os objetos e só então grava o manifesto.
- **Entradas e pré-requisitos:** DP-24; ET-05; cabeçalhos de ET-07-T08.
- **Ações:**
  1. Resolver DP-24 e aprovar a dependência do cliente (SEC-008).
  2. Enviar os arquivos da versão com `Content-Type` JSON e o `Cache-Control` do tipo "versão".
  3. Conferir cada objeto (existência, tamanho, resumo) antes do manifesto.
  4. Enviar o manifesto com o `Cache-Control` do tipo "manifesto".
  5. Na partida, ler o manifesto atual do bucket (acesso direto, consistente) para continuar a sequência.
  6. Limitar concorrência dos envios e tempo de cada envio.
- **Responsabilidade e caminhos:** `apps/collector/src/publication/` (proposto).
- **Regras, falhas e bordas:** não reescrever objeto de versão existente com outro conteúdo (COL-003). Não usar o domínio com cache para verificar; usar o acesso direto.
- **Saída:** publicador e testes com transporte falso.
- **Validações:** ET-08-V03, ET-08-V11
- **Concluída quando:** a suíte de contrato passa com transporte falso.
- **Bloqueios ou aprovações:** DP-24; dependência nova.

### ET-08-T02 — Separar a configuração local e de homologação

- **Tipo:** código
- **Resultado pretendido:** o processo escolhe o publicador pela configuração e recusa combinações perigosas.
- **Entradas e pré-requisitos:** ET-04-T01.
- **Ações:**
  1. Acrescentar variáveis do destino R2 (endpoint, bucket, prefixo) à configuração validada.
  2. Recusar R2 com nosso ambiente `local`, e destino cujo nome não corresponda ao ambiente declarado.
  3. Atualizar `.env.example` só com nomes.
- **Responsabilidade e caminhos:** `apps/collector/src/config/` (proposto).
- **Regras, falhas e bordas:** homologação nunca aponta para bucket de produção (R-07).
- **Saída:** configuração e testes.
- **Validações:** ET-08-V01
- **Concluída quando:** as combinações proibidas falham na partida.
- **Bloqueios ou aprovações:** nenhum.

### ET-08-T03 — Tratar as credenciais com segurança em execução

- **Tipo:** código
- **Resultado pretendido:** credencial lida do ambiente na partida, nunca impressa, nunca em erro.
- **Entradas e pré-requisitos:** T02; ET-04-T12.
- **Ações:**
  1. Ler identificador e segredo da credencial de variáveis de ambiente (ou arquivo indicado por variável).
  2. Incluir os nomes na lista de redação do logger.
  3. Testar que erro do cliente de armazenamento não carrega a credencial no log.
- **Responsabilidade e caminhos:** `apps/collector/src/config/`, `observability/` (propostos).
- **Regras, falhas e bordas:** nada de credencial em `.env.example`, teste ou documento (SEC-006).
- **Saída:** leitura e testes.
- **Validações:** ET-08-V02
- **Concluída quando:** o token de fixture não aparece em nenhuma saída.
- **Bloqueios ou aprovações:** nenhum.

### ET-08-T04 — Rodar a suíte de contrato do publicador no adaptador R2

- **Tipo:** teste
- **Resultado pretendido:** o publicador R2 tem o mesmo comportamento lógico que o local.
- **Entradas e pré-requisitos:** suíte de ET-05; T01.
- **Ações:**
  1. Parametrizar a suíte de contrato pelo publicador.
  2. Para o R2, usar um transporte falso em memória que simula sucesso, falha em objeto específico e latência.
- **Responsabilidade e caminhos:** testes do coletor (proposto).
- **Regras, falhas e bordas:** o transporte falso prova a ordem lógica, não o R2 nem a CDN.
- **Saída:** suíte compartilhada.
- **Validações:** ET-08-V03, ET-08-V04
- **Concluída quando:** a suíte passa para os dois publicadores.
- **Bloqueios ou aprovações:** nenhum.

### ET-08-T05 — Provar que falha de envio não substitui o último válido

- **Tipo:** teste
- **Resultado pretendido:** demonstrar, com transporte falso e depois no R2 real, que o manifesto público continua em A quando B falha.
- **Entradas e pré-requisitos:** T04; ET-07 concluída para a parte real.
- **Ações:**
  1. Transporte falso: falhar no envio do segundo arquivo de B; conferir manifesto.
  2. Homologação: script de ensaio que embrulha o transporte real e falha depois de N envios (só no script de ensaio, não no código de produção).
  3. Ler o manifesto pelo acesso direto e pelo domínio; registrar.
- **Responsabilidade e caminhos:** script de ensaio em `apps/collector/scripts/` (proposto).
- **Regras, falhas e bordas:** objetos parciais de B podem ficar no bucket; não são referenciados; não são removidos automaticamente.
- **Saída:** evidência.
- **Validações:** ET-08-V04, ET-08-V05
- **Concluída quando:** nos dois níveis o manifesto continua em A.
- **Bloqueios ou aprovações:** autorização de publicação em homologação.

### ET-08-T06 — Publicar o frontend de homologação

- **Tipo:** configuração
- **Resultado pretendido:** o site de homologação é o build atual do web apontando para o domínio de resultados de homologação.
- **Entradas e pré-requisitos:** ET-06; ET-07-T04, ET-07-T05.
- **Ações:**
  1. Gerar o build com `VITE_RESULTS_BASE_URL` (nome proposto) do domínio de resultados de homologação.
  2. Verificar o artefato (sem segredo, sem host do TSE).
  3. Publicar com a ferramenta decidida.
- **Responsabilidade e caminhos:** configuração em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** o build não carrega credencial de publicação.
- **Saída:** site de homologação atualizado.
- **Validações:** ET-08-V10, ET-08-V12
- **Concluída quando:** o site carrega e pede o manifesto ao domínio de resultados.
- **Bloqueios ou aprovações:** DP-23.

### ET-08-T07 — Publicar no R2 de homologação a partir do computador

- **Tipo:** integração
- **Resultado pretendido:** o coletor no computador publica versões reais no R2 de homologação.
- **Entradas e pré-requisitos:** T01–T03; T06; credencial de homologação; decisão da fonte (simulador local ou origem oficial autorizada).
- **Ações:**
  1. Definir a fonte do ensaio: simulador de ET-05-T11 (dado sintético, marcado) ou origem oficial com autorização e DP-06/DP-07 resolvidas.
  2. Rodar `--once` e depois o modo agendado por uma janela definida.
  3. Registrar versões publicadas, horários e erros.
- **Responsabilidade e caminhos:** evidência em `docs/planejamento/evidencias/ET-08.md` (proposto).
- **Regras, falhas e bordas:** um publicador ativo (DA-04): só esta máquina publica no bucket durante o ensaio.
- **Saída:** versões no R2 de homologação.
- **Validações:** ET-08-V09
- **Concluída quando:** pelo menos duas versões sucessivas publicadas e registradas.
- **Bloqueios ou aprovações:** autorização; DP-06 e DP-07 se a fonte for oficial.

### ET-08-T08 — Verificar cache, CORS e atualização na homologação

- **Tipo:** teste
- **Resultado pretendido:** comportamento real de cache e CORS observado com as publicações de T07.
- **Entradas e pré-requisitos:** T07.
- **Ações:**
  1. Ler o status de cache e a idade do manifesto e de um arquivo de versão, antes e depois de uma publicação.
  2. Medir quanto tempo o manifesto novo leva para aparecer pelo domínio, em mais de uma tentativa, e registrar.
  3. Pedir arquivo de versão com query arbitrária.
  4. Pedidos com `Origin` do site e com outra origem.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** o tempo observado vale para o ensaio, não é garantia para todos os visitantes.
- **Saída:** medições.
- **Validações:** ET-08-V06, ET-08-V07
- **Concluída quando:** as medições estão registradas e coerentes com as regras de ET-07-T08.
- **Bloqueios ou aprovações:** nenhum.

### ET-08-T09 — Demonstrar atualização sem rebuild

- **Tipo:** teste
- **Resultado pretendido:** a mesma build do site mostra a versão nova depois de uma publicação.
- **Entradas e pré-requisitos:** T06–T08.
- **Ações:**
  1. Abrir o site de homologação; anotar a versão exibida.
  2. Publicar versão nova pelo coletor.
  3. Observar a troca na tela sem novo deploy do site; registrar o tempo.
  4. Inspecionar a aba de rede: só os nossos domínios.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** registrar que outros navegadores podem ver a troca em outro momento.
- **Saída:** evidência de M3.
- **Validações:** ET-08-V08, ET-08-V12
- **Concluída quando:** a troca foi observada e registrada.
- **Bloqueios ou aprovações:** nenhum.

### ET-08-T10 — Registrar evidências e atualizar a documentação

- **Tipo:** documentação
- **Resultado pretendido:** M3 rastreável.
- **Entradas e pré-requisitos:** T05–T09.
- **Ações:**
  1. Consolidar evidências.
  2. Atualizar [infraestrutura/README.md](../../infraestrutura/README.md) e `infra/cloudflare/README.md` (proposto).
  3. Atualizar DP-24 e DP-17 (valores observados) em [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Responsabilidade e caminhos:** documentos citados.
- **Regras, falhas e bordas:** não colar credencial nem ID de conta.
- **Saída:** documentação.
- **Validações:** ET-08-V02
- **Concluída quando:** catálogo pode ser atualizado com evidência.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

- O publicador R2 implementa `publish` de ET-04-T02 sem mudar a assinatura.
- Os cabeçalhos por tipo de objeto vêm de ET-07-T08.
- O layout no bucket é o de ET-02-T07, com prefixo de ambiente.
- O web continua igual; só a URL base muda por build.

## 9. Segurança, integridade e performance

- R-04: V04, V05. R-06: V06. R-07: V01, V02, V09. R-09: prefixo por ambiente.
- A credencial do computador é revogada ou desativada quando o EC2 assumir (ET-10-T07).
- Performance e custo: cada publicação gera N escritas (N = arquivos da versão + manifesto); medir e registrar. Leituras que não acertam o cache aparecem na observabilidade de ET-07-T12.
- Limitação conhecida: troca de versão não é instantânea para todos os visitantes; o atraso máximo é governado pelo TTL do manifesto mais o intervalo de polling.

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-08-V01 | Configuração perigosa | R2 com ambiente local; bucket de nome de outro ambiente (casos separados) | Iniciar | Partida recusada | Processo sobe | Unitário | Local | T02 |
| ET-08-V02 | Credencial não vaza | Credencial de fixture; erro do transporte | Gerar erro e log | Valor ausente de toda saída | Valor presente | Unitário | Local | T03, T10 |
| ET-08-V03 | Contrato do publicador | Suíte de ET-05 parametrizada | Rodar com transporte falso | Todos os cenários passam | Algum diverge do local | Unitário | Local | T01, T04 |
| ET-08-V04 | Falha lógica preserva A | Transporte falso falha no meio de B | Publicar | Manifesto em A; erro devolvido | Manifesto em B | Unitário | Local | T04, T05 |
| ET-08-V05 | Falha real preserva A | A publicada em homologação; script de ensaio que falha após N envios | Publicar B | Manifesto em A pelo acesso direto e pelo domínio | Manifesto em B | Homologação | Homologação | T05 |
| ET-08-V06 | Cache real | Duas publicações | Ler status de cache e idade do manifesto e da versão | Versão com acerto de cache estável; manifesto renovado dentro do TTL curto | Mesma política nos dois, ou versão sempre indo ao bucket | Homologação | Homologação | T08 |
| ET-08-V07 | CORS real | Site e resultados em origens distintas | Pedidos com e sem a origem certa | Cabeçalho só para a origem do site | Cabeçalho para outra origem, ou ausente para o site | Homologação | Homologação | T08 |
| ET-08-V08 | Atualização sem rebuild | Site aberto | Publicar versão nova | Tela mostra a nova sem deploy; tempo registrado | Exige deploy, ou nunca troca | Homologação | Homologação | T09 |
| ET-08-V09 | Escopo da credencial em uso | Credencial do computador | Publicar; tentar gravar em outro bucket | Primeiro aceito; segundo recusado | Escrita fora do escopo | Homologação | Homologação | T07 |
| ET-08-V10 | Artefato publicado | Build de homologação | Busca por segredo e host do TSE | Nenhum achado; URL base de homologação presente | Achado | Integração | Local | T06 |
| ET-08-V11 | Cabeçalhos dos objetos | Objetos publicados | Ler `Content-Type` e `Cache-Control` pelo acesso direto | JSON e política do tipo correto | Tipo ou política trocados | Homologação | Homologação | T01 |
| ET-08-V12 | Só nossos domínios | Site aberto | Inspecionar a aba de rede | Pedidos só ao domínio do site e ao de resultados | Pedido a host do TSE ou a terceiro não previsto | Homologação | Homologação | T06, T09 |

Transporte falso não prova cache, CORS nem permissão (V05–V09 cobrem isso). Nada aqui mede capacidade (ET-13).

## 11. Infraestrutura e ações externas

- Usa os recursos de ET-07; não cria recurso novo.
- Manual: guardar a credencial localmente; rodar o coletor; observar.
- Automatizável depois: deploy do site e publicação da imagem (ET-12).
- Aprovação: publicação em homologação e uso do orçamento.

## 12. Falha, reversão e recuperação

- **Detecção:** erro do ciclo no log; manifesto não muda; tela em desatualização.
- **Dados:** A permanece. Objetos parciais de B ficam sem referência.
- **Configuração:** URL base errada no site → novo build e deploy com a URL certa; o deploy anterior pode ser restaurado pela função de versões da ferramenta, se a documentação vigente confirmar.
- **Credencial:** suspeita de vazamento → revogar (procedimento de ET-07-T10) e publicar com nova.

## 13. Critérios de conclusão

- [ ] Publicador R2 com a mesma suíte de contrato (V03, V04).
- [ ] Configuração e credencial seguras (V01, V02, V09).
- [ ] Falha real preserva A (V05).
- [ ] Cache, CORS e cabeçalhos observados (V06, V07, V11).
- [ ] Atualização sem rebuild e só nossos domínios (V08, V12).
- [ ] Artefato limpo (V10); documentação atualizada.

## 14. Pendências e passagem adiante

- DP-17 recebe medições para os valores.
- ET-09 recebe: publicador R2 e configuração por variáveis.
- ET-10 recebe: necessidade de uma credencial distinta para o EC2 e revogação da do computador.
- ET-11 recebe: site de homologação lendo resultados reais publicados.

## 15. Brief de execução

Implementar o publicador R2 com a mesma ordem e a mesma suíte de contrato do local, separar configuração e credenciais por ambiente, publicar o site de homologação apontando para o domínio de resultados, e rodar o coletor no computador publicando no R2. Observar cache, CORS, falha de envio preservando A e atualização sem rebuild. Não prometer troca simultânea para todos. Validações V01–V12. Referências: COL-005, SEC-006, SEC-007, [testes/seguranca.md](../../testes/seguranca.md).
