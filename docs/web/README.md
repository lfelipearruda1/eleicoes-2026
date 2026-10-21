# Web

[Voltar ao contexto](../contexto.md)

O frontend é a aplicação que o visitante abre. Ela exibe os painéis e lê os snapshots publicados. Não consulta o TSE e não fala com o EC2 do coletor.

**Implementado (19/10/2026):** `@eleicoes/web`, com React 19.3.1, React DOM 19.3.1, Vite 8.3.4, TypeScript e Tailwind CSS 4.3.3. A tela é o painel **Presidente — Brasil** de um canal local: lê o manifesto e o snapshot por HTTP, valida com `readManifestSchema` e `readPresidentialSnapshotSchema`, mostra `pending` e `available` e se atualiza sem recarregar. Não há mapa, UF, governador, rota nem biblioteca de estado além do React. Evidência: [ET-06.md](../planejamento/evidencias/ET-06.md).

## Referência visual vigente

O protótipo `Eleicoes-2026 v2.dc.html` (pasta "Protótipos Eleições 2026", fornecida pelo usuário, fora do repositório) é a referência de layout, cores e comportamento: fundo `#0a0a0a`, mapa do Brasil à esquerda, painel do resultado à direita, alternância Mapa/Lista, seletor de UF e rota por hash (`#/uf/SP`). Ele substitui o `DESIGN-mobbin.md` usado antes. Divergência registrada em 20/10/2026: o `DESIGN-mobbin.md` (tema claro) voltou a ser fornecido em conversa, mas o repositório continua indicando o protótipo v2 como vigente; a tela segue escura e os avisos novos (configuração ausente, atualidade) reutilizam os componentes e tokens atuais. Trocar de tema é decisão a registrar antes, não efeito de incremento funcional. A geometria do mapa veio de `data/br-map.js` do mesmo protótipo (`apps/web/src/features/map/brazil-map.json`); a fonte cartográfica original continua sem registro.

Implementação:

- **Estilos:** um CSS Module por componente (`*.module.css`), escrito com `@apply` do Tailwind 4 e `@reference` a `src/index.css`, que concentra os tokens do protótipo no `@theme`. Paleta, sombras e fontes padrão do Tailwind são removidas. Nenhum atributo `style` no JSX; larguras de barras e posição do tooltip são atributos SVG.
- **Ícones:** `lucide-react` 1.59.0 (seta, chevron do seletor, indicadores de estado). **Fonte:** Inter variável, auto-hospedada por `@fontsource-variable/inter` 5.3.0, como a Inter do protótipo, sem Google Fonts.

Diferenças em relação ao protótipo, por falta de dado no contrato:

- **Mapa e lista:** não há resultado por UF. As 27 UFs aparecem como "Indisponível" (hachura do protótipo); a lista mostra "Indisp."; abrir uma UF mostra "Dados indisponíveis nesta demonstração." para presidente e governador.
- **Cores:** vermelho e azul do protótipo vão para a 1ª e a 2ª candidatura na ordem do contrato (`candidateId`); demais em cinza. Não dependem do nome.
- **Círculo da candidatura:** sem a palavra "Foto", porque o contrato não tem fotos. Quem tem mais votos recebe o anel cheio do protótipo; não há selo de eleito.
- **Diferença em p.p.:** subtração exata dos percentuais publicados, descrita como "nos votos a candidaturas concorrentes" (a base do contrato), não "votos válidos".
- **Horário "Dados da apuração":** hora e data da origem como recebidas (`totalizedAt` ou `generatedAt`), sem conversão de fuso.
- **Rodapé:** o seletor "Cenário do protótipo" não existe; no lugar ficam o aviso de proveniência ("Demonstração — dados fictícios, sem valor oficial."), os horários de publicação (`current.publishedAt`) e de coleta (`collectedAt`) em horário de Brasília, a fonte e a "Última leitura pelo navegador" (hora em que o navegador leu o manifesto; não é verificação da origem). Quando o manifesto trouxer `checkedAt`, aparece também "Verificação da origem".
- **Aviso no painel:** o mesmo aviso de proveniência aparece numa cápsula logo abaixo de "Brasil", para não ficar só no rodapé no celular.
- **Andamento:** com totalização em andamento, o indicador diz "Apuração em andamento · dados de hh:mm · dd/mm/aaaa", com a hora da origem como recebida (fuso não confirmado).
- **Tooltip:** desenhado dentro do SVG, ancorado no centro da UF, em vez de seguir o ponteiro.
- **"Verificando atualizações."** aparece só no "Tentar novamente"; o polling de 5 s não muda o indicador.

## Execução local

```sh
nvm use   # Node 24.22.0
pnpm collector:president:publish --capture apps/collector/fixtures/president-synthetic/01-nao-iniciada \
  --output .local/publications --channel demo-sintetico-presidente-br-2t
pnpm dev:web   # http://127.0.0.1:5173/
```

Para uma demonstração sem resíduo de sessões anteriores, use uma raiz nova e aponte o servidor para ela:

