# Arquitetura

[Voltar ao contexto](../contexto.md)

Este documento reúne as decisões que atravessam as aplicações. O procedimento de coleta está em [collector/README.md](../collector/README.md). O contrato está em [dados/README.md](../dados/README.md). Provisionamento e ordem de execução estão em [infraestrutura/README.md](../infraestrutura/README.md). O guia de código, que não muda estas fronteiras, está em [padroes/README.md](../padroes/README.md).

Os rótulos de estado estão em [contexto.md](../contexto.md). Nada nesta página foi provisionado na Cloudflare ou na AWS.

## Fronteiras

| Parte | Responsabilidade | O que não faz |
| --- | --- | --- |
| `apps/web` | Apresenta mapa e painéis. Lê o contrato publicado | Não chama o TSE nem o EC2 |
| `apps/collector` | Consulta a origem, valida, normaliza e publica | Não serve a leitura pública |
| `apps/api` | Pasta reservada | Não existe serviço e não é caminho crítico |
| `packages/types` | Tipos compartilhados, quando o contrato existir | Hoje exporta vazio |
| `packages/election-data` | Material eleitoral compartilhado, quando houver | Hoje exporta vazio |
| `packages/validation` | Schemas, quando forem escritos sobre o contrato | Hoje só declara Zod |

O pacote de validação é a casa prevista dos schemas. Web e coletor devem depender do contrato, não um do formato interno do outro. Essa dependência de pacote ainda não foi ligada: nenhum `package.json` aponta para outro pacote do workspace.

## Fluxo de publicação e leitura dos resultados

```text
TSE
  → coletor em Node.js
  → validação e normalização
  → snapshots JSON
  → domínio de resultados com CDN e cache
  → navegador
```

No desenvolvimento inicial, o destino dos snapshots é disco local. O destino planejado de produção é o R2, atrás de um domínio próprio. O navegador só entra na última seta.

## Fluxo de publicação do site

```text
código do frontend
  → build com Vite
  → Workers Static Assets
  → navegador
```

Os dois fluxos se encontram apenas no navegador, que carrega o site e depois busca os JSON. Publicar apuração não recompila o frontend. Publicar o frontend não apaga a versão dos resultados.

## Três coisas que não se confundem

**Hospedar o frontend com Workers Static Assets.** Os arquivos gerados pelo Vite são enviados à rede da Cloudflare. A documentação do produto diz que, se o caminho corresponder a um arquivo, esse arquivo é servido sem invocar código de Worker. Um projeto pode não ter script. O guia de React mostra que a API no Worker é um acréscimo posterior. É este o destino planejado do site.

**Executar lógica numa função Worker.** O código da função roda no pedido que a configuração entregar a ela. Serve para transformação, autenticação ou outra regra que os arquivos estáticos não resolvam. A primeira versão não coloca essa função como intermediária obrigatória de cada leitura de JSON. Se um dia ela for necessária, a necessidade e a decisão serão registradas à parte.

**Manter uma API dinâmica em `apps/api`.** Seria um processo Node.js, com a stack prevista NestJS e Fastify, fora do runtime de Workers. Está fora da primeira versão. A existência da pasta não cria a obrigação. Detalhes em [api/README.md](../api/README.md).

Escolher Workers Static Assets não obriga a criar API, não move o coletor para Workers e não abandona os snapshots.

## Leitura pública

**Decisão adotada:** os snapshots são distribuídos pelo domínio próprio associado ao R2, com cache configurado. O visitante não acessa o EC2. O coletor não é o servidor de leitura.

A documentação de cache da Cloudflare, consultada em 14 de outubro de 2026, diz que o endereço de desenvolvimento `r2.dev` não oferece cache, WAF nem bot management, e que JSON não entra no cache padrão sem uma regra. Guardar o objeto no R2 não significa que ele já esteja em cache. A regra do manifesto e a regra dos arquivos imutáveis são diferentes. Isso está operacionalizado em [infraestrutura/README.md](../infraestrutura/README.md).

## Origem e contrato

A resposta do TSE é dado de origem. Ela fica no coletor pelo tempo necessário para validar e normalizar. O que segue para o R2 e para o navegador é o contrato interno, com versão, abrangência, disponibilidade e rastreabilidade. O frontend não conhece o nome cru dos campos oficiais.

Ambiente oficial e ambiente simulado produzem publicações separadas. Um manifesto de produção não aponta para arquivo colhido no simulado.

## Desenvolvimento local

Enquanto o R2 não entra, o coletor grava no disco e o frontend lê esses arquivos. A substituição é só de armazenamento. Validação, versão e manifesto são os mesmos. Assim a tela mínima pode avançar antes da conta na Cloudflare, e a Cloudflare pode ser ensaiada antes do mapa completo.

