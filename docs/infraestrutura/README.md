# Infraestrutura

[Voltar ao contexto](../contexto.md)

Esta página diz qual serviço faz o quê e em que ordem ele entra. Nenhum recurso foi criado. Não há conta, bucket, zona, instância, Dockerfile nem arquivo de Wrangler no repositório. `infra/cloudflare` só contém `.gitkeep`.

Os rótulos de estado estão em [contexto.md](../contexto.md). As decisões que justificam esta topologia estão em [arquitetura/README.md](../arquitetura/README.md).

Cloudflare Workers Static Assets substitui Cloudflare Pages como destino planejado de hospedagem do frontend. O README associava `infra/cloudflare` a Pages; a associação foi corrigida em ET-00. A pasta continua reservada, agora para a configuração futura de assets, R2 e cache.

Não entram por convenção S3, CloudFront, API Gateway, Kubernetes nem balanceador. A documentação da AWS cita Elastic Load Balancing, ECS e EKS como serviços que podem acompanhar o EC2. Eles não fazem parte da decisão inicial. O balanceador próprio está fora porque o público não lê resultados no coletor.

## Cloudflare

**Workers Static Assets** guarda e entrega os arquivos do frontend produzidos pelo Vite. O cache desses arquivos é o cache do site: HTML, JavaScript, CSS e o que mais o build gerar. A documentação diz que um arquivo encontrado é servido sem executar função. Não vamos criar uma função só para repassar o site.

**R2** guarda os snapshots e o manifesto. O bucket nasce privado. A leitura pública planejada usa um domínio nosso ligado ao bucket.

**Domínio próprio de resultados** é o endereço que o navegador usa para baixar os JSON. A documentação de cache do R2 diz que esse domínio é o que permite cache e as proteções correspondentes. O host `r2.dev` não oferece cache, WAF nem bot management, e não será caminho de produção.

**CDN** é a rede que responde a partir da cópia, quando a regra de cache permitir. É preciso criar regra para os JSON: a mesma documentação diz que JSON não é cacheado por padrão. Verificar o comportamento com o status de cache na homologação. Não presumir que o objeto no R2 já esteja na borda.

**Regras de segurança** protegem os caminhos públicos do site e dos resultados, no plano que for escolhido. O plano está pendente. O mínimo entra antes da primeira exposição, como pede [seguranca/README.md](../seguranca/README.md).

Há três caches diferentes, e eles não compartilham uma política só:

| O quê                 | Onde vive               | Política                                                                      |
| --------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| Arquivos do frontend  | Workers Static Assets   | Cache de asset estático do site. Muda quando um build novo é publicado        |
| Snapshots versionados | R2, via domínio próprio | Cache longo. O nome da versão não é reescrito                                 |
| Manifesto             | R2, via domínio próprio | Cache curto, para o polling perceber a troca de versão. O tempo está pendente |

CORS entra se o site e os resultados tiverem origens diferentes. Os domínios ainda não existem, então esta condição é a esperada até que alguém decida o contrário. A política libera a origem do frontend, no método de leitura. CORS não fecha o arquivo para o resto da internet. Depois de alterar a política, as cópias antigas não ganham os cabeçalhos novos até saírem do cache. O teste de CORS precisa enviar o cabeçalho `Origin`.

Não há Worker obrigatório no meio dessa leitura. Uma função futura, para autenticação ou transformação, seria outra decisão e outro custo de invocação.

## AWS

**EC2** é a máquina virtual que executa o coletor de forma contínua. A instância oferece a capacidade escolhida de CPU, memória e rede. Tipo, região e sistema operacional estão pendentes. A cobrança sob demanda descrita na documentação é por segundo, com mínimo de 60 segundos. Isso não fixa o preço nem autoriza a abrir a conta.

**Docker** empacota o coletor para a mesma imagem rodar no ensaio local e na instância. Não há Dockerfile ainda. A imagem não transforma o EC2 num orquestrador.

**Rede e administração.** O grupo de segurança deixa sair até o TSE e até o R2. Não abre a leitura dos resultados para a internet. **Proposta:** acesso administrativo pelo Session Manager, sem porta SSH pública. Detalhe em [seguranca/README.md](../seguranca/README.md).

**Credenciais.** A chave que publica no R2 fica na instância ou no mecanismo de segredo da AWS que for escolhido na etapa de provisionamento. O mecanismo concreto está pendente. A chave não fica na imagem, no Git nem no frontend. Homologação e produção usam chaves diferentes.

**Logs, métricas, reinício e recuperação.** O processo precisa registrar falha e atraso, e voltar depois de um reinício sem apagar a versão publicada. **Proposta:** política de reinício do container. O destino de longo prazo dos sinais é o conjunto planejado Sentry e OpenTelemetry com Grafana, sem obrigação de existir no primeiro dia e sem criar uma segunda pilha obrigatória ao lado. Até lá, o mínimo é conservar o log do coletor e saber se o processo parou ou se o dado envelheceu. Onde esse log se acumula na AWS fica pendente.

Um coletor só é um ponto de falha de atualização, não de leitura. A última versão segue na CDN.

## Ambientes

| Ambiente    | Frontend                                    | Snapshots                                      | Coletor                                                          |
| ----------- | ------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| Local       | Vite na máquina                             | Disco                                          | `pnpm dev:collector`                                             |
| Homologação | Workers Static Assets num domínio de ensaio | Bucket ou prefixo próprio, com domínio próprio | Primeiro a máquina do desenvolvedor publicando no R2; depois EC2 |
| Produção    | Workers Static Assets no domínio final      | Bucket ou prefixo próprio                      | EC2 contínuo                                                     |