```sh
mkdir -p .local/et06/publications
pnpm --filter "@eleicoes/collector..." run build
node apps/collector/dist/main.js president-publish --capture apps/collector/fixtures/president-synthetic/01-nao-iniciada \
  --output .local/et06/publications --channel demo-sintetico-presidente-br-2t
ELEICOES_PUBLICATIONS_DIR="$PWD/.local/et06/publications" pnpm dev:web
```

Uma ponte do servidor de desenvolvimento (`apps/web/vite/publications.ts`) serve **só** `/publications/manifest.json` e `/publications/snapshots/<uuid v4>.json` do canal configurado, lidos do disco a cada requisição: `GET`/`HEAD`, sem listagem, sem link simbólico, até 1 MiB, `Cache-Control: no-store`. Variáveis lidas só pelo servidor (sem prefixo `VITE_`): `ELEICOES_PUBLICATIONS_DIR` (padrão `.local/publications`) e `ELEICOES_CHANNEL` (padrão `demo-sintetico-presidente-br-2t`). O servidor escuta em `127.0.0.1`, e `server.fs.allow` restringe o `/@fs/` do Vite a `apps/web`, `packages` e `node_modules`, com `.local/` negado. A ponte não existe no `vite build` nem no `vite preview`.

Publicar outra fixture (`02-aguardando-liberacao`, `03-parcial`, `04-parcial-atualizada`) muda a tela em até ~5 s, sem recarregar. Se o manifesto subir de revisão mantendo a mesma `dataVersion`, a tela reaproveita o snapshot já validado, sem baixá-lo de novo. O polling de 5 s após o fim da tentativa anterior é escolha da demonstração local, não intervalo de produção; pausa com a aba oculta e retoma ao voltar.

## Origem dos resultados no build

`apps/web/src/features/president/resultsConfig.ts` lê e valida a configuração uma vez, na partida. Os valores locais ficam em `apps/web/.env` (ignorado pelo git; modelo em `.env.example`), que o Vite carrega no `dev` e no `build`; `vite.config.ts` lê `ELEICOES_*` do mesmo arquivo com `loadEnv`, e variável de ambiente do shell tem precedência. As variáveis `VITE_*` são **incorporadas no JavaScript no momento do build** e são públicas: mudar a base, o canal ou o limiar exige outro build. Não há configuração remota nem reescrita do bundle.

| Variável                       | Desenvolvimento (`pnpm dev:web`)                    | Build (`vite build`)   | Validação                                                                                                                                                                                                         |
| ------------------------------ | --------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_RESULTS_BASE_URL`        | Vazia ou só espaços: ponte `/publications/` do Vite | Obrigatória            | URL absoluta; `https`; `http` só com página e dados nos hosts de `VITE_RESULTS_LOOPBACK_HOSTS`; sem usuário/senha, query ou fragmento; nunca domínio de `VITE_RESULTS_BLOCKED_DOMAINS`. Barra final é normalizada |
| `VITE_RESULTS_CHANNEL`         | Ignorada sem base (a ponte usa `ELEICOES_CHANNEL`)  | Obrigatória com a base | Mesmo padrão do contrato (`channelSchema`). O manifesto lido precisa ter o mesmo `channel`                                                                                                                        |
| `VITE_RESULTS_STALE_AFTER_MS`  | Vazia: 120000 (valor local, não meta de produção)   | Obrigatória            | Inteiro decimal positivo e seguro; recusa `0`, negativos, frações, `1e3`, `0x10`, `NaN`, `Infinity` e texto parcial                                                                                               |
| `VITE_RESULTS_LOOPBACK_HOSTS`  | Lista de hosts (`127.0.0.1,[::1]` no `.env` local)  | Opcional               | Só hosts, sem esquema, porta ou caminho. Vazia: `http` nunca é aceito. Nenhum host de loopback fica fixo no código                                                                                                |
| `VITE_RESULTS_BLOCKED_DOMAINS` | Lista de domínios (`tse.jus.br` no `.env` local)    | Obrigatória com a base | Bloqueia o domínio e os subdomínios; o domínio do TSE não fica fixo no código                                                                                                                                     |

URLs lidas: `<base>/<canal>/manifest.json` e `<base>/<canal>/snapshots/<dataVersion>.json`, montadas com `new URL` e conferidas por `resolveInChannel` (mesma origem, dentro do diretório do canal, sem query, fragmento ou credencial). O `fetch` usa `mode: 'cors'`, `credentials: 'omit'`, `redirect: 'error'` e `cache: 'no-store'`. Se a origem dos dados for outra, ela precisa responder CORS para a origem exata do site.

Build sem base ou sem limiar mostra "Origem dos resultados não configurada", lista o que falta e **não faz nenhuma requisição**. Esse `dist` serve para verificar compilação; não é entregável. Build configurado para demonstração local:

```sh
pnpm --filter "@eleicoes/collector..." run build
node apps/collector/dist/main.js president-publish --capture apps/collector/fixtures/president-synthetic/03-parcial \
  --output /tmp/et06-demo/publications --channel demo-sintetico-presidente-br-2t
