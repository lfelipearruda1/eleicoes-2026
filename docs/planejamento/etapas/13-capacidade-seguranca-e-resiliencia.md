# ET-13 — Capacidade, segurança e resiliência

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-13 |
| Componente | Homologação inteira: site, domínio de resultados, R2, coletor na AWS; `tests/load/` |
| Tipo predominante | Carga, resiliência e verificação de segurança |
| Marco | M6 — Prontidão operacional |
| Resultado concreto | Um relatório com os cenários realmente executados, suas medições, os limites observados, os ajustes feitos e os riscos remanescentes. Nenhuma capacidade é afirmada fora do cenário medido |

## 2. Escopo e exclusões

**Faz:** metas e cenários aprovados antes; scripts k6; gerador monitorado; carga habitual, rajada e aumento progressivo; cache preenchido e vazio; manifesto e arquivos; troca de versão durante tráfego; falhas da origem (simulada), do coletor e da publicação; interface com dados parados; controles de acesso e exposição de segredo; WAF com IP compartilhado; limites de memória, concorrência e custo; ajustes e repetição; relatório.

**Não faz:**

- Não direciona carga ao TSE, nem de teste. A origem dos ensaios de falha é o simulador.
- Não testa produção (ET-14 faz só verificações funcionais).
- Não extrapola número além do medido.
- Não começa sem autorização, ambiente, orçamento e condições de interrupção escritos.

## 3. Contexto e evidências

Estado observado em 17/10/2026: `tests/load/` só tem `.gitkeep`; k6 não está instalado no repositório. Base: [testes/README.md](../../testes/README.md) (seção Carga e critérios), [performance.md](../../padroes/performance.md) (PERF-006, "O que observar", três provas), [seguranca/README.md](../../seguranca/README.md) (riscos e roteiro de incidente), [testes/seguranca.md](../../testes/seguranca.md).

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-12: observabilidade, alertas, manual, retornos | T04 em diante |
| Implementação | ET-11: interface completa com polling real | Modelo de carga em T01 |
| Decisão | DP-28 (cenários, orçamento do ensaio, interrupção, autorização) | T02 em diante |
| Decisão | DP-27 (metas de recuperação) | Critério numérico de V08 |
| Decisão | DP-22 (orçamento) | T04 em diante |
| Autorização | Execução de carga na homologação, com teto e responsável por interromper | T04–T08 |

**Pode começar antes de ET-12 terminar:** T01 (definição de metas e cenários) e T02 (scripts, rodados só contra servidor local).

## 5. Entradas e saídas

**Entradas:** homologação estável; padrão de leitura do web (ET-11: intervalo de polling, arquivos por visão); tamanhos dos arquivos (ET-02, ET-08); observabilidade (ET-12).

**Saídas:**

| Artefato | Consumidor |
| --- | --- |
| Plano de ensaio aprovado em `tests/load/README.md` (proposto) | Execução |
| Scripts k6 em `tests/load/` (proposto) | Repetição e ET-14 (verificação leve, se aprovada) |
| Relatório em `docs/planejamento/evidencias/ET-13.md` (proposto) | ET-14 (critério de autorização) |
| Valores revistos para DP-14, DP-16, DP-17 e limitação de taxa | ET-14 |

## 6. Responsabilidades e fronteiras

| Peça | Responsabilidade |
| --- | --- |
| Plano de ensaio | Diz o que se mede, onde, quanto custa e quando parar |
| Gerador de carga | Gera pedidos só aos domínios de homologação listados no script |
| Observador do gerador | Confirma que o gargalo não é o gerador |
| Observador do alvo | Lê cache, erros, latência, custo durante o ensaio |
| Responsável por interromper (a designar) | Para o ensaio ao atingir uma condição |

## 7. Sequência de tarefas

### ET-13-T01 — Definir metas, cenários e condições do ensaio

