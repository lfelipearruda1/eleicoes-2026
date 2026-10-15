# API

[Voltar ao contexto](../contexto.md)

Componente opcional, fora do caminho crítico da primeira versão.

Não há implementação no repositório. `apps/api` contém apenas `.gitkeep`. Não existe `package.json`, código, endpoint, banco nem configuração de framework. Esta página não autoriza criar essa aplicação.

Organização do código, se a API for introduzida: [padroes-de-desenvolvimento.md](padroes-de-desenvolvimento.md). Esse texto também não autoriza endpoint.

Os rótulos de estado estão em [contexto.md](../contexto.md).

## Por que a primeira versão funciona sem API dinâmica

O visitante precisa ler um conjunto pequeno de resultados que muda por publicação, não por pedido. O coletor já terá buscado a origem, validado o conteúdo e gravado um snapshot. O navegador baixa esse arquivo pela CDN.

Nesse arranjo, um servidor de aplicação no meio de cada leitura acrescentaria um processo para escalar, proteger e operar, sem mudar o dado exibido. Volume alto de leitura, sozinho, não justifica abandonar a distribuição estática. Quem absorve o pico é o cache, não uma frota de API.

## Arquivo JSON e endpoint dinâmico

Um arquivo JSON acessível por HTTP é um objeto já pronto. O servidor de borda o entrega. Não há, nesse pedido, consulta ao TSE, regra de negócio nem composição de resposta.

Um endpoint dinâmico executa código no momento do pedido: autentica, consulta um estado, filtra ou monta uma resposta que não estava gravada. Isso é outra arquitetura. Ela só cabe se o produto tiver uma operação que o snapshot não represente.

A função Worker descrita na documentação da Cloudflare também é código no caminho do pedido. Ela não é esta API, e a primeira versão não a usa para ler os snapshots. A diferença entre hospedagem estática, função Worker e `apps/api` está em [arquitetura/README.md](../arquitetura/README.md).

## O que uma API futura poderia assumir

Estes exemplos não são funcionalidades aprovadas. São necessidades a avaliar, se o produto um dia as confirmar:

- Operações administrativas autenticadas, como interromper publicação ou escolher uma versão visível.
- Consultas que os snapshots não atendam de forma adequada.
- Funcionalidades dinâmicas confirmadas pelo produto.

Critérios para justificar a introdução:

- Existe um requisito de produto escrito, que um arquivo publicado não cumpre.
- A operação não pode ser feita com segurança só com credencial de publicação no coletor.
- O custo de operar o serviço foi comparado com a alternativa estática.
- Há teste, limite de acesso e observabilidade definidos antes da exposição.

Sem esse conjunto, a pasta continua reservada.

## Stack prevista, se a API for introduzida

**Planejado, e fora da primeira versão:** NestJS com Fastify, em ambiente Node.js. É a stack inicialmente prevista para o dia em que a API existir. Não está instalada. Não se presume que esse processo rode no runtime de Workers. Workers e Node.js são ambientes diferentes.

Redis, PostgreSQL e balanceador de carga não entram junto com a API. Cada um precisaria de um requisito próprio. Balancear instâncias só seria avaliado se existisse um serviço dinâmico que realmente precisasse de mais de uma instância.

## Contrato, segurança e testes

A API, se existir, consome o mesmo contrato normalizado descrito em [dados/README.md](../dados/README.md). Ela não redefine campo de candidato, voto ou andamento.

Regras que já ficam fechadas para qualquer desenho futuro:

- A API não consulta o TSE a cada requisição de visitante.
- A API não duplica o coletor. Quem fala com a origem, valida a resposta bruta e publica versão continua sendo o coletor, descrito em [collector/README.md](../collector/README.md).
- Não há lista de endpoints aprovados. Este documento não inventa rotas.
- Segredos, validação de entrada, observabilidade e testes seguiriam [seguranca/README.md](../seguranca/README.md) e [testes/README.md](../testes/README.md).
- Supertest, ou ferramenta equivalente de teste HTTP, só entra se uma API compatível for de fato introduzida.

## Referências

A ausência de API é decisão deste projeto. A documentação da Cloudflare consultada em 14 de outubro de 2026 mostra que uma aplicação React pode ser publicada com assets estáticos e que um Worker de API é um passo adicional e opcional do guia, não uma obrigação do produto:

- Workers Static Assets: <https://developers.cloudflare.com/workers/static-assets/>
- React e Vite em Workers, página com atualização indicada em 5 de setembro de 2026: <https://developers.cloudflare.com/workers/framework-guides/web-apps/react/>

[Voltar ao contexto](../contexto.md)
