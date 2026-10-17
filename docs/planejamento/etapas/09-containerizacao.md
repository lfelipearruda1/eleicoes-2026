# ET-09 — Containerização

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-09 |
| Componente | Imagem Docker do coletor; `apps/collector` |
| Tipo predominante | Configuração com verificação local |
| Marco | Preparação de M4 — Coletor independente do computador |
| Resultado concreto | Uma imagem construída a partir do lockfile roda o JavaScript compilado do coletor, sem segredo embutido, como usuário sem privilégio, sem porta exposta; encerra limpo, reinicia e retoma sem publicar vazio. Verificado na máquina contra destinos controlados |

## 2. Escopo e exclusões

**Faz:** Dockerfile e `.dockerignore`; runtime mínimo; configuração e segredo por fora; usuário sem privilégio; tratamento de sinais; logs; reinício e recuperação locais; verificação contra simulador e disco; medição de consumo.

**Não faz:**

- Não cria servidor HTTP para provar que o processo está vivo. Saúde se observa por log, código de saída e, se necessário, por arquivo de batimento verificado dentro do container.
- Não provisiona AWS nem registro de imagem (ET-10).
- Não cria workflow de build de imagem (ET-12-T04).
- Não usa orquestrador (Compose em produção, Kubernetes, ECS) como decisão de arquitetura. Compose local para ensaio é opcional e não vira dependência.

## 3. Contexto e evidências

Estado observado em 17/10/2026: não há Dockerfile, `.dockerignore` nem registro de imagem. [apps/collector/package.json](../../../apps/collector/package.json) tem `build` (`tsc`) e `start` (`node dist/index.js`); a composição em `main.ts` vem de ET-04-T14. A resolução dos pacotes do workspace (DP-18) afeta o que precisa ser copiado para a imagem. `pnpm-workspace.yaml` permite build de `esbuild` (`allowBuilds`), usado pelo `tsx` em desenvolvimento, não no runtime.

Referências: [infraestrutura/README.md](../../infraestrutura/README.md) (Docker empacota o mesmo coletor para ensaio e instância), [collector/README.md](../../collector/README.md) (reinício não publica vazio), SEC-006 e SEC-008.

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-05: processo completo com publicador local e simulador | T01–T09 |
| Implementação | ET-08: publicador R2 | Só V10 |
| Decisão | DP-18 (resolução de pacotes) | T01, T02 |
| Recurso externo | Docker na máquina de quem executa | Todas |

**Por que depende de ET-05 e não de ET-08:** o empacotamento, o encerramento e a recuperação se provam com o publicador local. A imagem é reconstruída a partir do código; quando ET-08 entregar o publicador R2, a mesma receita a inclui e V10 é executada. Isso permite trabalhar em paralelo com ET-06 a ET-08.

## 5. Entradas e saídas

**Entradas:** código do coletor e dos pacotes; lockfile; variáveis de configuração de ET-04 e ET-08.

**Saídas:**

| Artefato | Consumidor |
| --- | --- |
| `apps/collector/Dockerfile` (proposto) e `.dockerignore` (proposto, na raiz do contexto de build) | ET-10, ET-12-T04 |
| Procedimento de build e execução local em `apps/collector/README.md` (proposto) ou na documentação do coletor | ET-10, operação |
| Medição de CPU, memória e tamanho | DP-25 (tipo de instância) |

## 6. Responsabilidades e fronteiras

A imagem empacota; não decide regra. O processo dentro dela é o mesmo de `pnpm --filter @eleicoes/collector start`. Configuração e segredo entram por variáveis em tempo de execução. O volume de disco só existe se o publicador local for usado (ensaio); com o publicador R2, o sistema de arquivos pode ser somente leitura.

## 7. Sequência de tarefas

### ET-09-T01 — Escrever um Dockerfile multiestágio reproduzível

- **Tipo:** configuração
- **Resultado pretendido:** a imagem é construída do mesmo lockfile, com a mesma versão de Node e pnpm do repositório.
- **Entradas e pré-requisitos:** DP-18; ET-05.
- **Ações:**
  1. Estágio de build: imagem base Node 24 fixada por digest; pnpm na versão de `packageManager`; `pnpm install --frozen-lockfile`; build dos pacotes e do coletor.
  2. Estágio de runtime: imagem base mínima de Node 24 fixada por digest; copiar só o necessário (T02).
  3. Comando final: `node` no JavaScript compilado de `main`.