- **Tipo:** documentação
- **Resultado pretendido:** DP-28 resolvida; nada é executado sem este texto aprovado.
- **Entradas e pré-requisitos:** ET-11 (padrão de leitura), tamanhos medidos, DP-22, DP-27.
- **Ações:**
  1. Relacionar as grandezas: visitantes simultâneos (V); intervalo de polling (I); pedidos de manifesto por segundo ≈ V ÷ I; arquivos lidos por troca de versão e por troca de UF; tamanho de cada resposta; bytes por segundo. Escrever as fórmulas com os valores medidos, não com números inventados.
  2. Definir cenários: habitual, rajada, aumento progressivo; cache preenchido e vazio; troca de versão durante tráfego.
  3. Definir metas que vêm do responsável pelo produto (latência, erros, acerto de cache, custo) e marcar como pendentes as que não vierem.
  4. Definir ambiente (homologação), domínios-alvo, duração, teto de gasto, condições de interrupção (erro, custo, latência, alerta da Cloudflare) e quem interrompe.
  5. Obter autorização escrita.
- **Responsabilidade e caminhos:** `tests/load/README.md` (proposto).
- **Regras, falhas e bordas:** "milhões de acessos" não é meta; meta separa V, pedidos por segundo e bytes.
- **Saída:** plano aprovado.
- **Validações:** ET-13-V01
- **Concluída quando:** plano aprovado com todas as condições de interrupção.
- **Bloqueios ou aprovações:** DP-28; autorização.

### ET-13-T02 — Escrever os scripts k6

- **Tipo:** código
- **Resultado pretendido:** scripts que reproduzem o comportamento do web: manifesto periódico, arquivos ao mudar a versão ou a UF.
- **Entradas e pré-requisitos:** T01; aprovação da instalação do k6 (ferramenta fora do npm).
- **Ações:**
  1. Lista de hosts permitidos no próprio script; recusar qualquer outro.
  2. Cenários parametrizados por variável, sem valores fixos inventados.
  3. Métricas: latência por percentil, erros, status de cache por resposta, bytes.
  4. Rodar primeiro contra o servidor de desenvolvimento local de ET-05-T12.
- **Responsabilidade e caminhos:** `tests/load/` (proposto).
- **Regras, falhas e bordas:** nenhum host do TSE em nenhum script.
- **Saída:** scripts.
- **Validações:** ET-13-V02
- **Concluída quando:** scripts rodam localmente e recusam host fora da lista.
- **Bloqueios ou aprovações:** instalação do k6.

### ET-13-T03 — Preparar e monitorar o gerador de carga

- **Tipo:** infraestrutura
- **Recurso e acesso:** máquina ou serviço gerador decidido no plano; custo incluído no teto.
- **Resultado pretendido:** sabemos que a medição reflete o alvo, não o limite do gerador.
- **Entradas e pré-requisitos:** T01, T02.
- **Ações:**
  1. Escolher onde gerar (máquina local, instância temporária ou serviço), com custo.
  2. Monitorar CPU, memória e rede do gerador durante o ensaio.
  3. Definir o critério de "gerador saturado" que invalida a rodada.
- **Responsabilidade e caminhos:** plano de ensaio.
- **Regras, falhas e bordas:** instância temporária criada para o ensaio entra no inventário e tem destino definido (ET-15 não esquece custo).
- **Saída:** gerador preparado.
- **Validações:** ET-13-V03
- **Concluída quando:** uma rodada curta mostra o gerador abaixo do limite definido.
- **Bloqueios ou aprovações:** autorização de custo.

### ET-13-T04 — Executar carga habitual, rajada e aumento progressivo com cache preenchido

- **Tipo:** teste
- **Resultado pretendido:** medições do comportamento sob os perfis planejados.
- **Entradas e pré-requisitos:** T01–T03; ET-12.
- **Ações:**
  1. Aquecer o cache; executar cada perfil pelo tempo do plano.
  2. Registrar latência por percentil, erros, acerto de cache, pedidos que chegaram ao R2, bytes e custo durante a rodada.
  3. Interromper ao atingir qualquer condição do plano.
