# ET-10 — AWS e operação do collector

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo              | Conteúdo                                                                                                                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                 | ET-10                                                                                                                                                                                                                                                                                                    |
| Componente         | AWS: EC2, rede, identidade, segredo, registro de imagem, logs e alarmes; container do coletor                                                                                                                                                                                                            |
| Tipo predominante  | Infraestrutura e operação                                                                                                                                                                                                                                                                                |
| Marco              | M4 — Coletor independente do computador                                                                                                                                                                                                                                                                  |
| Resultado concreto | O coletor roda em uma instância EC2 de homologação, publica no R2 de homologação com credencial própria, sem porta pública, administrado sem SSH aberto; falha e atraso geram aviso; parada e reinício foram ensaiados; versões continuam sendo publicadas com o computador de desenvolvimento desligado |

## 2. Escopo e exclusões

**Faz:** decisões de região, capacidade, sistema, rede e orçamento; conta e identidade; rede sem entrada de aplicação; acesso administrativo; identidade da instância e segredo; registro e execução da imagem; publicador único; logs e alertas básicos; ensaio de parada e reinício; operação com o computador desligado.

**Não faz:**

- Não adiciona balanceador, banco, Redis, fila, ECS, EKS ou segundo coletor (DA-05).
- Não abre porta para servir resultados: a leitura pública continua na Cloudflare.
- Não cria produção (ET-14).
- Não consolida CI/CD (ET-12); o deploy desta etapa pode ser manual e documentado.

## 3. Contexto e evidências

Estado observado em 17/10/2026: não há conta AWS registrada, instância, grupo de segurança, registro de imagem nem configuração de infraestrutura como código no repositório.

Base documental: [infraestrutura/README.md](../../infraestrutura/README.md) (EC2, Docker, credenciais, logs, cobrança por segundo com mínimo de 60 segundos lida em 14/10/2026), [seguranca/README.md](../../seguranca/README.md) (Session Manager como proposta, grupo de segurança só com saída, grupo administrativo pequeno), [arquitetura/README.md](../../arquitetura/README.md) (instância única é ponto de falha da atualização). As páginas da AWS foram consultadas em 14/10/2026 e não foram reabertas; confirmar na data da execução.

## 4. Dependências e critérios de entrada

| Tipo            | Item                                                                  | Bloqueia                              |
| --------------- | --------------------------------------------------------------------- | ------------------------------------- |
| Implementação   | ET-08: publicador R2 e homologação funcionando a partir do computador | T06, T07, T09, T10                    |
| Implementação   | ET-09: imagem, procedimento, códigos de saída, medição de consumo     | T01 (capacidade), T06                 |
| Decisão         | DP-25 (região, tipo, sistema, rede, registro, segredo, acesso, logs)  | T02–T08                               |
| Decisão         | DP-22 (orçamento)                                                     | T02 em diante                         |
| Decisão         | DP-26 (canal de alerta, mínimo)                                       | T08                                   |
| Decisão         | DP-16 (valores do coletor em operação contínua)                       | T06 (valores de homologação contínua) |
| Decisão         | DP-27 (metas de recuperação)                                          | Critério numérico de V07              |
| Recurso externo | Conta AWS com titular definido                                        | T02 em diante                         |
| Autorização     | Criação de recurso pago                                               | T02–T12                               |

**Pode começar antes de ET-08 e ET-09 terminarem:** T01 (decisões, usando a medição de ET-09-T09 quando existir).

## 5. Entradas e saídas

**Entradas:** imagem de ET-09; configuração de ET-04 e ET-08; credencial nova de homologação para a instância (criada como em ET-07-T10).

**Saídas:**

| Artefato                                                             | Consumidor                            |
| -------------------------------------------------------------------- | ------------------------------------- |
| Instância de homologação com o coletor                               | ET-11 (dados contínuos), ET-12, ET-13 |
| Registro do desenho e inventário em `infra/aws/README.md` (proposto) | ET-12, ET-14, ET-15                   |
| Alarmes de processo parado e de atraso                               | ET-12 (consolidação)                  |
| Procedimentos de parada, reinício e retomada                         | ET-12-T09 (manual de operação)        |

