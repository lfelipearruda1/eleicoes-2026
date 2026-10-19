# Testes

[Voltar ao contexto](../contexto.md)

A suíte funcional não existe. Na raiz, `pnpm test` roda Vitest 5.0.4 uma vez, com `--passWithNoTests`. Esse flag faz o comando passar quando não há testes. Não é evidência de cobertura. `tests/load` só contém `.gitkeep`. Não há teste de ponta a ponta, não há k6 instalado no repositório e não há Supertest, porque não há API.

Esta página não cria testes. Ela separa o que pode ser provado na máquina do que depende de nuvem, e diz o que precisa passar antes de avançar na ordem de [infraestrutura/README.md](../infraestrutura/README.md).

A forma dos testes unitários está em [unitarios-aaa.md](unitarios-aaa.md). O nível certo para cada garantia de segurança está em [seguranca.md](seguranca.md). Os exemplos desses dois arquivos são documentação e não foram executados.

Os rótulos de estado estão em [contexto.md](../contexto.md). Metas numéricas de latência, erro, visitantes e recuperação estão pendentes. Onde um critério aparece sem número, a aprovação é qualitativa até o orçamento definir o número.

## Ferramentas

| Ferramenta                          | Papel                                                                                           | Estado                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Vitest                              | Testes de validação, normalização, publicação em disco e comportamento que couber na ferramenta | Configurada. Primeira suíte: `packages/validation/testes/units/envelope.spec.ts` (ET-03-T03). `pnpm test` falha sem testes |
| k6                                  | Carga contra a nossa infraestrutura autorizada                                                  | Prevista. Não instalada e não executada                                                                                    |
| Teste de ponta a ponta no navegador | Percurso do visitante                                                                           | Pendente. Não há ferramenta escolhida no repositório                                                                       |
| Supertest                           | HTTP de uma API Node                                                                            | Só se uma API compatível for introduzida. Fora da primeira versão                                                          |

Amostras oficiais entram identificadas pela eleição, pelo arquivo e pela data em que foram obtidas. Dado sintético fica em outro diretório e com nome que não se confunda com captura oficial. Os dois não se misturam num mesmo caso sem o teste dizer qual é qual.

## O que dá para provar localmente

Planejado para o Vitest e para o container local:

- Validação e normalização do contrato, com campo ausente, campo extra e número fora do esperado.
- Amostras oficiais identificadas e dados sintéticos separados.
- Evolução simulada da apuração: versões sucessivas em que votos e andamento mudam, e uma versão em que a origem não mudou.
- Timeout, corpo grande demais e resposta inválida. Nesses casos não nasce snapshot.
- Falha no meio do ciclo e recuperação depois do reinício, sem publicar conjunto vazio.
- Publicação incompleta: falta um arquivo exigido e o manifesto não muda.
- Preservação da versão anterior quando a nova falha.
- Leitura consistente: quem segue o manifesto vê só arquivos daquela versão.
- Ausência diferente de zero voto, e total que diminui tratado como caso de retificação, não como descarte automático.
- Ambiente oficial e simulado não saem pelo mesmo destino.
- Interface: carregamento, dado disponível, dado indisponível, unidade sem governador, falha de rede e última versão com aviso de desatualização.
- Polling: sem pedido sobreposto, sem parâmetro aleatório na URL, conserva o último quadro na falha e só busca a versão nova quando o manifesto muda.
- Container: sobe, publica e, depois de morto, sobe de novo sem apagar a versão boa.

O frontend de hoje ainda não tem esses estados. O teste de interface espera a tela mínima da etapa 3 e cresce na etapa 8. Não se declara a tela pronta porque o Vite compila o título inicial.

## O que depende de homologação

Planejado, na infraestrutura real de ensaio:

- Publicar no R2 a partir do coletor e ler pelo domínio próprio.
- Cache vazio e cache já preenchido, com leitura do status de cache. JSON sem regra específica não conta como sucesso.
- Troca do manifesto visível dentro da política curta, e arquivo versionado estável na política longa.
- CORS com o cabeçalho `Origin` da origem do site, e ausência desse cabeçalho num cliente que não é navegador.
- Regras de segurança ligadas, inclusive a confirmação de que o caminho alternativo (`r2.dev` ou equivalente) não contorna proteção e cache.
- Coletor na AWS volta depois de reinício e a instância não responde os JSON na porta pública.
- Alerta quando o processo cai e quando o dado passa do atraso aceitável. O limiar do atraso está pendente.
- Retorno a uma versão anterior pelo manifesto, no roteiro de incidente de [seguranca/README.md](../seguranca/README.md).
- Carga e leitura de custo durante o ensaio, não depois, em produção, por surpresa.

## Carga

Não executar carga contra o TSE. O limite publicado de 100 requisições por segundo por IP, com bloqueio de 10 minutos, já torna esse ensaio um incidente na origem. Carga usa somente a nossa infraestrutura autorizada: o domínio de homologação dos resultados e, se o teste for do site, o domínio de homologação do frontend.

Antes de disparar:

- teto de orçamento e condição de interrupção escritos;
- quem observa o gerador de carga, não só o alvo;
- separação entre visitantes simultâneos, requisições por segundo e volume de bytes;
- medição de acerto de cache, de pedidos que chegam ao armazenamento, de latência e de erros.

Um teste na máquina local não autoriza a frase de que o sistema aguenta milhões de visitantes. O número que a homologação mostrar vale para o cenário medido: tamanho da resposta, regra de cache, região e duração. Extrapolação pede outro ensaio, ou fica explícita como conta, não como fato.

k6 é a ferramenta prevista para esse ensaio. O script ainda não existe e não deve ser apontado ao TSE nem de brincadeira.

## Critérios para avançar

| Etapa                             | Aprovação nesta fase                                                                        | Número ainda pendente                       |
| --------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Fontes                            | URLs e códigos conferidos no EA11 vigente e nas instruções de 2026                          | Nenhum intervalo                            |
| Normalizador local                | Casos de ausência, zero, inválido, retificação e versão anterior passam no Vitest           | Precisão decimal, até a especificação       |
| Tela mínima                       | Os estados de vazio e de falha aparecem com arquivos locais                                 | Nenhum                                      |
| Cloudflare de ensaio              | Site no ar, JSON pelo domínio próprio, `r2.dev` fora do caminho, proteção básica ligada     | Plano e tempos de cache                     |
| Publicação a partir do computador | Nova versão visível sem rebuild do frontend. Manifesto e arquivo com caches distintos       | TTL                                         |
| Docker local                      | Reinício conserva a versão                                                                  | Política exata de reinício                  |
| AWS                               | Publicação contínua e instância fechada à leitura pública                                   | Região, tipo e meta de recuperação          |
| Frontend completo                 | Mapa, painéis, polling e acessibilidade no ensaio                                           | Intervalo de polling                        |
| Automação e alerta                | Workflow repete o que a máquina já fez. Alerta de parada e de atraso dispara num ensaio     | Limiar de atraso e canal do alerta          |
| Carga e produção                  | Metas de cache, erro e custo cumpridas no ambiente autorizado. Roteiro de retorno executado | Visitantes, RPS, latência, erro e orçamento |

Enquanto a célula de número estiver pendente, a etapa pode ser preparada, e não pode ser anunciada como capacidade comprovada.

## Referências

Consultadas em 14 de outubro de 2026:

- TSE, limite de acesso, bloqueio e 404, que fundamentam a proibição de carga contra a origem: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>
- Cloudflare, cache no R2, para o critério de status de cache e a exclusão do `r2.dev`: <https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/>
- Cloudflare, CORS no R2, para o critério do cabeçalho `Origin`: <https://developers.cloudflare.com/r2/buckets/cors/>

[Voltar ao contexto](../contexto.md)
