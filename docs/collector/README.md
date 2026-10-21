# Coletor

[Voltar ao contexto](../contexto.md)

O coletor é o único processo que consulta a origem oficial, transforma a resposta no contrato interno e publica snapshots. Ele não atende o navegador do visitante e não é um servidor público de leitura.

**Implementado:** `apps/collector` é o pacote `@eleicoes/collector`. `src/main.ts` compõe a CLI da publicação local. O desenvolvimento usa `tsx`. Depois do build, `pnpm --filter @eleicoes/collector start` executa `dist/main.js` com Node.js. Não há coleta, cliente HTTP, agendamento nem Docker.

**Planejado:** as responsabilidades e as etapas abaixo. Os rótulos de estado estão em [contexto.md](../contexto.md). O contrato conceitual está em [dados/README.md](../dados/README.md). A execução em nuvem está em [infraestrutura/README.md](../infraestrutura/README.md). A organização do código novo está em [padroes-de-desenvolvimento.md](padroes-de-desenvolvimento.md), sem NestJS e sem mudar as regras desta página.

## Responsabilidade

- Consultar somente as fontes oficiais necessárias aos painéis.
- Validar a resposta antes de confiar nela.
- Normalizar os dados para o contrato compartilhado, sem repassar o formato bruto do TSE ao frontend.
- Produzir snapshots.
- Publicar uma versão nova só quando os arquivos exigidos estiverem disponíveis.
- Preservar o último conjunto válido quando a coleta ou a publicação falhar.
- Registrar falha e a atualidade dos dados, sem gravar segredo em log.

## Etapas

A ordem é deliberada. Cada etapa só começa quando a anterior tiver uma prova, descrita em [testes/README.md](../testes/README.md).

1. **Execução local com amostras.** O processo roda na máquina de desenvolvimento, lê arquivos de exemplo identificados e grava um snapshot local. Ainda não fala com o TSE.
2. **Consulta controlada à origem oficial.** Uma execução autorizada, com poucas requisições, confirma URL, código e formato. Não é um loop de produção e não é teste de carga.
3. **Publicação em armazenamento local.** O coletor passa a gerar versões em disco, com manifesto e preservação da versão anterior.
4. **Publicação no R2 a partir do computador.** O mesmo publicador envia a versão para o bucket de homologação. A AWS ainda não entra.
5. **Execução em Docker.** A imagem reproduz a coleta local. Ainda não há Dockerfile no repositório.
6. **Operação contínua na AWS.** Uma instância EC2 executa o container e publica sem intervenção manual. O destino do coletor permanece EC2 com Docker. Ele não será convertido em Worker.

## Configuração

As variáveis ainda não existem. Os `.env.example` só anunciam que serão definidas depois. Quando forem criadas, a configuração precisa cobrir pelo menos:

- ambiente de destino nosso (local, homologação ou produção) e ambiente do TSE (oficial ou simulado), sempre separados;
- eleição, turno e cargos abrangidos, lidos da configuração oficial, não de uma lista fixa neste repositório;
- diretório local ou bucket e prefixo de publicação;
- timeout, concorrência máxima e intervalo entre ciclos;
- limite de tamanho da resposta e quantidade máxima de novas tentativas.

**Pendente:** todos os valores numéricos. Este documento não fixa intervalo, timeout nem concorrência. O TSE informa um limite de 100 requisições por segundo por IP e bloqueio de 10 minutos se o limite for ultrapassado; uma nova tentativa antes do fim reinicia a contagem do bloqueio. Esse número é teto da origem, não meta nossa. O intervalo recomendado de polling ainda não foi publicado pelo TSE.

## Disciplina de coleta

- Os destinos saem de uma allowlist de hosts oficiais. O coletor não monta URL a partir de texto livre e não recebe endereço escolhido pelo visitante.
- Códigos e caminhos vêm da configuração confirmada. URL improvisada gera 404, e 404 repetido pode bloquear o IP. O limiar desse bloqueio não foi publicado.
- Há no máximo um ciclo em andamento. Outro disparo durante o ciclo ativo é ignorado ou adiado.
- Timeout encerra a espera. A resposta acima do tamanho máximo é descartada.
- Nova tentativa usa espera progressiva e uma pequena variação aleatória. A tentativa para diante de bloqueio, em vez de martelar a origem até a janela reiniciar.
- Redirecionamento para outro host não é seguido. **Proposta:** tratar redirecionamento como falha até a origem documentar outro comportamento.
- Depois de um reinício, o processo não publica um snapshot vazio. A versão já publicada continua valendo até que uma coleta completa a substitua.
- Log registra etapa, identificador da versão, código HTTP e tempos. Não registra credencial, token nem cabeçalho de autorização.