Os três ainda não existem fora da máquina de desenvolvimento, e mesmo o fluxo local de snapshots não está implementado. Oficial e simulado do TSE não compartilham o prefixo de produção.

## Ordem de execução

Não é preciso terminar o mapa nem o restante do frontend para validar Cloudflare e AWS. A tela mínima basta para provar publicação e leitura.

| Etapa                                              | Trabalho de código                                                                                                             | Trabalho de infraestrutura                                                                  | Validação para avançar                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1. Documentação e validação das fontes             | Ler especificações, JWS e a resolução. Fechar as pendências de [dados/README.md](../dados/README.md) que bloqueiam URL e campo | Nenhuma conta                                                                               | Os códigos e os caminhos saem do EA11 e das instruções, não de exemplo antigo                                     |
| 2. Normalizador, coletor mínimo e snapshots locais | Validar amostras e gravar versão em disco                                                                                      | Diretório local                                                                             | Suíte local de validação, falha e preservação da versão anterior                                                  |
| 3. Tela mínima com arquivos locais                 | Consumir o contrato local, com os estados de vazio e de erro                                                                   | Nenhuma                                                                                     | A tela distingue ausência, zero e falha                                                                           |
| 4. Homologação na Cloudflare, com proteção básica  | Build do frontend já existente, se necessário ajustado para publicar                                                           | Domínio de ensaio, Workers Static Assets, bucket, domínio dos JSON, cache e proteção mínima | O site de ensaio abre. O caminho `r2.dev` não é o endereço usado                                                  |
| 5. Coletor local publica no R2, e a tela lê dali   | Cliente de publicação e URL pública no frontend de homologação                                                                 | Credencial mínima de homologação e CORS, se as origens diferirem                            | Uma versão nova aparece sem novo build do site. O cache do manifesto e o dos arquivos se comportam como as regras |
| 6. Container local                                 | Dockerfile e execução do mesmo coletor                                                                                         | Nenhum recurso AWS                                                                          | O container publica em disco ou no R2 de ensaio e sobrevive a um reinício                                         |
| 7. AWS e operação contínua                         | Nada de painel novo. Ajuste de configuração do processo                                                                        | Instância, rede, segredo, reinício e log mínimo                                             | O coletor na instância publica sozinho e a instância não serve os JSON ao público                                 |
| 8. Funcionalidades do frontend                     | Mapa, painéis, polling e acessibilidade                                                                                        | Sem serviço novo                                                                            | Os estados de [web/README.md](../web/README.md) na homologação                                                    |
| 9. Automação, monitoramento e proteção             | Workflows e sinais de falha                                                                                                    | GitHub Actions, alertas e refino das regras                                                 | Publicação repetível e aviso quando o dado envelhece ou o processo cai                                            |
| 10. Carga, recuperação e preparação da produção    | Ajustes que os testes mostrarem                                                                                                | Orçamento de carga, domínio final, credencial de produção                                   | Critérios de [testes/README.md](../testes/README.md), ainda com metas numéricas pendentes                         |

## Custo

Não há custo zero nem capacidade ilimitada. O orçamento está pendente e precisa ser lido nas tabelas vigentes da Cloudflare e da AWS antes de criar recurso. O que deve entrar na conta:

- **Computação:** horas da instância EC2 do tamanho escolhido. O coletor é um processo único e pequeno. O tipo da máquina sai dessa carga, não de um palpite de pico de audiência, porque a audiência não chega nela.
- **Armazenamento:** volume dos snapshots retidos no R2 e das imagens e logs que ficarem.
- **Operações:** quantidade de escritas a cada publicação e de leituras que não forem atendidas pelo cache.
- **Tráfego:** entrega do site e, sobretudo, dos JSON. Acerto de cache diminui a leitura no R2. Cache curto demais no manifesto faz o contrário.
- **Logs:** retenção do que o coletor e o acesso administrativo produzirem.
- **Worker:** zero invocação enquanto não existir função no caminho. Se uma função for aprovada depois, a conta passa a incluir essas execuções. Assets estáticos têm a cobrança do produto de Workers, a confirmar na tabela do plano escolhido. A seção de cobrança da página de Static Assets não foi copiada aqui.

Limites já lidos, sem virar dimensionamento: no cache da Cloudflare, planos Free, Pro e Business têm limite de 512 MB por arquivo cacheável, e o plano Enterprise parte de 5 GB. Um snapshot deste site deve ficar muito abaixo disso. O número não dispensa medir.

## Pendências de infraestrutura

Ficam sem valor inventado:

- domínios do site e dos resultados;
- região, tipo de instância e sistema;
- plano da Cloudflare;
- orçamento;
- intervalos de atualização do coletor e do polling;
- tempos de cache do manifesto e dos arquivos;
- retenção dos snapshots;
- metas de recuperação;
- metas de disponibilidade;
- ferramenta e destino final dos logs;
- cliente e método de autenticação usados pelo coletor para gravar no R2.

## Referências

Consultadas em 14 de outubro de 2026:

- Cloudflare Workers Static Assets: <https://developers.cloudflare.com/workers/static-assets/>
- Cloudflare, React e Vite em Workers: <https://developers.cloudflare.com/workers/framework-guides/web-apps/react/>
- Cloudflare, desenvolvimento local de Workers: <https://developers.cloudflare.com/workers/local-development/>
- Cloudflare, cache no R2: <https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/>
- Cloudflare, CORS no R2: <https://developers.cloudflare.com/r2/buckets/cors/>
- Cloudflare Pages, orientação de plataforma: <https://developers.cloudflare.com/pages/>
- Amazon EC2, conceitos e preços em linha geral: <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html>
- AWS Systems Manager Session Manager: <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html>

[Voltar ao contexto](../contexto.md)