cd apps/web
VITE_RESULTS_BASE_URL=http://127.0.0.1:4174/ VITE_RESULTS_CHANNEL=demo-sintetico-presidente-br-2t \
  VITE_RESULTS_STALE_AFTER_MS=15000 VITE_RESULTS_LOOPBACK_HOSTS=127.0.0.1 \
  VITE_RESULTS_BLOCKED_DOMAINS=tse.jus.br npx vite build --outDir /tmp/et06-demo/web-dist --emptyOutDir
```

Sirva `web-dist` em `127.0.0.1:4173` e `publications` em `127.0.0.1:4174` com `Access-Control-Allow-Origin: http://127.0.0.1:4173`. Use um diretório fora de `apps/web/dist` para não confundir o build de demonstração com o build padrão.

## Atualidade dos dados

`apps/web/src/features/president/freshness.ts` avalia, sem efeito colateral, o conjunto aceito contra um instante e um limiar:

1. `checkedAt` do manifesto, se existir: última verificação válida da origem (DA-21). Não significa voto novo.
2. Sem `checkedAt`: `collectedAt` do snapshot, a última coleta conhecida.
3. `publishedAt` só é exibido; republicar uma captura antiga não a torna recente. A hora em que o navegador leu o manifesto não renova nada. `generatedAt`/`totalizedAt` da origem não entram (fuso não confirmado) e `sourceTime` ausente não é criado.
4. Idade ≥ limiar: aviso. Referência à frente do relógio do dispositivo: "não foi possível confirmar a atualidade", sem tratar como recente e sem corrigir fuso.

| Situação                         | Texto                                                                                                                    | Papel    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| `checkedAt` antigo               | "Sem verificação recente da origem. Exibindo o último resultado disponível."                                             | `status` |
| Sem `checkedAt`, coleta antiga   | "A última coleta registrada ocorreu há mais de X. Não há confirmação de atualização posterior." (X = limiar)             | `status` |
| Referência no futuro             | "Não foi possível confirmar a atualidade dos dados: o horário de referência está à frente do relógio deste dispositivo." | `status` |
| Falha de comunicação ou rejeição | "Não foi possível consultar os resultados. Exibindo a última versão válida." + "Tentar novamente"                        | `alert`  |

Disponibilidade (`pending`/`available`), atualidade e comunicação são independentes: os dois avisos podem coexistir, nenhum altera `availability`, os números, o indicador "Aguardando…"/"Apuração concluída" ou a UF aberta. Recuperar a comunicação remove só o alerta. O texto não muda a cada segundo (só ao cruzar o limiar), e o navegador não afirma que o TSE ou o coletor pararam.

O relógio fica em `usePublication`: um único temporizador agendado para o próximo instante em que o estado muda (no máximo 60 s), recálculo ao fim de cada leitura e ao voltar de aba oculta, limpo ao desmontar. O polling continua em 5 s.

A avaliação usa o relógio do dispositivo do visitante. Relógio errado produz aviso errado; é indicação operacional, não garantia de segurança nem prova de que os números estão errados ou de que a apuração terminou. As fixtures sintéticas versionadas têm `collectedAt` em 25/10/2026; antes dessa data a tela mostra o aviso de relógio.

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

| Estado                                           | O que o visitante percebe                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Carregamento                                     | Ainda não há conteúdo utilizável desta tentativa. Não preencher votos com zero enquanto espera                 |
| Dados disponíveis                                | Painéis preenchidos com a versão indicada pelo manifesto                                                       |
| Dados ainda não disponíveis                      | A apuração ou o arquivo ainda não existe. O vazio permanece vazio                                              |
| Nenhuma disputa de governador naquela unidade    | O painel de governador explica a ausência. O painel presidencial da unidade continua sujeito ao próprio estado |
| Falha de rede                                    | A tentativa atual falhou. A última versão válida, se existir, permanece na tela com aviso                      |
| Última versão válida com aviso de desatualização | Os números continuam visíveis e o aviso diz que a atualidade dos dados excedeu o esperado                      |

Dados simulados, quando o contrato os identificar, aparecem com marcação visível. Não se misturam visualmente com o ambiente oficial.

A indicação de atualização usa os horários do contrato: origem, coleta e publicação. Não usa apenas o relógio do momento em que o navegador terminou o download.

## Regras de apresentação

- Ausência de dados não vira, em silêncio, zero voto.
- Liderança parcial não é eleição confirmada. O site não declara vencedor.
- Texto vindo da origem é texto. Não é HTML inserido na página.
- Cor não é o único meio de distinguir candidatos ou de mostrar que a unidade está selecionada.
- O mapa e uma lista textual das unidades oferecem a mesma escolha. A lista é o caminho para teclado e leitor de tela.
- A visão Brasil e a unidade selecionada permanecem utilizáveis em tela estreita. O mapa pode ceder espaço; a escolha da unidade, não.

O painel presidencial nacional implementa os itens sem mapa. Mapa, lista de UFs e governador continuam planejados.

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