Uma coleta bem-sucedida prova que obtivemos uma resposta aceitável. Não prova que a origem tenha mudado a apuração desde o ciclo anterior.

## Três horários

| Horário                       | O que representa                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Horário informado pela origem | Instante que o arquivo oficial atribui à totalização ou à geração, quando esse campo existir e tiver sido compreendido |
| Horário de coleta             | Instante em que o coletor recebeu a resposta                                                                           |
| Horário de publicação         | Instante em que a versão ficou endereçada pelo manifesto                                                               |

O frontend deve mostrar a atualidade dos dados, não o instante em que o navegador fez o download. Por isso os três horários permanecem distintos no contrato. A semântica exata dos campos de data do TSE está pendente da especificação.

## Publicação

O publicador **local** está implementado (ver [Publicação local](#publicação-local)). O manifesto chama-se `manifest.json`, por canal. A publicação no R2 não existe.

A ordem da publicação:

1. Gerar os arquivos da versão com identificador próprio. O identificador não é reaproveitado.
2. Publicar todos os arquivos exigidos por aquela versão.
3. Conferir se esses arquivos estão legíveis e completos.
4. Só então atualizar o manifesto para apontar para a versão.
5. Se qualquer passo falhar, o manifesto permanece na versão anterior.
6. Manter as versões que clientes ou caches ainda possam referenciar. O prazo de retenção está pendente.
7. Registrar erro à parte. Erro não ocupa o lugar de um resultado eleitoral.

O manifesto é o único ponteiro móvel. Os arquivos de uma versão publicada não mudam. Cache longo combina com arquivo imutável; o manifesto pede outra política. Os tempos estão pendentes e não são os mesmos para os dois tipos, como explica [infraestrutura/README.md](../infraestrutura/README.md).

### Publicação local

Implementação: `apps/collector/src/publication/` (`publish.ts`, `read.ts`, `storage.ts`, `error.ts`), CLI em `src/cli.ts`, textos e limites em `src/constants.ts`. Contrato: [Manifesto](../dados/contrato.md#manifesto-recorte-do-publicador-local) (DA-22). Recorte: o documento é o snapshot presidencial completo ([contrato](../dados/contrato.md#snapshot-presidencial-recorte-mínimo-19102026)), com `environment` `local`.

Comandos, na raiz, depois de `nvm use`. Cada um compila o coletor e roda o JavaScript de `dist`:

```sh
pnpm collector:president:demo [--output <pasta>]
pnpm collector:president:publish --capture <pasta da captura> --output .local/publications --channel <canal>
pnpm collector:publish --out .publicacao-local --channel <canal> --input <arquivo.json>
pnpm collector:inspect --out .publicacao-local --channel <canal>
node apps/collector/dist/main.js --help
```

Sem argumentos, o coletor só mostra a ajuda. `president-demo` cria um diretório novo `eleicoes-demo-*` a cada execução e nunca apaga os anteriores. `.publicacao-local/` está no `.gitignore`. Códigos de saída: 0 sucesso, 1 falha da operação, 2 uso incorreto. O resultado sai em JSON. Erro sai como `CÓDIGO: mensagem`, por exemplo `CHANNEL_LOCKED: …`.

Layout: `<out>/<canal>/manifest.json`, `<out>/<canal>/snapshots/<dataVersion>.json`, bloqueio `<out>/<canal>/.publish.lock`.

Garantias implementadas e testadas:

- Snapshot gravado em temporário no mesmo diretório e ligado ao nome final com `link()`, que falha se o nome existe: nunca sobrescreve, leitor nunca vê arquivo parcial.
- O snapshot é relido e validado antes de o manifesto mudar. O manifesto é trocado por último com `rename()` de um temporário.
- Falha antes da troca deixa o manifesto anterior intacto. O snapshot órfão não é promovido: republicá-lo é recusado (`historical_version`), assim como reativar uma versão histórica.
- Mesmo `dataVersion` com mesmo conteúdo (comparado depois da serialização do próprio publicador) é idempotente; com outro conteúdo, falha.
- Manifesto ilegível ou fora do contrato é erro. Canal sem manifesto mas com snapshots também: não reinicia.
- Exclusão entre processos: criação exclusiva de `.publish.lock`. Liberado nas falhas tratadas; se sobrar depois de interrupção abrupta, a publicação falha com o caminho do bloqueio e ele **não** é removido automaticamente.
- Canal validado pelo formato; diretórios abaixo de `--out` não podem ser links simbólicos; arquivos abertos com `O_NOFOLLOW`; leitura limitada a 1 MiB (limite local destes comandos, não meta dos snapshots de produção). `source.file` nunca é usado como caminho.

Não garantido: durabilidade em queda de energia (não há `fsync` do diretório) e exclusão contra processo que não usa o bloqueio.

### Captura presidencial → snapshot publicado

Implementação: `apps/collector/src/president/` (`normalize.ts` puro, `publish.ts` orquestra, `demo.ts`). Um comando por execução, sem rede:

```sh
pnpm collector:president:publish \
  --capture .local/tse/official/2026-10-19T12-56-06-722Z-1e9ccfd5 \
  --output .local/publications --channel local-oficial-presidente-br-2t
```

1. Lê `metadata.json` da captura e valida a proveniência. Oficial: `validation` `valid`, eleição, cargo e abrangência da captura, e a requisição cuja URL é a do resultado desse cargo e abrangência. Com 200 usa `result.json` da pasta. Com 304 usa a cópia indicada em `reusedCapture`, na mesma pasta de origem (gravado por `tse-once` a partir desta versão; capturas antigas com 304 são recusadas). Sintética: `source` `synthetic`, `collectedAt` declarado e aviso. Replay, captura rejeitada ou metadados insuficientes: `INVALID_CAPTURE`.
2. Reprocessa o resultado com o parser do EA20 e confere eleição e turno com os metadados.
3. Normaliza (`normalizeResult`: sem rede, disco, relógio ou UUID) e decide `available`/`pending`.
4. Captura sintética só em canal `demo-*`; oficial só fora dele (`CHANNEL_SOURCE_MISMATCH`).
5. Publica pelo publicador local. Dentro do bloqueio, compara o conteúdo com a versão atual sem `dataVersion` e `collectedAt`: igual → `unchanged`, sem UUID nem revisão novos. Diferente (inclusive com votos menores) → versão nova.
6. Relê manifesto e snapshot com o schema de leitura e imprime status, revisão, `dataVersion` e o snapshot lido.

`sourceEnvironment` vem da captura, não de argumento. `source.file` é o caminho do arquivo relativo à base do ambiente (`ele2026/6258/dados/br/br-c0001-e006258-u.json`) e não é usado como caminho local. `checkedAt` só é gravado a partir de captura oficial cujo conteúdo eleitoral não mudou (status `checked`, revisão seguinte, mesma versão); ver [contrato.md](../dados/contrato.md#horários-do-manifesto-recorte-da-dp-14).

`president-demo` usa as capturas sintéticas versionadas em `apps/collector/fixtures/president-synthetic/` (não iniciada, aguardando liberação, parcial, parcial repetida, parcial atualizada, inválida) num canal `demo-sintetico-presidente-br-2t` dentro de uma pasta `eleicoes-demo-*` nova (padrão: diretório temporário do sistema).

## Consulta ao TSE

Implementação: `apps/collector/src/tse/`. `http.ts` cuida do transporte: GET, timeout de 15 s até o fim do corpo, limite de 5 MiB, sem redirect, sem retry, só HTTPS no host exato da origem. `ea11.ts` lê a configuração, escolhe a eleição e monta a URL. `ea20.ts` faz o parser do resultado. `capture.ts` grava as capturas e `run.ts` orquestra. Os valores ficam em `src/constants.ts`.

```sh
pnpm collector:tse:once --source official --round 2 --output .local/tse [--election <código>] [--office president|governor] [--scope br|<uf>]
pnpm collector:tse:replay --input <arquivo EA20> --output .local/tse
```

- **Ordem:** uma execução faz duas requisições em sequência (configuração e resultado), com pelo menos 1 s entre os inícios.
- **Cargo e abrangência:** padrão `president`/`br`. Presidente aceita `br` ou a sigla da UF (o arquivo de UF existe, mas a eleição é escolhida pela abrangência `br` do EA11). Governador exige UF listada no EA11 para o turno. Valores fora disso são recusados antes de montar a URL.
- **Eleição:** a eleição vem da configuração. Se houver mais de uma compatível, o comando para e lista as opções para `--election`. Ele não troca de turno nem de origem. `--source simulated` é recusado enquanto o endereço do simulado não for confirmado.
- **Pastas:** cada execução cria `<output>/<origem>/<id>/` sem sobrescrever nada, com `config.json` e `result.json` (bytes recebidos), `metadata.json` (URL, status, ETag/Last-Modified, validação, origem da amostra) e `summary.json` (recorte extraído). Resposta inválida vira `result.rejected.json`.
- **Validadores:** `<output>/<origem>/last-valid.json` guarda, por URL exata, a última cópia válida e o validador HTTP dela. Só cópias validadas entram. Um 304 reaproveita essa cópia, e um 304 sem cópia é erro.
- **Replay:** `tse-replay` reprocessa um arquivo sem rede, com o mesmo parser.
- **Escopo:** o resumo é um artefato interno de integração, não um snapshot. A publicação parte da pasta da captura (`president-publish`), não do `summary.json`.

## Coleta contínua (`tse-watch`)

Implementação: `apps/collector/src/tse/watch.ts`. Desde 20/10/2026.

```sh
pnpm collector:tse:watch --source official --round 2 --output .local/tse --publications .local/publications \
  [--channel-prefix oficial] [--interval-ms 30000] [--once]
```

- **Ciclo:** baixa o EA11 (condicional) e monta os alvos a partir dele: presidente em `br` e nas 27 UFs, quando o turno tem eleição federal; governador nas UFs que o EA11 lista para o turno. Cada alvo é buscado em sequência, com 1 s entre inícios, captura própria e publicação no canal `<prefixo>-<presidente|governador>-<abrangência>-<turno>t` (ex.: `oficial-governador-df-2t`). No 2º turno de 2026 são 31 requisições por ciclo.
- **Agendamento:** o próximo ciclo só começa depois que o anterior termina e espera `--interval-ms` (padrão 30 s). Sem `setInterval`.
- **Falhas:** 403/429 interrompe o ciclo e espera 11 min antes de qualquer nova consulta (o bloqueio do TSE é de 10 min e recomeça a cada tentativa). 404 desliga o alvo até o processo reiniciar, porque 404 repetido pode bloquear o IP. Resultado inválido, timeout ou falha de publicação ficam no alvo; o ciclo segue. EA11 com falha encerra o ciclo sem alvos.
- **`checkedAt`:** captura oficial sem mudança só regrava o manifesto se o último `checkedAt` tiver 60 s ou mais (regra 8 do contrato).
- **Parada:** `SIGINT`/`SIGTERM` interrompe a espera entre ciclos ou entre requisições; uma requisição em andamento termina dentro do timeout de 15 s e uma publicação em andamento termina antes de parar. Nada fica publicado pela metade.
- **Log:** uma linha JSON por evento (`cycle_start`, `target`, `target_failed`, `target_disabled`, `cycle_end` com contagens, `wait`, `stopped`), sem corpo de resposta nem URL completa.
- **Valores:** intervalo, pausa de bloqueio e intervalo de `checkedAt` são provisórios até DP-16. `--once` executa um ciclo e sai.
- **Ver no web local:** `VITE_RESULTS_CHANNEL=oficial-presidente-br-2t ELEICOES_PUBLICATIONS_DIR=$PWD/.local/publications pnpm dev:web`. O web lê o canal nacional e, ao abrir uma UF, os canais de presidente e de governador dela.

## Um publicador

A primeira versão tem um único publicador ativo. Duas instâncias publicando ao mesmo tempo podem gravar versões entrelaçadas ou fazer o manifesto apontar para um conjunto incompleto.

Redundância ativa fica fora da primeira versão. Antes de existir uma segunda instância, é preciso uma estratégia específica de liderança e de escrita do manifesto. Até lá, a recuperação é operacional: religar o publicador único e conservar a última versão válida enquanto ele estiver parado.

## O que o coletor não faz

- Não serve HTTP para o público.
- Não reconstrói o frontend.
- Não decide vencedor.
- Não transforma ausência de arquivo em zero voto.
- Não trata redução de total como impossível: retificação oficial precisa de regra própria, ainda pendente em [dados/README.md](../dados/README.md).

## Referências

Consultadas em 14 de outubro de 2026:

- TSE, informações técnicas, inclusive limite de acesso, bloqueio, 404, ETag, 304 e uso indicativo dos arquivos de acompanhamento: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>
- Amazon EC2, conceitos de instância, grupo de segurança e capacidade: <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html>

[Voltar ao contexto](../contexto.md)