- **Responsabilidade e caminhos:** relatório.
- **Regras, falhas e bordas:** se a limitação de taxa da borda bloquear o gerador, registrar e decidir se o cenário modela visitantes reais (IPs distintos) ou não.
- **Saída:** medições.
- **Validações:** ET-13-V04, ET-13-V09
- **Concluída quando:** cada perfil tem medição ou registro de interrupção.
- **Bloqueios ou aprovações:** autorização.

### ET-13-T05 — Executar cache vazio e troca de versão durante tráfego

- **Tipo:** teste
- **Resultado pretendido:** saber o custo e a latência da primeira leitura de uma versão e confirmar que nenhum cliente lê arquivo inexistente ou mistura versões.
- **Entradas e pré-requisitos:** T04.
- **Ações:**
  1. Publicar versão nova (simulador mudando) durante carga constante.
  2. Medir: pico de pedidos ao R2 depois da troca, latência, erros 404 em arquivos referenciados.
  3. Repetir com cache esvaziado, se o plano permitir purge.
- **Responsabilidade e caminhos:** relatório.
- **Regras, falhas e bordas:** 404 em arquivo referenciado por manifesto é defeito grave de publicação.
- **Saída:** medições.
- **Validações:** ET-13-V05
- **Concluída quando:** nenhuma leitura de arquivo referenciado falhou, ou a falha foi registrada e corrigida em T09.
- **Bloqueios ou aprovações:** autorização.

### ET-13-T06 — Ensaiar falhas da origem, do coletor e da publicação

- **Tipo:** teste
- **Resultado pretendido:** cada falha tem detecção, comportamento visível e retomada medidos.
- **Entradas e pré-requisitos:** ET-12 (alertas e procedimentos).
- **Ações:**
  1. Origem: simulador em timeout, resposta inválida e bloqueio; o coletor não publica; alerta de atraso dispara.
  2. Coletor: container parado; instância reiniciada.
  3. Publicação: credencial revogada temporariamente ou bucket inacessível em homologação; manifesto preservado.
  4. Interface com dados parados: aviso de desatualização visível.
  5. Executar o roteiro de incidente de [seguranca/README.md](../../seguranca/README.md) uma vez, do início ao fim.
  6. Medir tempo de detecção e de retomada.
- **Responsabilidade e caminhos:** relatório.
- **Regras, falhas e bordas:** origem real nunca é usada para provocar falha.
- **Saída:** medições e registro do roteiro.
- **Validações:** ET-13-V08, ET-13-V12
- **Concluída quando:** todas as falhas foram provocadas e a retomada registrada.
- **Bloqueios ou aprovações:** autorização para alterar credencial em homologação.

### ET-13-T07 — Verificar controles de acesso, exposição de segredo e WAF

- **Tipo:** teste
- **Resultado pretendido:** os controles de acesso que existem foram tentados de fora.
- **Entradas e pré-requisitos:** ET-07, ET-10, ET-12.
- **Ações:**
  1. Caminho alternativo do bucket, escrita no domínio de resultados, listagem, portas da instância.
  2. Busca de segredo no bundle publicado, na imagem, em logs do coletor e do CI.
  3. Escopo de cada credencial (homologação não escreve fora do seu bucket).
  4. Limitação de taxa: tráfego legítimo de vários visitantes atrás do mesmo IP (simulado) não é bloqueado acima do aceitável; padrão abusivo é contido.
  5. Query string arbitrária não multiplica variantes de cache.
- **Responsabilidade e caminhos:** relatório.
- **Regras, falhas e bordas:** só a nossa infraestrutura é alvo.
- **Saída:** registro.
- **Validações:** ET-13-V06, ET-13-V07
- **Concluída quando:** todas as verificações têm resultado registrado.
- **Bloqueios ou aprovações:** autorização.

### ET-13-T08 — Medir limites do coletor e o custo

