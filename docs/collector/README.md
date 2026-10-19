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

Implementação: `apps/collector/src/publication/` (`publish.ts`, `read.ts`, `storage.ts`, `error.ts`), CLI em `src/cli.ts`, textos e limites em `src/constants.ts`. Contrato: [Manifesto](../dados/contrato.md#manifesto-recorte-do-publicador-local) (DA-22). Recorte: o documento é só o envelope, sem payload eleitoral, com `environment` `local`.

Comandos, na raiz, depois de `nvm use`. Cada um compila o coletor e roda o JavaScript de `dist`:

```sh
pnpm collector:demo --out .publicacao-local
pnpm collector:publish --out .publicacao-local --channel <canal> --input <arquivo.json>
pnpm collector:inspect --out .publicacao-local --channel <canal>
node apps/collector/dist/main.js --help
```

Sem argumentos, o coletor só mostra a ajuda. `demo` cria um diretório novo `eleicoes-demo-*` a cada execução e nunca apaga os anteriores. `.publicacao-local/` está no `.gitignore`. Códigos de saída: 0 sucesso, 1 falha da operação, 2 uso incorreto. O resultado sai em JSON. Erro sai como `CÓDIGO: mensagem`, por exemplo `CHANNEL_LOCKED: …`.

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