Não há, hoje, código desse armazenamento. A decisão é de desenho.

## Versões e manifesto

**Decisão adotada:** uma versão é um conjunto imutável. O manifesto é o ponteiro. Ele só muda depois que os arquivos da versão estão disponíveis. Falha conserva o ponteiro anterior. Versões ainda referenciadas por cliente ou cache não são apagadas na hora.

**Proposta:** chamar o ponteiro de `latest.json`. O nome não está implementado.

Há um publicador ativo. Duas escritas concorrentes quebram a ordem acima. Redundância ativa fica fora da primeira versão até existir estratégia de liderança.

## Decisões

| Decisão | Motivo | Consequência |
| --- | --- | --- |
| Workers Static Assets no lugar de Pages | A Cloudflare orienta projetos novos a começar com Workers. Pages continua documentado, mas deixa de ser o destino deste frontend | O build do Vite será publicado como assets. Não herdamos Pages Functions |
| Leitura pública por snapshots e CDN | O pico é de leitura repetida do mesmo quadro | O atraso visível depende do cache do manifesto, não de um servidor de API |
| Coletor fora do caminho do visitante | A origem tem limite por IP e não deve ser multiplicada pelos navegadores | O site pode continuar no ar com números antigos se o coletor parar |
| EC2 e Docker para o coletor | O processo é contínuo, com saída para o TSE e para o R2, e não precisa do runtime de Workers | Há uma máquina para operar. Não há balanceador na frente dela |
| API dinâmica opcional | Os painéis cabem em arquivos | `apps/api` permanece vazia até um requisito que o snapshot não cubra |
| Sem Redis e sem PostgreSQL na primeira versão | Não há sessão de visitante nem consulta que peça banco | Não operar banco sem um dado que precise viver nele |
| Sem load balancer próprio | O tráfego público não chega ao coletor | Não haverá load balancer próprio na arquitetura inicial, pois o tráfego público de leitura não será atendido pelo servidor do coletor |
| Um publicador | Evita manifesto apontando para versão pela metade | A instância única é um ponto de falha operacional, aceito na primeira versão |

Cloudflare Workers Static Assets substitui Cloudflare Pages como destino planejado de hospedagem do frontend. O README ainda cita Pages em `infra/cloudflare`. Essa frase do README está superada. API, Redis e PostgreSQL, que o README lista como adiados, continuam fora da primeira versão. Não há dois desenhos vigentes ao mesmo tempo.

## Limitações e pontos de falha

- O cache reduz pedidos à origem e ao R2, mas a expiração escolhida aumenta ou diminui o atraso que o visitante percebe.
- Com o coletor parado, novas apurações deixam de ser publicadas mesmo que o site e a última versão sigam acessíveis.
- Uma instância única não sobrevive a falha de máquina, de processo ou de credencial até alguém religá-la.
- Cache vazio, regra errada ou domínio de desenvolvimento no lugar do domínio próprio mudam custo e latência. Isso tem de ser medido.
- EA14, EA15 e EA20 podem não refletir o mesmo instante. O snapshot precisa ser coerente consigo mesmo, sem prometer que a origem também o era.
- A arquitetura ainda não provou capacidade nem recuperação. Essa prova está em [testes/README.md](../testes/README.md).

## Quando evoluir

Uma mudança sobe de patamar só com requisito demonstrado:

- função Worker, se leitura, autenticação ou transformação tiverem uma necessidade que o domínio do R2 não cubra;
- `apps/api`, pelos critérios de [api/README.md](../api/README.md);
- Redis ou PostgreSQL, se surgir estado que não caiba no snapshot;
- segundo coletor, só com estratégia de publicação que impeça versões concorrentes;
- balanceador, só na frente de um serviço dinâmico que precise de mais de uma instância.

Sentry e OpenTelemetry com Grafana são as ferramentas previstas de observabilidade. Podem esperar o coletor ter o que observar. Não são pré-requisito para o primeiro snapshot local. Também não são, sozinhas, um plano de capacidade.

## Referências

Consultadas em 14 de outubro de 2026:

- Cloudflare Workers Static Assets: <https://developers.cloudflare.com/workers/static-assets/>
- Cloudflare Pages, orientação para iniciar projetos novos com Workers: <https://developers.cloudflare.com/pages/>
- Cloudflare, cache com R2, página com atualização indicada em 7 de maio de 2026: <https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/>
- Cloudflare, React e Vite em Workers: <https://developers.cloudflare.com/workers/framework-guides/web-apps/react/>
- TSE, informações técnicas da divulgação de 2026: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>

[Voltar ao contexto](../contexto.md)