- **Tipo:** teste
- **Resultado pretendido:** saber se o coletor se mantém estável em execução longa e quanto custa a operação.
- **Entradas e pré-requisitos:** ET-10.
- **Ações:**
  1. Execução longa com o simulador mudando: memória, CPU, duração dos ciclos, atraso origem → publicação.
  2. Leitura de custo da Cloudflare e da AWS no período do ensaio, comparada com o teto.
  3. Rever DP-16 e DP-17 com os dados.
- **Responsabilidade e caminhos:** relatório; atualização de [decisoes-e-riscos.md](../decisoes-e-riscos.md).
- **Regras, falhas e bordas:** memória crescente sem estabilizar é defeito a corrigir em T09.
- **Saída:** medições e propostas de valores.
- **Validações:** ET-13-V09, ET-13-V11
- **Concluída quando:** medições registradas e valores propostos.
- **Bloqueios ou aprovações:** nenhum.

### ET-13-T09 — Aplicar ajustes e repetir os cenários afetados

- **Tipo:** código ou configuração, conforme o achado
- **Resultado pretendido:** cada ajuste tem medição antes e depois (PERF-001).
- **Entradas e pré-requisitos:** T04–T08.
- **Ações:**
  1. Listar achados com prioridade.
  2. Corrigir na etapa dona (por exemplo, regra de cache em `infra/cloudflare/`, limite no coletor), com o teste correspondente.
  3. Repetir só os cenários afetados.
- **Responsabilidade e caminhos:** conforme o achado.
- **Regras, falhas e bordas:** não otimizar o que não foi medido.
- **Saída:** ajustes e medições repetidas.
- **Validações:** ET-13-V04, ET-13-V05
- **Concluída quando:** cada ajuste tem antes e depois.
- **Bloqueios ou aprovações:** conforme a área do ajuste.

### ET-13-T10 — Redigir o relatório

- **Tipo:** documentação
- **Resultado pretendido:** documento que ET-14 usa para autorizar a produção.
- **Entradas e pré-requisitos:** T04–T09.
- **Ações:**
  1. Para cada cenário: configuração (tamanhos, regra de cache, região do gerador, duração), medições, interrupções.
  2. Limites observados e riscos remanescentes.
  3. O que não foi testado, dito explicitamente.
  4. Recomendação de valores para DP-14, DP-16, DP-17 e limitação de taxa.
- **Responsabilidade e caminhos:** `docs/planejamento/evidencias/ET-13.md` (proposto).
- **Regras, falhas e bordas:** sem extrapolação apresentada como fato; cálculo de extrapolação, se houver, marcado como estimativa.
- **Saída:** relatório.
- **Validações:** ET-13-V10
- **Concluída quando:** o relatório cobre todos os cenários do plano, executados ou não.
- **Bloqueios ou aprovações:** nenhum.

## 8. Contratos e compatibilidade

Nenhuma mudança de contrato é esperada. Se a medição mostrar que a divisão de arquivos (ET-02-T06) é cara, a mudança volta a ET-02 como mudança de contrato com versão.

## 9. Segurança, integridade e performance

