# ET-07 — Homologação na Cloudflare

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-07 |
| Componente | Cloudflare: Workers Static Assets, R2, DNS e domínios, regras de cache, regras de segurança; `infra/cloudflare/` |
| Tipo predominante | Infraestrutura, precedida de decisões |
| Marco | Preparação de M3 — Caminho Cloudflare validado |
| Resultado concreto | Existe um site de homologação servido por Workers Static Assets e um domínio de resultados ligado a um bucket R2 privado de homologação, com cache distinto para manifesto e versões, CORS restrito, acesso alternativo desligado, credencial de publicação mínima, proteção básica e alerta de custo. Tudo verificado com objetos de teste, sem coletor |

## 2. Escopo e exclusões

Esta etapa separa decisões prévias (T01–T04, sem criar recurso) do provisionamento (T05–T13, com autorização).

**Faz:** decisões de conta, plano, orçamento, domínios e ferramenta; criação dos recursos de homologação; regras de cache, CORS e proteção; credencial de publicação; observabilidade e custo iniciais; registro da configuração não sensível.

**Não faz:**

- Não integra o coletor (ET-08).
- Não cria recursos de produção (ET-14).
- Não cria função Worker no caminho da leitura dos JSON nem script para servir o site (DA-01, DA-05).
- Não usa Cloudflare Pages.
- Não inventa ID de conta, nome de domínio, token ou disponibilidade de recurso: esses valores vêm das decisões e ficam fora do repositório quando sensíveis.

## 3. Contexto e evidências

Estado observado em 17/10/2026: [infra/cloudflare/](../../../infra/cloudflare/) só tem `.gitkeep`; não há Wrangler, `wrangler.jsonc` nem plugin da Cloudflare no repositório; nenhuma conta ou recurso está registrado.

Base documental: [infraestrutura/README.md](../../infraestrutura/README.md) (três caches, CORS, custo), [seguranca/README.md](../../seguranca/README.md) (proteção antes da exposição, caminho alternativo, credencial mínima, NAT compartilhado), [arquitetura/README.md](../../arquitetura/README.md) (Workers Static Assets serve arquivo existente sem executar código). As páginas da Cloudflare citadas nesses documentos foram consultadas em 14/10/2026 e não foram reabertas aqui. Recursos e preços devem ser confirmados na documentação vigente na data da execução.

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-06: build estático e tela de ensaio | T05 |
| Contrato | ET-02: layout de manifesto e de versões (para as regras de cache) | T08 |
| Decisão | DP-21 (conta, plano, domínios) | T02, T05–T13 |
| Decisão | DP-22 (orçamento) | T05–T13 |
| Decisão | DP-23 (ferramenta de deploy) | T05, T13 |
| Decisão | DP-17 (TTLs) | Valores de T08; a separação das regras não espera |
| Decisão | DP-06, DP-07 | Tornar o site e os resultados acessíveis ao público (T11) |
| Recurso externo | Conta Cloudflare com acesso administrativo; domínio controlado pelo projeto | T05 em diante |
| Autorização | Criação de recurso pago ou exposto publicamente | T05–T12 |

**Pode começar antes de ET-06:** T01, T02, T03 e T04 são decisões e leituras, sem recurso criado.

## 5. Entradas e saídas

**Entradas:** build de `apps/web` (ET-06); layout do contrato (ET-02); decisões DP-21 a DP-23.

**Saídas:**

| Artefato | Consumidor |
| --- | --- |
| Site de homologação no domínio decidido | ET-08, ET-11, ET-13 |
| Bucket R2 de homologação privado e domínio de resultados com cache | ET-08 |
| Credencial de publicação de homologação (fora do repositório) | ET-08 (computador), depois uma credencial distinta para ET-10 |
| Configuração não sensível em `infra/cloudflare/` (proposto: arquivo de configuração do Worker e README de inventário) | ET-08, ET-12, ET-14 |
| Registro de regras de cache, CORS e proteção | ET-08, ET-13, ET-14 |

## 6. Responsabilidades e fronteiras

