# Performance

[Voltar ao índice de padrões](README.md)

Prioridade deste projeto: não fazer trabalho desnecessário e não concentrar leitura pública no coletor. Meta numérica de latência, erro, visitante ou custo continua pendente em [testes/README.md](../testes/README.md). Este documento não fixa número.

Arquitetura modular, SOLID e Fastify não garantem milhões de acessos. A página de performance do Nest, consultada em 14 de outubro de 2026, diz que o Fastify se saiu cerca de duas vezes melhor do que o Express no benchmark que ela cita, e ainda assim o Nest usa Express como padrão. Esse resultado não é medida do nosso site, do nosso snapshot nem da nossa CDN.

## PERF-001. Medir a mudança que se diz mais rápida

**Nível:** Obrigatório.

**Regra:** Antes de micro-otimizar, cortar trabalho repetido, dado grande demais e concorrência sem limite. Medir antes e depois com cenário reproduzível: tamanho do arquivo, concorrência, regra de cache e duração. Não adicionar memoização, índice ou cache sem o custo que eles pagam.

**Onde se aplica:** web, coletor, API futura e persistência futura.

**Verificação:** o relato da mudança diz o cenário e a diferença observada. Sem medição, a mudança não é apresentada como ganho.

## Web

### PERF-002. Bundle, mapa e render

**Nível:** Obrigatório para a tela de resultados, quando ela existir.

**Regra:**

- Carregar o que a visão ativa usa. O mapa nacional não puxa detalhe municipal: município está fora do escopo.
- Controlar o custo do SVG e do GeoJSON. A fonte cartográfica ainda está pendente.
- Não renderizar de novo o país inteiro porque um texto de horário mudou, se a separação de componentes resolver isso com clareza. Não colocar `useMemo` e `useCallback` em toda função para chegar lá.
- Biblioteca de estado ou de requisição só entra com necessidade demonstrada. A decisão já está em [web/README.md](../web/README.md).
- Polling centralizado, sem parâmetro aleatório na URL. Furor de cache aumenta requisição e custo. Ver [web/padroes-de-desenvolvimento.md](../web/padroes-de-desenvolvimento.md).

**Verificação:** inspeção do build quando a tela existir, e o ensaio de cache da etapa de homologação. O build atual só mostra o título do ambiente inicial.

## Coletor

### PERF-003. Um ciclo, respostas limitadas, pouco trabalho no loop

**Nível:** Obrigatório.

**Regra:**

- No máximo um ciclo em andamento.
- Limite de concorrência, de tempo e de tamanho antes de interpretar o corpo inteiro.
- Não fazer parse, serialização nem cópia repetida de objeto grande dentro do mesmo ciclo sem necessidade.
- Cliente HTTP reaproveitado quando isso for seguro, em vez de criar conexão a cada arquivo sem motivo.
- Log e métrica não usam identificador de cardinalidade ilimitada, como URL completa com query arbitrário ou corpo inteiro.
- Trabalho síncrono pesado no event loop é problema mesmo dentro de função `async`. Ver [typescript-funcoes-e-assincronismo.md](typescript-funcoes-e-assincronismo.md).
- O teto de 100 requisições por segundo por IP publicado pelo TSE é limite da origem, não meta de velocidade. Não executar teste de carga contra o TSE.

**Onde se aplica:** `apps/collector`. Os números operacionais continuam pendentes.

**Verificação:** teste de limite em amostra local e, na homologação, tempo de ciclo e atraso. Não há coletor real para medir hoje.

## API futura

### PERF-004. Custo por operação, se a API existir

**Nível:** Condicional.

**Regra:** Cada operação tem limite de tamanho e de custo. Não há API no caminho da leitura pública dos snapshots. Se um endpoint existir, ele não consulta o TSE por visita. Fastify é a stack prevista, com as ressalvas de [api/padroes-de-desenvolvimento.md](../api/padroes-de-desenvolvimento.md). Adotar Fastify não dispensa medição.

**Verificação:** teste do limite da operação e revisão de que o endpoint não está no fluxo do visitante comum.

## Persistência futura

### PERF-005. Índice a partir da consulta que existe

**Nível:** Condicional. PostgreSQL não faz parte da primeira versão.

**Regra:** Consulta pede só os campos e as linhas necessários. Índice se justifica pela consulta real, lida com `EXPLAIN` em ambiente que não seja produção. `EXPLAIN ANALYZE` executa a instrução, conforme a documentação do PostgreSQL 18 consultada em 14 de outubro de 2026. Não criar índice “por precaução” numa tabela que ainda não existe. O restante está em [dados/consultas-e-transacoes.md](../dados/consultas-e-transacoes.md).

**Verificação:** plano da consulta no banco isolado de ensaio, quando banco e consulta existirem.

## Distribuição e cache

### PERF-006. O pico de leitura é cache, não processo

**Nível:** Obrigatório no desenho. A configuração ainda é planejada.

**Regra:**

- Arquivo de versão é imutável e pode ter cache longo.
- O manifesto muda e precisa de outra política, curta o suficiente para o polling perceber a troca, sem transformar cada visita em leitura de origem.
- Não criar cache em memória ilimitado no coletor nem no navegador.
- Não presumir que o objeto no R2 já está na borda. A documentação de consistência do R2, consultada em 14 de outubro de 2026, diz que o acesso direto ao bucket é fortemente consistente para leitura após escrita, e que um domínio com cache deixa essa garantia mais frouxa: objeto substituído ou apagado pode continuar sendo servido até o TTL ou até um purge.
- Vários objetos e o cache da borda não mudam como uma transação única. A ordem de publicação está no documento do coletor.

**Verificação:** status de cache na homologação, como em [testes/README.md](../testes/README.md). Teste com fake de armazenamento não mede a CDN.

## O que observar

Quando houver o que medir, observar:

- latência e percentis, não só a média;
- taxa de erros;
- duração de cada ciclo e atraso entre a coleta e a publicação;
- CPU, memória e atraso do event loop do coletor;
- tamanho dos snapshots;
- quantidade de requisições do coletor à origem e do navegador à nossa camada;
- acerto de cache;
- requisições que chegam ao armazenamento;
- custo no período do ensaio.

Sentry, OpenTelemetry e Grafana continuam planejados e não são obrigatórios no primeiro dia. Até lá, o log do coletor precisa permitir ver falha e atraso sem gravar segredo.

## Três provas diferentes

| Prova | O que mostra | O que não mostra |
| --- | --- | --- |
| Teste unitário | Decisão, limite lógico, preservação da versão | Capacidade do site |
| Benchmark | Diferença entre duas implementações num cenário fixo | Comportamento com a audiência real |
| Teste de carga | O ambiente autorizado, com o tamanho e a regra de cache usados no ensaio | O TSE, e qualquer número fora do cenário medido |

k6 é a ferramenta prevista para carga contra a nossa infraestrutura. Não está instalado. Não apontar script de carga ao TSE.

## Referências

Consultadas em 14 de outubro de 2026:

- NestJS, performance e Fastify: <https://docs.nestjs.com/techniques/performance>
- Node.js, não bloquear o event loop: <https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop>
- PostgreSQL 18, `EXPLAIN`: <https://www.postgresql.org/docs/current/using-explain.html>
- Cloudflare R2, modelo de consistência, página com atualização indicada em 14 de outubro de 2026: <https://developers.cloudflare.com/r2/reference/consistency/>

[Voltar ao índice de padrões](README.md)