- R-12: relatório sem extrapolação (V10).
- R-11: custo lido durante o ensaio (V09).
- R-16: IP compartilhado (V07).
- R-04: troca de versão sob tráfego (V05).
- R-07, R-08: exposição (V06).
- PERF-006: o pico de leitura é cache; o ensaio mede quanto chega ao R2.

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-13-V01 | Plano aprovado | T01 | Conferir antes da primeira rodada | Metas, cenários, teto, interrupção, responsável e autorização escritos | Rodada sem algum desses | Revisão | Documento | T01 |
| ET-13-V02 | Alvos restritos | Scripts | Tentar host fora da lista | Script recusa; nenhum host do TSE | Pedido enviado | Revisão + integração | Local | T02 |
| ET-13-V03 | Gerador saudável | Rodada curta | Monitorar o gerador | Abaixo do limite definido | Gerador saturado sem registro | Carga | Gerador | T03 |
| ET-13-V04 | Perfis com cache preenchido | T04 | Executar | Medições registradas por perfil, comparadas às metas aprovadas | Rodada sem medição ou meta violada sem registro | Carga | Homologação | T04, T09 |
| ET-13-V05 | Troca de versão sob tráfego | T05 | Publicar durante carga | Zero falha em arquivo referenciado; pico ao R2 medido | 404 em arquivo referenciado ou mistura | Carga e resiliência | Homologação | T05, T09 |
| ET-13-V06 | Exposição | T07 | Buscas e tentativas | Nada exposto | Segredo encontrado ou caminho aberto | Homologação | Homologação | T07 |
| ET-13-V07 | WAF e IP compartilhado | T07 | Tráfego legítimo de um IP e padrão abusivo (casos separados) | Legítimo atendido dentro do aceito; abusivo contido | Legítimo bloqueado ou abusivo livre | Homologação | Homologação | T07 |
| ET-13-V08 | Falhas e retomada | T06 | Provocar cada falha | Detecção e retomada medidas e comparadas a DP-27; roteiro executado | Falha sem detecção ou sem retomada | Resiliência | Homologação | T06 |
| ET-13-V09 | Custo | T04, T08 | Ler custo do período | Dentro do teto | Acima sem interrupção | Verificação operacional | Homologação | T04, T08 |
| ET-13-V10 | Relatório fiel | T10 | Revisar | Só cenários executados como fato; não testado listado | Extrapolação como fato | Revisão | Documento | T10 |
| ET-13-V11 | Coletor em execução longa | T08 | Medir memória e ciclos | Memória estável; ciclos sem sobreposição | Crescimento contínuo | Resiliência | Homologação | T08 |
| ET-13-V12 | Interface com dados parados | Coletor parado | Abrir o site | Último válido com aviso de desatualização | Sem aviso | Homologação | Homologação | T06 |

## 11. Infraestrutura e ações externas

| Item | Manual | Aprovação |
| --- | --- | --- |
| Instalação do k6 | Sim | Sim (ferramenta nova) |
| Gerador de carga (se instância temporária) | Criação e desligamento registrados | Sim (custo) |
| Execução das rodadas | Sim, com responsável por interromper | Sim |
| Purge de cache, se usado | Sim | Sim |
| Revogação temporária de credencial em homologação | Sim | Sim |

## 12. Falha, reversão e recuperação

- **Rodada fora de controle:** interromper pelo responsável; registrar.
- **Custo acima do previsto:** interromper; ler fatura; registrar.
- **Ajuste ruim:** reverter a configuração ou o commit; repetir cenário.
- **Recurso temporário:** desligar ao fim, com registro; nada fica esquecido.

## 13. Critérios de conclusão

- [ ] Plano aprovado antes de qualquer rodada (V01).
- [ ] Scripts restritos aos nossos domínios (V02); gerador monitorado (V03).
- [ ] Cenários executados e medidos (V04, V05, V11, V12).
- [ ] Segurança e WAF verificados (V06, V07).
- [ ] Falhas e retomada medidas; roteiro de incidente executado (V08).
- [ ] Custo dentro do teto (V09); relatório fiel (V10).

## 14. Pendências e passagem adiante

- Metas que o responsável pelo produto não definir ficam como "não avaliadas" no relatório; ET-14 decide se aceita o risco.
- ET-14 recebe: relatório, valores recomendados, riscos remanescentes.

## 15. Brief de execução

Antes de qualquer rodada, aprovar metas, cenários, teto, condições de interrupção e responsável. Escrever scripts k6 que só aceitam os domínios de homologação. Monitorar o gerador. Medir perfis habitual, rajada e progressivo, cache vazio e troca de versão sob tráfego. Provocar falhas da origem simulada, do coletor e da publicação e executar o roteiro de incidente. Verificar exposição, escopos e WAF com IP compartilhado. Ler custo. Ajustar com antes e depois. Relatar só o medido. Nunca apontar carga ao TSE. Validações V01–V12. Referências: [testes/README.md](../../testes/README.md), PERF-006.