| Recurso | Responsabilidade | Não faz |
| --- | --- | --- |
| Workers Static Assets | Entregar os arquivos do build do web | Não executa código para servir arquivo existente; não serve os JSON de resultado |
| R2 | Guardar manifesto e versões | Não guarda segredo, arquivo de trabalho nem log |
| Domínio de resultados | Leitura pública com cache e proteção | Não aceita escrita pública |
| Regras de cache | Política por tipo de objeto | Não é a mesma para manifesto e versões |
| Credencial de publicação | Escrever no bucket do ambiente | Não lê outros buckets, não administra a conta |

## 7. Sequência de tarefas

### ET-07-T01 — Confirmar conta, acesso, plano e orçamento

- **Tipo:** documentação
- **Resultado pretendido:** DP-21 (conta e plano) e DP-22 (orçamento da Cloudflare) resolvidas antes de criar qualquer recurso.
- **Entradas e pré-requisitos:** nenhum.
- **Ações:**
  1. Identificar o titular da conta e quem terá acesso administrativo (nomes "a designar" se não informados), com segundo fator.
  2. Ler, na data, a tabela de preços e limites dos produtos usados: Workers Static Assets, R2 (armazenamento, operações, saída), regras de cache, WAF e limitação de taxa no plano.
  3. Escolher o plano com justificativa.
  4. Registrar o teto de gasto de homologação e quem recebe alerta.
- **Responsabilidade e caminhos:** `DA-NN` em [decisoes-e-riscos.md](../decisoes-e-riscos.md); sem identificadores de conta no repositório.
- **Regras, falhas e bordas:** sem teto escrito, nenhum recurso é criado (R-11).
- **Saída:** decisões registradas.
- **Validações:** ET-07-V01
- **Concluída quando:** conta, plano, teto e destinatário do alerta estão escritos com data e fonte do preço.
- **Bloqueios ou aprovações:** responsável pelo orçamento (a designar).

### ET-07-T02 — Definir os domínios de homologação

- **Tipo:** documentação
- **Resultado pretendido:** nomes dos domínios do site e dos resultados de homologação decididos e sob controle do projeto (DP-21).
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Confirmar que o domínio pertence ao projeto e está (ou pode ser) gerenciado na conta.
  2. Decidir hosts distintos para site e resultados, e se a homologação ficará acessível ao público ou restrita.
  3. Registrar que origens diferentes exigem CORS (T09).
- **Responsabilidade e caminhos:** `DA-NN`.
- **Regras, falhas e bordas:** não usar domínio de terceiro nem `r2.dev` como endereço.
- **Saída:** decisão de domínios.
- **Validações:** ET-07-V01
- **Concluída quando:** os dois hosts estão decididos.
- **Bloqueios ou aprovações:** DP-21.

### ET-07-T03 — Conferir as pré-condições de exposição

- **Tipo:** investigação
- **Resultado pretendido:** saber se o site de homologação pode ficar público ou precisa de restrição de acesso até DP-06 e DP-07 serem cumpridas.
- **Entradas e pré-requisitos:** ET-01-T09.
- **Ações:**
  1. Ler as obrigações registradas por ET-01-T09.
  2. Decidir: homologação pública com dados sintéticos marcados; ou acesso restrito até a etapa que cumpre as obrigações.
- **Responsabilidade e caminhos:** `DA-NN`.
- **Regras, falhas e bordas:** se ET-01-T09 não tiver terminado, a homologação nasce restrita.
- **Saída:** decisão de exposição.
- **Validações:** ET-07-V12
- **Concluída quando:** decisão escrita.
- **Bloqueios ou aprovações:** DP-06, DP-07.

### ET-07-T04 — Escolher a ferramenta de deploy e o local da configuração

- **Tipo:** configuração
- **Resultado pretendido:** DP-23 resolvida; a configuração do site é reprodutível a partir do repositório.
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Confirmar na documentação vigente como publicar um projeto só com assets (sem script).
  2. Escolher Wrangler (versão fixa) ou alternativa documentada; justificar a dependência nova (SEC-008).
  3. Decidir onde fica o arquivo de configuração: `infra/cloudflare/` ou `apps/web/` (ambos propostos).
  4. Decidir o comportamento de rota inexistente do site (página única ou 404).