## 6. Responsabilidades e fronteiras

| Peça                     | Responsabilidade                          | Não faz                                                                                |
| ------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Instância                | Executar o container                      | Não aceita conexão de aplicação                                                        |
| Grupo de segurança       | Permitir saída necessária                 | Não abre entrada; não substitui a allowlist do coletor (regra por IP não sabe de host) |
| Papel da instância       | Ler o segredo de publicação e enviar logs | Não administra a conta, não lê outros segredos                                         |
| Credencial de publicação | Escrever no bucket de homologação         | Não é a credencial administrativa da AWS                                               |
| Coletor                  | Coletar e publicar                        | Não serve leitura                                                                      |

## 7. Sequência de tarefas

### ET-10-T01 — Decidir região, capacidade, sistema, rede e orçamento

- **Tipo:** documentação
- **Resultado pretendido:** DP-25 e a parte AWS de DP-22 resolvidas com justificativa.
- **Entradas e pré-requisitos:** medição de ET-09-T09; tabela de preços vigente.
- **Ações:**
  1. Região: critério (latência até a origem, se medida; custo; disponibilidade dos serviços usados).
  2. Tipo de instância a partir do consumo medido do coletor, não da audiência do site.
  3. Sistema e forma de instalar Docker; política de atualização.
  4. Rede: IP público com grupo sem entrada, ou sub-rede privada com saída por NAT; registrar custo de cada um.
  5. Registro de imagem e mecanismo de segredo.
  6. Acesso administrativo: adotar Session Manager (proposta) ou outra alternativa escrita, nunca SSH aberto à internet.
  7. Destino dos logs.
  8. Teto de gasto e destinatário de alerta.