- **Responsabilidade e caminhos:** `apps/collector/Dockerfile` (proposto).
- **Regras, falhas e bordas:** build falha se o lockfile não corresponder. Sem `latest` como tag de base.
- **Saída:** Dockerfile.
- **Validações:** ET-09-V01
- **Concluída quando:** duas construções do mesmo commit instalam as mesmas versões.
- **Bloqueios ou aprovações:** escolha da imagem base registrada.

### ET-09-T02 — Reduzir o runtime ao necessário

- **Tipo:** configuração
- **Resultado pretendido:** a imagem final não carrega código-fonte, dependências de desenvolvimento, documentação, `.env` nem `.git`.
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. `.dockerignore` excluindo `node_modules`, `dist` locais, `.env*` (exceto exemplo), `.git`, `docs`, `tests`, fixtures.
  2. Produzir as dependências de produção do coletor e dos pacotes que ele usa (por exemplo, com a função de implantação do pnpm, a confirmar na versão em uso).
  3. Listar o conteúdo final da imagem.
- **Responsabilidade e caminhos:** `.dockerignore` (proposto).
- **Regras, falhas e bordas:** fixtures e simulador não vão para a imagem de produção.
- **Saída:** imagem enxuta.
- **Validações:** ET-09-V02
- **Concluída quando:** a listagem só mostra JavaScript compilado, `package.json` e dependências de produção.
- **Bloqueios ou aprovações:** nenhum.

### ET-09-T03 — Executar sem privilégio

- **Tipo:** configuração
- **Resultado pretendido:** o processo não roda como root e não tem escrita fora do necessário.
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Usar usuário sem privilégio da imagem base ou criar um.
  2. Documentar execução com sistema de arquivos somente leitura e, só no ensaio local, um volume gravável para a publicação.
  3. Não declarar `EXPOSE`.
- **Responsabilidade e caminhos:** Dockerfile (proposto).
- **Regras, falhas e bordas:** volume montado precisa de dono compatível com o usuário.
- **Saída:** configuração de execução.
- **Validações:** ET-09-V03, ET-09-V12
- **Concluída quando:** `id` no container mostra usuário sem privilégio; nenhuma porta exposta.
- **Bloqueios ou aprovações:** nenhum.

### ET-09-T04 — Receber configuração e segredo de fora da imagem

- **Tipo:** configuração
- **Resultado pretendido:** a mesma imagem serve a qualquer ambiente; segredo não fica em camada nenhuma.
- **Entradas e pré-requisitos:** ET-04-T01; ET-08-T03.
- **Ações:**
  1. Sem `ENV` nem `ARG` com valor sensível no Dockerfile.
  2. Execução com arquivo de variáveis local (ignorado pelo Git) ou variáveis passadas pelo executor.
  3. Inspecionar histórico e metadados da imagem em busca de valores.
- **Responsabilidade e caminhos:** documentação de execução.
- **Regras, falhas e bordas:** configuração ausente faz o processo sair (ET-04-V01).
- **Saída:** procedimento e verificação.
- **Validações:** ET-09-V04, ET-09-V05
- **Concluída quando:** nenhuma camada ou metadado contém o token de fixture usado no ensaio.
- **Bloqueios ou aprovações:** nenhum.

### ET-09-T05 — Encerrar corretamente dentro do container

- **Tipo:** configuração
- **Resultado pretendido:** `docker stop` entrega o sinal ao Node, que encerra pelo caminho de ET-04-T11 dentro do prazo.
- **Entradas e pré-requisitos:** ET-04-T11.
- **Ações:**
  1. Garantir que o Node recebe o sinal (forma exec do comando; init mínimo, se necessário).
  2. Ajustar o prazo de parada do container ao limite de encerramento do processo.
  3. Testar parada durante a busca e durante a publicação (casos separados).