- **Responsabilidade e caminhos:** `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** a configuração não contém token nem ID de conta; esses valores entram por variável de ambiente na execução.
- **Saída:** `DA-NN` e dependência aprovada.
- **Validações:** ET-07-V11
- **Concluída quando:** existe um comando documentado de deploy que não exige editar arquivo com segredo.
- **Bloqueios ou aprovações:** aprovação da dependência nova.

### ET-07-T05 — Publicar o build atual em Workers Static Assets de homologação

- **Tipo:** infraestrutura
- **Recurso e acesso:** projeto Workers de homologação; permissão de deploy na conta.
- **Configuração a decidir:** nome do projeto, domínio do site (T02), comportamento de rota (T04).
- **Resultado pretendido:** o site de ensaio abre no domínio de homologação, sem script de Worker.
- **Entradas e pré-requisitos:** T01–T04; build de ET-06.
- **Ações:**
  1. Gerar o build com `pnpm build`.
  2. Publicar com a ferramenta de T04.
  3. Associar o domínio do site.
  4. Conferir na configuração publicada que não há script principal.
- **Responsabilidade e caminhos:** configuração em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** se T03 decidiu acesso restrito, aplicar a restrição antes de associar o domínio.
- **Saída:** site de homologação.
- **Validações:** ET-07-V02
- **Concluída quando:** o domínio responde com o `index.html` do build.
- **Bloqueios ou aprovações:** autorização de criação de recurso.

### ET-07-T06 — Criar o bucket R2 de homologação, privado

- **Tipo:** infraestrutura
- **Recurso e acesso:** bucket R2; permissão administrativa de R2.
- **Configuração a decidir:** nome (com o ambiente no nome), localização, se a documentação vigente permitir escolha.
- **Resultado pretendido:** bucket exclusivo de homologação, sem acesso público até T07.
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Criar o bucket.
  2. Confirmar que o acesso público por `r2.dev` está desligado.
  3. Registrar o nome no inventário (T13).
- **Responsabilidade e caminhos:** inventário em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** um bucket por ambiente, ou prefixos separados com credenciais que não cruzam; a decisão fica registrada. Oficial e simulado nunca no mesmo prefixo (DA-13).
- **Saída:** bucket.
- **Validações:** ET-07-V03, ET-07-V04
- **Concluída quando:** objeto de teste gravado administrativamente não é legível por nenhum endereço público.
- **Bloqueios ou aprovações:** autorização de criação de recurso.

### ET-07-T07 — Ligar o domínio de resultados ao bucket

- **Tipo:** infraestrutura
- **Recurso e acesso:** domínio personalizado do R2; DNS da zona.
- **Configuração a decidir:** host de resultados (T02).
- **Resultado pretendido:** objetos do bucket legíveis só pelo domínio de resultados, que tem cache e proteção.
- **Entradas e pré-requisitos:** T06.
- **Ações:**
  1. Associar o domínio ao bucket.
  2. Confirmar de novo que `r2.dev` continua desligado.
  3. Confirmar que listagem do bucket não é pública.
- **Responsabilidade e caminhos:** inventário (T13).
- **Regras, falhas e bordas:** conectar o domínio torna a leitura pública (documentado em [seguranca/README.md](../../seguranca/README.md)); por isso o bucket só recebe manifesto e versões.
- **Saída:** domínio de resultados.
- **Validações:** ET-07-V03, ET-07-V04
- **Concluída quando:** objeto de teste é lido pelo domínio e não por caminho alternativo.
- **Bloqueios ou aprovações:** T03 (se restrito, restringir antes).

### ET-07-T08 — Configurar cache distinto para manifesto e versões

- **Tipo:** configuração
- **Recurso e acesso:** regras de cache da zona.
- **Configuração a decidir:** TTL do manifesto e das versões (DP-17); padrões de caminho conforme ET-02-T07.
- **Resultado pretendido:** JSON de versão em cache longo; manifesto em cache curto; query string arbitrária não cria variante.
- **Entradas e pré-requisitos:** T07; layout de ET-02.
- **Ações:**
  1. Criar regra para o caminho das versões (cache longo; objeto imutável).
  2. Criar regra para o manifesto (cache curto, valor inicial registrado como provisório).
  3. Definir a chave de cache sem variação por query string arbitrária.
  4. Definir os cabeçalhos de cache que o publicador gravará em cada tipo (entrada para ET-08-T01).
  5. Testar com manifesto e arquivo de versão sintéticos enviados administrativamente.
- **Responsabilidade e caminhos:** registro em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** JSON não entra em cache por padrão (documentado em [infraestrutura/README.md](../../infraestrutura/README.md)); sem regra, o teste deve mostrar ausência de cache, e isso é falha.
- **Saída:** regras ativas e valores provisórios registrados.
- **Validações:** ET-07-V05, ET-07-V06
- **Concluída quando:** o status de cache observado corresponde à regra em cada tipo.
- **Bloqueios ou aprovações:** DP-17 só quanto aos valores.

### ET-07-T09 — Configurar CORS do bucket

- **Tipo:** configuração
- **Recurso e acesso:** política CORS do bucket.
- **Configuração a decidir:** origem do site de homologação; métodos GET e HEAD.
- **Resultado pretendido:** o navegador do site lê os resultados; outras origens não recebem cabeçalho de permissão.
- **Entradas e pré-requisitos:** T05, T07.
- **Ações:**
  1. Liberar só a origem do site de homologação, GET e HEAD.
  2. Testar com cabeçalho `Origin` correto, incorreto e ausente.
  3. Lembrar que cópias já em cache não ganham cabeçalho novo até expirar.
- **Responsabilidade e caminhos:** registro em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** CORS não é autenticação ([seguranca/README.md](../../seguranca/README.md)).
- **Saída:** política ativa.
- **Validações:** ET-07-V08
- **Concluída quando:** os três casos se comportam como esperado.
- **Bloqueios ou aprovações:** nenhum além de T05 e T07.

### ET-07-T10 — Criar a credencial de publicação mínima

- **Tipo:** configuração
- **Recurso e acesso:** token de API do R2 com escopo de bucket.
- **Configuração a decidir:** permissões mínimas para gravar e ler objetos do bucket de homologação; validade; quem guarda.
- **Resultado pretendido:** uma credencial que só escreve no bucket de homologação (DP-24).
- **Entradas e pré-requisitos:** T06.
- **Ações:**
  1. Criar a credencial com escopo do bucket de homologação.
  2. Guardar fora do repositório, em cofre de senhas ou variável local; registrar onde está, não o valor.
  3. Testar escrita no bucket e recusa em outro bucket.
  4. Planejar uma credencial separada para o EC2 (ET-10) e a revogação desta quando o computador deixar de publicar.
  5. Escrever o procedimento de revogação e troca (consolidado em ET-12-T07).
- **Responsabilidade e caminhos:** inventário sem valor em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** credencial nunca em `VITE_*`, `.env.example`, log ou documento (SEC-006).
- **Saída:** credencial e procedimento.
- **Validações:** ET-07-V07
- **Concluída quando:** escrita aceita no bucket certo e recusada fora dele.
- **Bloqueios ou aprovações:** autorização de criação de credencial.

### ET-07-T11 — Aplicar proteção básica antes da exposição

- **Tipo:** configuração
- **Recurso e acesso:** regras de segurança da zona, conforme o plano (T01); cabeçalhos do site.
- **Configuração a decidir:** regras gerenciadas disponíveis no plano; limitação de taxa; bloqueio de métodos de escrita no domínio de resultados; cabeçalhos de segurança do site (inclusive política de conteúdo).
- **Resultado pretendido:** o mínimo de proteção está ativo antes de o endereço ser divulgado a qualquer pessoa fora do projeto.
- **Entradas e pré-requisitos:** T05, T07; T03.
- **Ações:**
  1. No domínio de resultados, aceitar só GET e HEAD.
  2. Ativar a proteção gerenciada disponível no plano.
  3. Definir limitação de taxa inicial com o cuidado de IP compartilhado (R-16); registrar como provisória até ET-13.
  4. Definir cabeçalhos de segurança do site pelo mecanismo suportado por Workers Static Assets, confirmado na documentação vigente.
  5. Testar cada regra.
- **Responsabilidade e caminhos:** registro em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** não copiar o teto de 100 requisições por segundo do TSE para a nossa borda ([seguranca/README.md](../../seguranca/README.md)). A limitação não pode impedir o polling normal de um visitante.
- **Saída:** proteção ativa e testada.
- **Validações:** ET-07-V10, ET-07-V12
- **Concluída quando:** métodos de escrita recusados, regras ativas, cabeçalhos presentes no site.
- **Bloqueios ou aprovações:** DP-06, DP-07 para exposição pública.

### ET-07-T12 — Preparar observabilidade e controle de custo iniciais

- **Tipo:** configuração
- **Recurso e acesso:** painéis de uso da Cloudflare; notificações de cobrança disponíveis no plano.
- **Configuração a decidir:** destinatário e limiares de aviso de custo (DP-22).
- **Resultado pretendido:** alguém é avisado antes de o gasto passar do teto e consegue ver requisições, acerto de cache e erros.
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Configurar a notificação de cobrança ou uso disponível.
  2. Registrar onde ver: requisições por host, acerto de cache, 4xx e 5xx, operações R2.
  3. Registrar a linha de base de uso logo após a criação.
- **Responsabilidade e caminhos:** registro em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** se o plano não oferecer alerta automático, registrar revisão manual periódica e quem a faz (a designar).
- **Saída:** alerta ou procedimento de revisão.
- **Validações:** ET-07-V09
- **Concluída quando:** o alerta existe ou o procedimento manual está escrito.
- **Bloqueios ou aprovações:** DP-22.

### ET-07-T13 — Registrar a configuração e o inventário

- **Tipo:** documentação
- **Resultado pretendido:** qualquer pessoa autorizada recria ou audita a homologação a partir do repositório e do cofre.
- **Entradas e pré-requisitos:** T05–T12.
- **Ações:**
  1. Em `infra/cloudflare/README.md` (proposto): recursos, nomes, regras, valores provisórios, onde estão as credenciais (sem valor).
  2. Atualizar [infraestrutura/README.md](../../infraestrutura/README.md) com o estado "provisionado em homologação".
  3. Buscar no diff por padrões de token e identificadores de conta.
- **Responsabilidade e caminhos:** documentos citados.
- **Regras, falhas e bordas:** nada sensível no Git.
- **Saída:** inventário.
- **Validações:** ET-07-V11
- **Concluída quando:** inventário completo e diff limpo.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

- As regras de cache dependem dos padrões de caminho de ET-02-T07. Mudar o layout exige mudar as regras na mesma entrega.
- Os cabeçalhos de cache por tipo de objeto (T08) viram contrato do publicador R2 (ET-08-T01).
- A origem do site na política CORS é contrato com o build do web (`VITE_RESULTS_BASE_URL` aponta para o domínio de resultados).

## 9. Segurança, integridade e performance

- R-08: caminho alternativo desligado (V03).
- R-07: credencial mínima e fora do Git (V07, V11).
- R-06: cache distinto e sem variação por query (V05, V06).
- R-16: limitação de taxa provisória, ensaiada em ET-13.
- R-11: orçamento antes do recurso; alerta (V09).
- Custo: entram na conta o armazenamento das versões, operações de escrita por publicação, leituras que não acertam o cache e o tráfego. O valor de cada um é lido na tabela vigente em T01.

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-07-V01 | Decisões prévias | T01, T02 | Ler as `DA-NN` | Conta, plano, teto, destinatário e domínios escritos com data | Recurso criado sem teto ou domínio | Revisão | Documento | T01, T02 |
| ET-07-V02 | Site no ar | T05 | Pedir o domínio do site | `index.html` do build; configuração sem script | Erro, ou script principal presente | Homologação | Homologação | T05 |
| ET-07-V03 | Caminho alternativo | T06, T07 | Pedir o objeto de teste por `r2.dev` e por endereço direto do bucket | Recusa | Objeto entregue | Homologação | Homologação | T06, T07 |
| ET-07-V04 | Bucket privado | Objeto de teste | Listar o bucket sem credencial | Recusa | Listagem pública | Homologação | Homologação | T06, T07 |
| ET-07-V05 | Cache por tipo | Manifesto e arquivo de versão sintéticos | Pedir cada um duas vezes; ler o status de cache e a idade | Versão em cache após o primeiro pedido; manifesto respeitando o TTL curto | Os dois com a mesma política, ou JSON sem cache | Homologação | Homologação | T08 |
| ET-07-V06 | Query string | Arquivo de versão em cache | Pedir com query arbitrária | Mesmo objeto, acerto de cache | Nova variante e ida ao bucket | Homologação | Homologação | T08 |
| ET-07-V07 | Escopo da credencial | Credencial de T10; um segundo bucket de teste | Gravar no bucket certo e no outro | Primeiro aceito; segundo recusado | Escrita fora do escopo | Homologação | Homologação | T10 |
| ET-07-V08 | CORS | Política de T09 | Pedidos com `Origin` do site, com outra origem, sem `Origin` | Cabeçalho só no primeiro | Cabeçalho para outra origem | Homologação | Homologação | T09 |
| ET-07-V09 | Custo | T12 | Conferir a notificação ou o procedimento | Destinatário e limiar configurados | Nenhum aviso possível | Verificação operacional | Homologação | T12 |
| ET-07-V10 | Proteção básica | T11 | PUT, POST e DELETE no domínio de resultados; ler cabeçalhos do site; conferir regras ativas | Escrita recusada; cabeçalhos presentes; regras ativas | Escrita aceita ou cabeçalho ausente | Homologação | Homologação | T11 |
| ET-07-V11 | Repositório limpo | T04, T13 | Busca por padrões de token e ID de conta no diff | Nenhum achado | Achado | Revisão | Local | T04, T13 |
| ET-07-V12 | Exposição autorizada | T03 | Conferir a decisão antes de divulgar o endereço | Pré-condições cumpridas ou acesso restrito ativo | Endereço público sem pré-condição | Revisão | Homologação | T03, T11 |

Estas validações provam a configuração com objetos de teste. Não provam a publicação do coletor nem a troca de versões sob tráfego (ET-08, ET-13).

## 11. Infraestrutura e ações externas

| Recurso | Acesso necessário | Manual | Automatizável depois | Aprovação |
| --- | --- | --- | --- | --- |
| Projeto Workers de homologação | Deploy | Criação inicial | Deploy por workflow (ET-12-T03) | Sim |
| Bucket R2 de homologação | Administração do R2 | Criação | — | Sim |
| Domínio de resultados e DNS | Administração da zona | Associação | — | Sim |
| Regras de cache e de segurança | Administração da zona | Criação | Registro como configuração versionada, se a ferramenta permitir | Sim |
| Credencial de publicação | Criação de token | Criação e guarda | Rotação (ET-12-T07) | Sim |
| Alerta de custo | Cobrança | Configuração | — | Sim |

## 12. Falha, reversão e recuperação

- **Configuração:** cada regra é alterada uma de cada vez, com o estado anterior registrado em T13 para voltar.
- **Infraestrutura:** remover recurso não é procedimento padrão. Recurso errado é desassociado (domínio) ou desativado, e a remoção é decidida com registro.
- **Credencial:** vazamento → revogar e criar outra (procedimento de T10).
- **Exposição indevida:** restringir acesso ao site e ao domínio de resultados imediatamente; registrar.

## 13. Critérios de conclusão

- [ ] Decisões de conta, plano, orçamento, domínios e ferramenta registradas (V01).
- [ ] Site de homologação no ar sem script (V02).
- [ ] Bucket privado, caminho alternativo desligado, domínio de resultados ativo (V03, V04).
- [ ] Cache distinto por tipo e sem variação por query (V05, V06).
- [ ] Credencial mínima (V07); CORS (V08); proteção básica (V10); exposição autorizada (V12).
- [ ] Custo monitorado (V09); inventário sem segredo (V11).

## 14. Pendências e passagem adiante

- DP-17 segue aberta quanto aos valores; os provisórios estão registrados.
- R-16 (IP compartilhado) só se valida em ET-13.
- ET-08 recebe: domínio de resultados, cabeçalhos de cache por tipo, credencial de homologação, site de homologação e comando de deploy.

## 15. Brief de execução

Primeiro decidir conta, plano, orçamento, domínios e ferramenta, sem criar nada. Depois, com autorização: site de homologação em Workers Static Assets sem script, bucket R2 privado com domínio próprio e `r2.dev` desligado, cache longo para versões e curto para o manifesto, CORS só para o site, credencial só do bucket de homologação, proteção básica e alerta de custo. Testar tudo com objetos sintéticos. Sem Pages, sem Worker na leitura, sem segredo no Git. Validações V01–V12. Referências: [infraestrutura/README.md](../../infraestrutura/README.md), [seguranca/README.md](../../seguranca/README.md).
