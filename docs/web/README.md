# Web

[Voltar ao contexto](../contexto.md)

O frontend é a aplicação que o visitante abre. Ela exibe os painéis e lê os snapshots publicados. Não consulta o TSE e não fala com o EC2 do coletor.

**Implementado:** `@eleicoes/web`, com React 19.3.1, React DOM 19.3.1, Vite 8.3.4, TypeScript e Tailwind CSS 4.3.3. `index.html` declara `lang="pt-BR"`. A tela atual centraliza o texto "Eleições 2026 — ambiente inicial". Não há mapa, rota, painel, cliente de dados nem biblioteca de estado além do React.

**Decisão adotada:** manter essa base. SVG e GeoJSON são a abordagem inicial do mapa. A hospedagem planejada é Cloudflare Workers Static Assets. Não escolher agora outra biblioteca de estado, de roteamento ou de mapas.

Os rótulos de estado estão em [contexto.md](../contexto.md). O significado dos arquivos consumidos está em [dados/README.md](../dados/README.md). A organização do código novo da interface está em [padroes-de-desenvolvimento.md](padroes-de-desenvolvimento.md).

## O que a interface precisa mostrar

- Visão Brasil, com o resultado presidencial nacional.
- Mapa do Brasil em que se seleciona uma unidade da Federação, incluindo o Distrito Federal.
- Resultado presidencial da unidade selecionada.
- Resultado de governador somente quando o contrato disser que aquela disputa existe no segundo turno.
- Votos, percentuais, andamento da apuração e a atualidade dos dados.

A fonte cartográfica do GeoJSON está pendente. O mapa não depende de um fornecedor de tiles.

## Hospedagem

O build continua sendo o do Vite (`tsc -b` e `vite build`). No destino planejado, o resultado estático sobe para Workers Static Assets. A documentação desse produto, consultada em 14 de outubro de 2026, permite publicar o frontend sem uma função de API. O guia de React e Vite trata o Worker de API como incremento opcional. Não vamos seguir esse incremento só porque o guia o mostra.

Não há, no repositório, Wrangler, plugin da Cloudflare nem `wrangler.jsonc`. Isso entra na etapa de infraestrutura, não nesta.

Atualizar a apuração não gera outro build. O JavaScript já publicado passa a ler o manifesto dos resultados. O domínio desse manifesto pode ser outro. Se as origens forem diferentes, o bucket precisa de CORS, como descrito em [infraestrutura/README.md](../infraestrutura/README.md). CORS não é autenticação.

## Contrato consumido

A tela usa o contrato normalizado. Ela ignora nomes de campos brutos do TSE. Se o contrato não trouxer um número, a tela não o inventa a partir de outro arquivo.

Percentual de votos e percentual de apuração são informações diferentes e precisam de rótulos diferentes. O percentual exibido é o que o contrato publicar. O navegador não recalcula um segundo percentual por cima desse valor.

O resultado nacional usa o agregado oficial correspondente ao Brasil. Não é uma contagem de unidades da Federação em que um candidato apareça na frente.

## Estados da interface

| Estado | O que o visitante percebe |
| --- | --- |
| Carregamento | Ainda não há conteúdo utilizável desta tentativa. Não preencher votos com zero enquanto espera |
| Dados disponíveis | Painéis preenchidos com a versão indicada pelo manifesto |
| Dados ainda não disponíveis | A apuração ou o arquivo ainda não existe. O vazio permanece vazio |
| Nenhuma disputa de governador naquela unidade | O painel de governador explica a ausência. O painel presidencial da unidade continua sujeito ao próprio estado |
| Falha de rede | A tentativa atual falhou. A última versão válida, se existir, permanece na tela com aviso |
| Última versão válida com aviso de desatualização | Os números continuam visíveis e o aviso diz que a atualidade dos dados excedeu o esperado |

Dados simulados, quando o contrato os identificar, aparecem com marcação visível. Não se misturam visualmente com o ambiente oficial.

A indicação de atualização usa os horários do contrato: origem, coleta e publicação. Não usa apenas o relógio do momento em que o navegador terminou o download.

## Regras de apresentação

- Ausência de dados não vira, em silêncio, zero voto.
- Liderança parcial não é eleição confirmada. O site não declara vencedor.
- Texto vindo da origem é texto. Não é HTML inserido na página.
- Cor não é o único meio de distinguir candidatos ou de mostrar que a unidade está selecionada.
- O mapa e uma lista textual das unidades oferecem a mesma escolha. A lista é o caminho para teclado e leitor de tela.
- A visão Brasil e a unidade selecionada permanecem utilizáveis em tela estreita. O mapa pode ceder espaço; a escolha da unidade, não.

Esses comportamentos estão planejados. A tela atual não os implementa.

## Polling

**Planejado.** O navegador consulta somente a nossa camada pública de resultados.

- Não dispara outra requisição enquanto a anterior não terminou.
- Espalha as consultas dos visitantes com uma pequena variação de intervalo, para que os clientes não batam no mesmo instante.
- Avalia reduzir ou pausar a consulta quando a aba estiver em segundo plano.
- Mantém o último resultado válido durante a falha.
- Quando o manifesto indicar outra versão, busca os arquivos daquela versão.
- Não acrescenta parâmetro aleatório à URL para furar o cache.

Os intervalos dependem do orçamento de atualização e dos testes. Não há número adotado. O polling do navegador é independente do intervalo do coletor: um fala com a CDN; o outro, com o TSE.

## O que fica de fora da tela inicial

Senado, deputados, municípios, login de visitante, projeção estatística e qualquer biblioteca nova sem necessidade demonstrada. Uma URL compartilhável por unidade da Federação seria uma decisão própria, se o produto a pedir. Não escolhe, por si só, um roteador.

## Referências

Consultadas em 14 de outubro de 2026:

- Cloudflare Workers Static Assets: <https://developers.cloudflare.com/workers/static-assets/>
- Cloudflare, React e Vite em Workers: <https://developers.cloudflare.com/workers/framework-guides/web-apps/react/>
- Cloudflare, desenvolvimento local de Workers, página com atualização indicada em 20 de agosto de 2026. Aplica-se quando houver configuração de Worker; o frontend de hoje ainda usa o Vite do repositório: <https://developers.cloudflare.com/workers/local-development/>

[Voltar ao contexto](../contexto.md)