- **Responsabilidade e caminhos:** Dockerfile e procedimento.
- **Regras, falhas e bordas:** se o prazo esgotar, o container é morto; o publicador garante que o manifesto não muda para conjunto incompleto (ET-05).
- **Saída:** encerramento verificado.
- **Validações:** ET-09-V06
- **Concluída quando:** parada termina dentro do prazo, com log de encerramento e sem publicação parcial.
- **Bloqueios ou aprovações:** nenhum.

### ET-09-T06 — Expor logs e falhas pelo container

- **Tipo:** configuração
- **Resultado pretendido:** `docker logs` mostra os eventos do ciclo; o código de saída diferencia erro de configuração, falha fatal e parada.
- **Entradas e pré-requisitos:** ET-04-T12.
- **Ações:**
  1. Confirmar que o logger escreve na saída padrão.
  2. Documentar os códigos de saída.
  3. Se houver verificação de saúde, usar um arquivo de batimento escrito a cada ciclo e um comando local que confere sua idade, sem servidor HTTP.
- **Responsabilidade e caminhos:** documentação do coletor.
- **Regras, falhas e bordas:** a verificação de saúde não pode marcar como saudável um processo que não completa ciclo.
- **Saída:** logs e, se adotado, verificação de saúde.
- **Validações:** ET-09-V08
- **Concluída quando:** falha simulada aparece em log e no código de saída.
- **Bloqueios ou aprovações:** nenhum.

### ET-09-T07 — Reiniciar e recuperar localmente

- **Tipo:** teste
- **Resultado pretendido:** depois de queda do processo ou do container, ele volta e retoma da última versão válida.
- **Entradas e pré-requisitos:** T05, T06; ET-05-T07.
- **Ações:**
  1. Rodar com política de reinício (proposta: reiniciar em falha e após o daemon voltar).
  2. Matar o processo no meio de uma publicação.
  3. Observar o reinício, a leitura do manifesto e a publicação seguinte.
- **Responsabilidade e caminhos:** evidência em `docs/planejamento/evidencias/ET-09.md` (proposto).
- **Regras, falhas e bordas:** laço de reinício por configuração inválida deve ser visível no log e não pode publicar nada.
- **Saída:** evidência.
- **Validações:** ET-09-V07
- **Concluída quando:** o manifesto continua válido e a próxima versão é publicada.
- **Bloqueios ou aprovações:** nenhum.

### ET-09-T08 — Verificar o container com destinos controlados

- **Tipo:** teste
- **Resultado pretendido:** o container faz o mesmo que o processo local.
- **Entradas e pré-requisitos:** T01–T07; simulador de ET-05-T11.
- **Ações:**
  1. Container apontando para o simulador local e publicando em volume local; o web local lê pelo servidor de desenvolvimento.
  2. Quando ET-08 estiver concluída: container publicando no R2 de homologação com a credencial do ensaio, e o site de homologação mostrando a versão nova.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** um publicador ativo: o processo local não pode publicar no mesmo destino ao mesmo tempo.
- **Saída:** evidência.
- **Validações:** ET-09-V09, ET-09-V10
- **Concluída quando:** V09 aprovada; V10 aprovada ou registrada como pendente de ET-08.
- **Bloqueios ou aprovações:** ET-08 para V10.

### ET-09-T09 — Medir consumo e tamanho

- **Tipo:** investigação
- **Resultado pretendido:** dados para escolher o tipo de instância (DP-25).
- **Entradas e pré-requisitos:** T08.
- **Ações:**
  1. Registrar tamanho da imagem.
  2. Registrar CPU e memória durante ciclos com os tamanhos de arquivo de ET-01, por uma janela definida.
  3. Registrar se a memória se estabiliza entre ciclos.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** medida local não é a mesma da instância; serve de ordem de grandeza.
- **Saída:** medição.
- **Validações:** ET-09-V11
- **Concluída quando:** valores registrados com o cenário.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

- A imagem expõe o contrato operacional de variáveis de ET-04 e ET-08; renomear variável exige atualizar a documentação de execução e a configuração da instância.
- Códigos de saída documentados viram contrato com a política de reinício e com o alerta (ET-10, ET-12).

## 9. Segurança, integridade e performance