- **Responsabilidade e caminhos:** `DA-NN` em [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Regras, falhas e bordas:** sem teto, nenhum recurso.
- **Saída:** decisões.
- **Validações:** ET-10-V01
- **Concluída quando:** cada item tem decisão e justificativa.
- **Bloqueios ou aprovações:** responsável pelo orçamento (a designar).

### ET-10-T02 — Preparar conta, identidade administrativa e alerta de orçamento

- **Tipo:** infraestrutura
- **Recurso e acesso:** conta AWS; identidade administrativa nominal com segundo fator; alerta de orçamento.
- **Resultado pretendido:** ninguém usa a credencial raiz no dia a dia; gasto acima do limiar gera aviso.
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Proteger a conta raiz com segundo fator e não usá-la para operação.
  2. Criar acesso administrativo nominal com segundo fator para o grupo pequeno definido.
  3. Configurar alerta de orçamento com o limiar e o destinatário de T01.
- **Responsabilidade e caminhos:** inventário em `infra/aws/README.md` (proposto), sem ID de conta.
- **Regras, falhas e bordas:** nenhum identificador ou chave no repositório.
- **Saída:** conta preparada.
- **Validações:** ET-10-V02
- **Concluída quando:** segundo fator ativo e alerta configurado.
- **Bloqueios ou aprovações:** autorização.

### ET-10-T03 — Provisionar rede e grupo de segurança sem entrada de aplicação

- **Tipo:** infraestrutura
- **Recurso e acesso:** VPC e sub-rede decididas; grupo de segurança.
- **Configuração a decidir:** saída permitida (HTTPS); entrada nenhuma.
- **Resultado pretendido:** a instância alcança a origem, o R2, o registro de imagem e os serviços da AWS necessários, e não recebe conexão da internet.
- **Entradas e pré-requisitos:** T01, T02.
- **Ações:**
  1. Criar ou escolher a rede decidida.
  2. Grupo de segurança sem regra de entrada.
  3. Saída limitada ao protocolo necessário; registrar que restringir por host não é possível nessa camada e que a allowlist fica no coletor (SEC-003).
- **Responsabilidade e caminhos:** inventário (proposto).
- **Regras, falhas e bordas:** se a decisão for sub-rede privada, a saída depende do NAT; registrar o ponto de falha.
- **Saída:** rede e grupo.
- **Validações:** ET-10-V03, ET-10-V11
- **Concluída quando:** a regra de entrada está vazia e a saída funciona.
- **Bloqueios ou aprovações:** autorização.

### ET-10-T04 — Configurar o acesso administrativo

- **Tipo:** infraestrutura
- **Recurso e acesso:** mecanismo decidido em T01 (proposta: Session Manager), papel da instância com a permissão mínima para isso.
- **Resultado pretendido:** administração sem porta aberta e com registro de sessão.
- **Entradas e pré-requisitos:** T01, T03.
- **Ações:**
  1. Conceder à instância a permissão mínima do mecanismo.
  2. Restringir quem pode abrir sessão ao grupo administrativo.
  3. Habilitar o registro das sessões, se disponível no mecanismo.
  4. Não criar par de chaves SSH, ou, se a decisão escrita exigir, mantê-lo sem porta aberta à internet.
- **Responsabilidade e caminhos:** inventário (proposto).
- **Regras, falhas e bordas:** quem abre sessão tem o mesmo poder do coletor ([seguranca/README.md](../../seguranca/README.md)).
- **Saída:** acesso administrativo.
- **Validações:** ET-10-V03
- **Concluída quando:** sessão abre pelo mecanismo; porta 22 não responde de fora.
- **Bloqueios ou aprovações:** DP-25.

### ET-10-T05 — Configurar a identidade da instância e o segredo de publicação

- **Tipo:** infraestrutura
- **Recurso e acesso:** papel da instância; mecanismo de segredo decidido; nova credencial R2 de homologação, exclusiva da instância.
- **Resultado pretendido:** a instância obtém a credencial de publicação em tempo de execução, sem ela estar na imagem, em dados de inicialização em texto aberto ou no repositório.
- **Entradas e pré-requisitos:** T01, T04; ET-07-T10 (procedimento de criação de credencial).
- **Ações:**
  1. Criar a credencial R2 da instância, com escopo do bucket de homologação.
  2. Guardar no mecanismo de segredo.
  3. Permitir ao papel da instância ler só esse segredo e escrever logs.
  4. Testar que o papel não tem outras permissões relevantes.
- **Responsabilidade e caminhos:** inventário (proposto).
- **Regras, falhas e bordas:** papel administrativo e papel da instância são distintos.
- **Saída:** identidade e segredo.
- **Validações:** ET-10-V04, ET-10-V12
- **Concluída quando:** a instância lê o segredo e uma ação fora do escopo é negada.
- **Bloqueios ou aprovações:** autorização.

### ET-10-T06 — Publicar a imagem e executar o container

- **Tipo:** infraestrutura
- **Recurso e acesso:** registro de imagem decidido; instância.
- **Configuração a decidir:** valores de homologação contínua do coletor (DP-16); política de reinício.
- **Resultado pretendido:** o container roda na instância com a configuração de homologação e reinicia sozinho em falha e após reinício da máquina.
- **Entradas e pré-requisitos:** ET-09; T03–T05.
- **Ações:**
  1. Construir a imagem a partir do commit registrado e enviá-la ao registro com marca imutável (commit).
  2. Na instância, obter a imagem e executar com variáveis de configuração e o segredo de T05.
  3. Configurar a política de reinício e o início automático com a máquina.
  4. Registrar a marca da imagem em execução.
- **Responsabilidade e caminhos:** procedimento em `infra/aws/README.md` (proposto).
- **Regras, falhas e bordas:** não usar marca móvel como `latest` para decidir o que roda.
- **Saída:** coletor em execução.
- **Validações:** ET-10-V05
- **Concluída quando:** o container publica versões no R2 de homologação.
- **Bloqueios ou aprovações:** DP-16; autorização.

### ET-10-T07 — Garantir um único publicador ativo

- **Tipo:** configuração
- **Resultado pretendido:** quando a instância assume, o computador deixa de poder publicar no mesmo destino (DA-04).
- **Entradas e pré-requisitos:** T06.
- **Ações:**
  1. Parar o coletor do computador.
  2. Revogar ou desativar a credencial de publicação usada pelo computador (criada em ET-07-T10).
  3. Registrar no log de cada ciclo um identificador do publicador (instância ou máquina); se ET-02 tiver previsto campo no manifesto, preenchê-lo.
  4. Escrever o procedimento para nunca haver dois publicadores (troca de instância, ensaios).
- **Responsabilidade e caminhos:** procedimento (proposto).
- **Regras, falhas e bordas:** um segundo processo na mesma instância também é publicador; a política de reinício não pode criar duplicata.
- **Saída:** publicador único.
- **Validações:** ET-10-V08
- **Concluída quando:** tentativa de publicar a partir do computador é recusada pelo R2.
- **Bloqueios ou aprovações:** nenhum.

### ET-10-T08 — Habilitar logs e alertas básicos de falha e atraso

- **Tipo:** infraestrutura
- **Recurso e acesso:** destino de logs decidido; alarmes; canal mínimo de aviso (DP-26).
- **Configuração a decidir:** limiar de "processo parado" e de "dado atrasado" (provisórios até DP-14 e DP-27).
- **Resultado pretendido:** alguém é avisado quando o coletor para ou quando o manifesto envelhece.
- **Entradas e pré-requisitos:** T06.
- **Ações:**
  1. Enviar os logs do container ao destino decidido, com retenção definida.
  2. Alarme de processo parado: ausência de evento de ciclo por tempo acima do limiar, ou reinícios repetidos.
  3. Alarme de atraso: idade do manifesto público acima do limiar, medida de fora da instância (mecanismo decidido em DP-26).
  4. Enviar ao canal mínimo.
- **Responsabilidade e caminhos:** inventário (proposto).
- **Regras, falhas e bordas:** o alerta de atraso não pode depender só da instância que ele vigia.
- **Saída:** logs e alarmes.
- **Validações:** ET-10-V06, ET-10-V07
- **Concluída quando:** os dois alarmes disparam em ensaio (T09).
- **Bloqueios ou aprovações:** DP-26.

### ET-10-T09 — Ensaiar parada, reinício e retomada

- **Tipo:** teste
- **Resultado pretendido:** comportamento sob falha conhecido e documentado.
- **Entradas e pré-requisitos:** T06–T08.
- **Ações:**
  1. Parar o container: observar alarme de processo parado e, depois do limiar, o de atraso; observar a tela de homologação em desatualização.
  2. Religar: observar retomada e nova versão.
  3. Reiniciar a instância: observar o container voltando sozinho.
  4. Matar o processo durante publicação: observar manifesto válido.
  5. Registrar os tempos de detecção e de retomada.
- **Responsabilidade e caminhos:** evidência em `docs/planejamento/evidencias/ET-10.md` (proposto).
- **Regras, falhas e bordas:** o manifesto nunca fica vazio nem aponta para conjunto incompleto.
- **Saída:** evidência e procedimento.
- **Validações:** ET-10-V05, ET-10-V06, ET-10-V07
- **Concluída quando:** os quatro cenários foram executados e registrados.
- **Bloqueios ou aprovações:** nenhum.

### ET-10-T10 — Demonstrar a operação com o computador desligado

- **Tipo:** teste
- **Resultado pretendido:** evidência de M4.
- **Entradas e pré-requisitos:** T07, T09.
- **Ações:**
  1. Desligar o computador de desenvolvimento por uma janela definida.
  2. Ao religar, conferir pelos logs e pelo manifesto que versões foram publicadas pela instância na janela.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** a fonte de dados precisa mudar na janela (simulador em homologação ou origem real); registrar qual.
- **Saída:** evidência.
- **Validações:** ET-10-V09
- **Concluída quando:** há versões publicadas na janela pelo publicador da instância.
- **Bloqueios ou aprovações:** fonte disponível.

### ET-10-T11 — Confirmar que a instância não atende o público

- **Tipo:** teste
- **Resultado pretendido:** prova de que o visitante não chega ao coletor.
- **Entradas e pré-requisitos:** T03.
- **Ações:**
  1. De fora da AWS, tentar conexões às portas comuns no endereço público da instância (se houver).
  2. Registrar o resultado.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** teste só no nosso próprio endereço.
- **Saída:** evidência.
- **Validações:** ET-10-V11
- **Concluída quando:** nenhuma porta responde.
- **Bloqueios ou aprovações:** nenhum.

### ET-10-T12 — Definir atualização do sistema e ler o custo

- **Tipo:** documentação
- **Resultado pretendido:** a instância não fica sem atualização, e o custo real é conhecido.
- **Entradas e pré-requisitos:** T06.
- **Ações:**
  1. Escrever como e quando o sistema e a imagem base são atualizados, e quem faz (a designar).
  2. Ler o custo acumulado depois de uma janela de operação e comparar com o teto.
- **Responsabilidade e caminhos:** `infra/aws/README.md` (proposto).
- **Regras, falhas e bordas:** atualização que reinicia a máquina é ensaiada como em T09.
- **Saída:** procedimento e leitura de custo.
- **Validações:** ET-10-V10
- **Concluída quando:** procedimento escrito e custo registrado.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

- Contrato operacional: variáveis de configuração, códigos de saída e marca da imagem.
- Se ET-02 previu identificador do publicador no manifesto, T07 o preenche; se não, o identificador fica só no log e nada no contrato muda.

## 9. Segurança, integridade e performance

- R-15: acesso administrativo sem porta aberta (V03).
- R-07: credencial da instância distinta, segredo fora da imagem e dos dados de inicialização (V04, V12).
- R-04 e DA-04: publicador único (V08).
- R-10: reinício e alarmes (V05–V07).
- R-11: alerta e leitura de custo (V02, V10).
- Performance: tipo de instância pelo consumo medido; nada a escalar pela audiência.

## 10. Plano de validação

| ID        | Cenário                          | Preparação | Ação                                                     | Sucesso                                                                                  | Falha se                              | Nível                   | Ambiente         | Tarefa   |
| --------- | -------------------------------- | ---------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------- | ---------------- | -------- |
| ET-10-V01 | Decisões                         | T01        | Ler `DA-NN`                                              | Região, tipo, sistema, rede, registro, segredo, acesso, logs e teto com justificativa    | Recurso criado sem decisão            | Revisão                 | Documento        | T01      |
| ET-10-V02 | Conta protegida                  | T02        | Conferir segundo fator e alerta de orçamento             | Ativos                                                                                   | Ausentes                              | Verificação operacional | AWS              | T02      |
| ET-10-V03 | Acesso administrativo            | T03, T04   | Abrir sessão pelo mecanismo; tentar porta 22 de fora     | Sessão abre; porta não responde                                                          | Porta responde ou sessão sem registro | Homologação             | AWS              | T03, T04 |
| ET-10-V04 | Identidade mínima                | T05        | Ler o segredo pela instância; tentar ação fora do escopo | Leitura aceita; ação negada                                                              | Ação permitida                        | Homologação             | AWS              | T05      |
| ET-10-V05 | Reinício                         | T06        | Reiniciar container e instância (casos separados)        | Coletor volta e publica                                                                  | Não volta, ou manifesto inválido      | Resiliência             | AWS              | T06, T09 |
| ET-10-V06 | Alarme de processo parado        | T08        | Parar o container                                        | Aviso no canal dentro do limiar provisório                                               | Sem aviso                             | Verificação operacional | AWS              | T08, T09 |
| ET-10-V07 | Alarme de atraso e retomada      | T08        | Manter parado além do limiar; religar                    | Aviso de atraso; tempo de retomada registrado e comparado com DP-27 quando houver número | Sem aviso ou sem registro             | Verificação operacional | AWS              | T08, T09 |
| ET-10-V08 | Publicador único                 | T07        | Tentar publicar do computador                            | Recusa do R2                                                                             | Escrita aceita                        | Homologação             | Homologação      | T07      |
| ET-10-V09 | Computador desligado             | T10        | Janela definida                                          | Versões publicadas pela instância na janela                                              | Nenhuma                               | Verificação operacional | AWS + Cloudflare | T10      |
| ET-10-V10 | Custo                            | T12        | Ler custo acumulado                                      | Dentro do teto, registrado                                                               | Acima do teto sem aviso               | Verificação operacional | AWS              | T12      |
| ET-10-V11 | Sem leitura pública              | T03        | Conectar às portas do endereço da instância              | Nenhuma responde                                                                         | Alguma responde                       | Homologação             | AWS              | T03, T11 |
| ET-10-V12 | Segredo fora dos lugares errados | T05, T06   | Conferir dados de inicialização, imagem, logs            | Segredo ausente                                                                          | Presente                              | Revisão                 | AWS              | T05      |

Nada aqui mede capacidade de leitura do site (ET-13) nem consolida automação (ET-12).

## 11. Infraestrutura e ações externas

| Recurso                                | Manual                                         | Automatizável depois           | Aprovação |
| -------------------------------------- | ---------------------------------------------- | ------------------------------ | --------- |
| Conta, identidade, alerta de orçamento | Sim                                            | —                              | Sim       |
| Rede e grupo de segurança              | Sim, ou infraestrutura como código se decidido | Sim                            | Sim       |
| Instância e Docker                     | Sim                                            | Sim                            | Sim       |
| Registro de imagem                     | Sim                                            | Envio por workflow (ET-12-T04) | Sim       |
| Segredo e credencial R2 da instância   | Sim                                            | Rotação (ET-12-T07)            | Sim       |
| Logs e alarmes                         | Sim                                            | Sim                            | Sim       |

## 12. Falha, reversão e recuperação

- **Código:** voltar para a marca de imagem anterior registrada e reiniciar.
- **Configuração:** variável errada → container sai em laço visível no log; corrigir e reiniciar.
- **Infraestrutura:** instância perdida → nova instância pela mesma receita; o manifesto no R2 continua; nenhuma informação vive só na instância. Remover recurso não é procedimento padrão.
- **Credencial:** vazamento → revogar a credencial da instância, criar outra, atualizar o segredo, reiniciar.
- **Dados:** a última versão válida continua servida pela Cloudflare durante qualquer falha da instância.

## 13. Critérios de conclusão

- [ ] Decisões registradas (V01); conta protegida (V02).
- [ ] Sem entrada pública; acesso administrativo controlado (V03, V11).
- [ ] Identidade mínima e segredo fora de imagem e de dados de inicialização (V04, V12).
- [ ] Container em execução com reinício (V05); publicador único (V08).
- [ ] Alarmes ensaiados (V06, V07); computador desligado (V09).
- [ ] Custo lido (V10); inventário e procedimentos escritos.

## 14. Pendências e passagem adiante

- DP-27 pode continuar sem número; V07 registra o tempo observado para a decisão.
- ET-12 recebe: alarmes mínimos para consolidar, procedimento manual de deploy para automatizar, credenciais para rotação.
- ET-13 recebe: coletor contínuo em homologação para ensaiar falhas.

## 15. Brief de execução

Decidir região, tipo, sistema, rede, registro, segredo, acesso e teto. Com autorização: conta protegida, rede sem entrada, acesso administrativo sem SSH aberto, papel mínimo, credencial R2 própria da instância, container com reinício, revogação da credencial do computador, logs e alarmes de parada e atraso. Ensaiar parada, reinício e operação com o computador desligado. Sem balanceador, banco ou Redis. Validações V01–V12. Referências: [infraestrutura/README.md](../../infraestrutura/README.md), [seguranca/README.md](../../seguranca/README.md).