- R-07: segredo fora da imagem (V04).
- SEC-008: imagem base fixada por digest e dependências do lockfile.
- Superfície: sem porta, sem shell desnecessário se a base mínima permitir, usuário sem privilégio.
- Performance: medição em T09; nenhuma otimização sem medida.

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-09-V01 | Build reproduzível | Mesmo commit | Construir duas vezes; construir com lockfile alterado | Mesmas versões; build com lockfile divergente falha | Versões diferentes ou build aceita divergência | Integração | Local | T01 |
| ET-09-V02 | Runtime mínimo | Imagem final | Listar arquivos | Só compilado, `package.json` e dependências de produção | Fonte, fixture, `.env` ou `.git` presentes | Integração | Local | T02 |
| ET-09-V03 | Sem privilégio | Container em execução | Consultar usuário | Usuário sem privilégio | Root | Integração | Local | T03 |
| ET-09-V04 | Sem segredo na imagem | Ensaio com token de fixture passado em execução | Inspecionar histórico, metadados e sistema de arquivos | Token ausente | Token presente | Integração | Local | T04 |
| ET-09-V05 | Configuração ausente | Sem variáveis | Iniciar | Saída com código de configuração e mensagem sem segredo | Processo segue | Integração | Local | T04 |
| ET-09-V06 | Parada limpa | Container em busca; em publicação (casos separados) | `docker stop` | Encerra no prazo; manifesto válido | Morto por prazo com manifesto alterado para incompleto | Integração | Local | T05 |
| ET-09-V07 | Reinício e retomada | Política de reinício; volume com versão A | Matar o processo durante publicação de B | Volta; manifesto em A ou B completa; próxima versão publicada; nenhum vazio | Manifesto vazio ou inválido | Resiliência | Local | T07 |
| ET-09-V08 | Logs e saída | Falha simulada | `docker logs`; código de saída | Evento visível; código documentado | Falha silenciosa | Integração | Local | T06 |
| ET-09-V09 | Paridade local | Simulador e volume | Rodar o container | Versões iguais às do processo local | Divergência | Integração | Local | T08 |
| ET-09-V10 | Container no R2 | ET-08 concluída | Rodar com destino de homologação | Versão nova visível no site de homologação | Não publica | Homologação | Homologação | T08 |
| ET-09-V11 | Consumo | Janela definida | Medir | Tamanho, CPU e memória registrados | Sem registro | Verificação operacional | Local | T09 |
| ET-09-V12 | Sem porta | Imagem | Inspecionar portas expostas e em escuta | Nenhuma | Alguma | Integração | Local | T03 |

Verificação local não prova rede, identidade nem reinício da instância na AWS (ET-10).

## 11. Infraestrutura e ações externas

Só Docker local. Nenhum registro de imagem ou recurso de nuvem. V10 usa a homologação já existente.

## 12. Falha, reversão e recuperação

- **Imagem defeituosa:** reconstruir a partir do commit anterior; a imagem é descartável.
- **Dados:** o publicador preserva o manifesto; reinício não publica vazio.
- **Configuração:** variável errada → container sai; corrigir e reiniciar.

## 13. Critérios de conclusão

- [ ] Dockerfile reproduzível e runtime mínimo (V01, V02).
- [ ] Sem privilégio, sem porta, sem segredo (V03, V04, V12).
- [ ] Configuração ausente, parada, reinício e logs verificados (V05–V08).
- [ ] Paridade local (V09); R2 de homologação (V10) ou pendência registrada.
- [ ] Consumo medido (V11); documentação de execução.

## 14. Pendências e passagem adiante

- V10 depende de ET-08.
- ET-10 recebe: imagem e procedimento de execução, códigos de saída, medição de consumo.
- ET-12 recebe: receita de build para automatizar.

## 15. Brief de execução

Empacotar o coletor em imagem multiestágio a partir do lockfile, com base fixada, só JavaScript compilado e dependências de produção, usuário sem privilégio, sem porta e sem segredo. Provar parada limpa, reinício com retomada, logs e paridade com o processo local contra o simulador. Medir consumo. Sem servidor HTTP de saúde, sem AWS. Validações V01–V12. Referências: SEC-006, SEC-008, [infraestrutura/README.md](../../infraestrutura/README.md).
