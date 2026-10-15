# Dados e integração com o TSE

[Voltar ao contexto](../contexto.md)

Este é o documento do contrato compartilhado e da origem oficial. O coletor produz o contrato. O frontend só lê o contrato. Nenhum dos dois inventa campo que a especificação ainda não tenha confirmado.

Não há schema Zod, tipo de domínio nem arquivo de amostra no repositório. `packages/validation` declara Zod 4.6.7 e exporta um módulo vazio. `packages/types` e `packages/election-data` também estão vazios. Esta tarefa não cria esses artefatos.

Consultas SQL e transações, só se PostgreSQL for introduzido: [consultas-e-transacoes.md](consultas-e-transacoes.md). Banco não faz parte da primeira versão. A publicação atual continua sendo arquivo.

Os rótulos de estado estão em [contexto.md](../contexto.md).

## O que foi consultado e o que não foi

Em 14 de outubro de 2026 foi lida a página de informações técnicas da divulgação de 2026 e o índice dos arquivos em `divulgacao-de-resultados`. Não foram lidos os PDFs de especificação campo a campo, o manual de verificação JWS nem o texto da Resolução TSE nº 23.751/2026. O que depende dessas leituras permanece pendente. O conteúdo abaixo não completa essa lacuna por semelhança com eleições anteriores.

A própria página do TSE diz que o modelo será bastante parecido com o da eleição anterior e que a documentação vigente é a referência. Exemplo de outro pleito não valida o segundo turno de 2026.

## Origem

A divulgação ao vivo que nos interessa é feita de arquivos JSON, obtidos por solução própria, dentro dos limites publicados e dos artigos 264 a 269 da Resolução TSE nº 23.751, de 26 de fevereiro de 2026. O teor desses artigos não foi lido aqui. O FAQ da mesma página diz que não é necessário cadastro, autorização ou convênio, e que não há whitelist de IP. Também diz que cada consumidor pode usar só os arquivos do seu interesse.

O portal de dados abertos é outra coleção. Não é a fonte dos snapshots ao vivo.

Há dois ambientes do TSE, e eles não se misturam:

| Ambiente | O que a página publica | Uso neste projeto |
| --- | --- | --- |
| Oficial | URL base `https://resultados.tse.jus.br` e valor de ambiente `oficial` | Fonte da produção, depois de confirmados ciclo e caminhos no arquivo de configuração |
| Simulado | No corpo da página, URL base `https://resultados-sim.tse.jus.br/simulado` e ambiente `simulado2026`, com exemplos de URL | Somente ensaio, se a disponibilidade for confirmada. Nunca no domínio público de produção |

Há um desencontro na própria página, e ele fica registrado. O corpo publica exemplos do simulado. Um item do FAQ ainda responde que a URL dos simulados será divulgada oportunamente. Outra frase, na seção de simulados, diz que os códigos de produção seriam publicados oportunamente, enquanto a seção de ambiente oficial já lista códigos. Até a etapa de consulta controlada, a seção de ambiente oficial é a referência dos identificadores, e os exemplos de simulado não são contrato de produção.

Os simulados descritos na página ocorreram em setembro de 2026. Na data desta consulta essa janela já tinha passado. Não se assume que o host de simulado continue respondendo.

## Arquivos e painéis

A página técnica nomeia os arquivos de divulgação. Para a primeira versão interessam quatro:

| Arquivo | Finalidade publicada pelo TSE | Relação com os painéis |
| --- | --- | --- |
| EA11 | Configuração de eleições | Descobrir quais eleições, cargos e códigos existem. Não é painel |
| EA14 | Acompanhamento Brasil | Sinal de atualização nas unidades da Federação, para orientar a leitura dos resultados |
| EA15 | Acompanhamento UF | Sinal de atualização dos municípios de uma unidade. Só entra na coleta se a especificação mostrar que o painel estadual depende dele |
| EA20 | Resultado unificado | Fonte dos votos e do andamento exibidos nos painéis presidenciais e, quando couber, de governador |

O FAQ afirma que EA14 e EA15 podem orientar consultas ao EA20. As datas e horas de totalização são um forte indicativo, não uma prova de que todos os arquivos já reflitam a mesma geração. Os arquivos nascem em paralelo e depois são sincronizados na CDN. Pode haver diferença entre o acompanhamento e o resultado. Consistência da nossa publicação também não significa que todos os arquivos do TSE tenham sido gerados no mesmo instante.

O FAQ diz que não haverá arquivo de índice para descobrir o que mudou. ETag e Last-Modified existem, e uma resposta 304 entra na conta do limite de requisições. **Proposta:** o coletor pode usar validação condicional para poupar transferência, sem tratar 304 como pedido gratuito.

Também existem EA10 (eleitos), EA12 (municípios), EA16 (seções) e EA18 (auxiliar de seção). Ficam fora dos painéis iniciais. Senado, deputado e município estão fora do escopo. EA10 não nos autoriza a declarar vencedor; a primeira versão mostra votos, percentuais e andamento.

A página cita nomes como `ele-c.json` para a configuração e sufixos como `-ab.json` e `-u.json` nos exemplos e no FAQ. São pistas de nomenclatura, não um mapa completo de URLs de produção. O FAQ diz que ciclo e demais parâmetros de caminho saem de `ele-c.json`. Códigos e URLs do coletor só serão fixados depois dessa confirmação.

### Identificadores publicados para o ambiente oficial

A página lista, para 25 de outubro de 2026, o pleito 3221 do segundo turno, com o código 6258 para a Eleição Geral Federal e o código 6260 para as Eleições Gerais Estaduais 2026. O primeiro turno aparece em 4 de outubro de 2026, pleito 3220, com os códigos 6257 (federal) e 6259 (estaduais). Esses códigos do primeiro turno não servem para o segundo. A mesma data do segundo turno inclui eleições suplementares municipais e consultas populares, fora do escopo deste site. O código 6261, de conselho distrital, está no primeiro turno e também fica de fora.

Esses números foram lidos na página oficial. Ainda assim, o coletor não deve copiá-los para o código antes de encontrá-los no EA11 vigente. Usar o código do primeiro turno, ou o código do simulado, no segundo turno oficial é um erro de coleta. A página de simulado usa outro pleito e outros códigos; eles não valem para a produção.

Não há, nesta documentação, lista de candidatos nem lista de unidades com disputa de governador. A página avisa que o registro de candidaturas ainda estava em julgamento e que não havia relação definitiva de candidatos. Cenários judiciais descritos para o simulado não são a situação oficial do segundo turno.

## Limite da origem

A página informa no máximo 100 requisições por segundo por IP. Acima disso, pode haver bloqueio de 10 minutos, renovado se houver nova tentativa antes do fim. Vários 404 também podem bloquear o IP, sem limiar publicado. Por isso o coletor só pede URLs construídas com a configuração confirmada e não varre caminho à procura de arquivo.

Não há intervalo de coleta recomendado pelo TSE. O valor nosso continua pendente.

## Contrato conceitual

O contrato é o que web e coletor compartilham. Ele ainda não tem schema. Os grupos abaixo são o nível necessário para implementar depois, sem fechar nome de campo.

| Grupo | O que precisa carregar | Situação |
| --- | --- | --- |
| Eleição, turno, cargo e abrangência | Qual disputa é, em que turno, e se o recorte é o Brasil ou uma unidade da Federação | Conceito adotado. Campos dependem das amostras e da especificação |
| Candidatos e votos | Identificação suficiente para exibir a candidatura e os votos recebidos, vindos da origem | Pendente. Nenhuma lista é fixada no repositório |
| Percentuais e andamento | Percentual de votos e percentual de apuração como medidas separadas, cada uma com o denominador compreendido | Pendente. A fórmula não será inventada |
| Disponibilidade | Dado presente, ainda inexistente, inválido ou simulado | Conceito adotado. Ausência não é zero |
| Referências temporais | Horário da origem, horário da coleta e horário da publicação | Conceito adotado. O significado dos relógios da origem depende da especificação |
| Versão do snapshot e versão do contrato | Identificador imutável do conjunto publicado e identificação da forma do contrato | Proposta. Ainda não há arquivo |
| Rastreabilidade | Ambiente de origem, arquivo consultado e identificador de geração, quando a origem o fornecer | Conceito adotado. A semântica do identificador está pendente |

O FAQ chama de IDG o identificador único de cada arquivo gerado. Cada geração recebe o seu. Arquivos distintos recebem identificadores distintos mesmo quando nascem no mesmo processamento. A resposta não confirma que comparar o valor numérico do IDG baste para saber qual geração é a mais nova. Essa comparação permanece pendente.

O mesmo FAQ descreve o indicador de andamento final de forma diferente para eleição federal, caso do presidente, e eleição estadual, caso do governador. Essa diferença precisa ser respeitada na normalização, depois de confirmada na especificação do arquivo. Ela não entra aqui como regra já codificável.

### O que o contrato precisa permitir ao frontend

- Mostrar o agregado nacional oficial, e não uma soma de “estados vencidos”.
- Omitir o painel de governador quando a configuração não trouxer essa disputa na unidade.
- Distinguir arquivo ausente de arquivo presente com votação zerada. No simulado, a página descreve arquivos iniciais com zero voto, o que é diferente de um 404.
- Marcar dado simulado.
- Expor a atualidade para o aviso de desatualização.
- Apontar, pelo manifesto, para um conjunto coerente. O navegador não junta arquivos de versões diferentes.

**Proposta de manifesto:** um ponteiro, cujo nome de exemplo é `latest.json`, indica a versão corrente, o ambiente e a versão do contrato. O nome não está implementado e não é contrato fechado. A ordem de publicação está em [collector/README.md](../collector/README.md).

## Validações a estudar

Antes de escrever schemas, a implementação precisa decidir o que fazer com:

- campo ausente ou campo inesperado;
- número, arredondamento e precisão;
- denominador de cada percentual;
- resultado zerado diante de ausência de resultado;
- alteração e retificação oficial, inclusive total que diminui;
- identificador de geração e se ele ordena versões;
- assinatura e arquivo JWS, conforme o manual indicado na página, ainda não lido.

Não é regra geral que votos ou totais nunca diminuam. Uma retificação oficial precisa de tratamento próprio. Até lá, o coletor não descarta uma resposta válida só porque um número ficou menor, e também não a publica se a validação estrutural falhar.

Resposta inválida, timeout e bloqueio não produzem snapshot. O manifesto segue na última versão boa.

## Pendências

| Questão | Fonte necessária | Impacto | Etapa |
| --- | --- | --- | --- |
| Códigos de ciclo, pleito e cargo realmente vigentes | EA11 (`ele-c.json`) e instruções de download | O coletor não pode montar URL | Antes da consulta controlada |
| Caminho de produção do segundo turno | Instruções de download de 2026 e configuração oficial | 404 e risco de bloqueio | Antes da consulta controlada |
| Exemplos de simulado diante do FAQ desencontrado | Página técnica e instruções | Separar ensaio e produção | Antes de qualquer consulta ao simulado |
| Unidades com governador no segundo turno | Configuração oficial vigente, não o cenário do simulado | Mostrar ou omitir o painel | Antes do painel de governador |
| Candidatos | Arquivos oficiais da divulgação, não lista editorial | Não fixar nome no código | Normalização |
| Campos e tipos de EA11, EA14, EA15 e EA20 | PDFs de especificação de 2026 | Schema e contrato | Normalizador |
| IDG serve para ordenar gerações? | Especificação, além do FAQ já lido | Detectar mudança | Normalizador |
| Denominadores dos percentuais | Especificação | Não exibir percentual com base errada | Normalizador |
| Zero, ausência e retificação | Especificação e amostras identificadas | A interface não pode transformar vazio em zero | Normalizador e web |
| Verificação JWS | Manual de verificação dos arquivos JWS | Integridade da origem | Antes da publicação de homologação, se o manual a exigir |
| Deveres dos artigos 264 a 269 | Resolução TSE nº 23.751/2026 | O que a divulgação própria pode fazer | Antes da exposição pública |
| Intervalo e concorrência da coleta | Limite publicado pelo TSE, ensaio controlado e orçamento | Carga na origem e atraso | Consulta controlada |
| EA15 é necessário para o painel estadual? | Especificação do EA15 e do EA20 de abrangência estadual | Evitar baixar município sem necessidade | Desenho da coleta |
| Fonte do GeoJSON | Base cartográfica pública a escolher | Mapa | Tela com mapa |

## Referências

Consultadas em 14 de outubro de 2026:

- TSE, informações técnicas sobre a divulgação de resultados 2026: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>
- TSE, índice dos arquivos de divulgação: <https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados>

Não consultadas por completo, e por isso não resumidas aqui: especificações PDF de cada arquivo, manual JWS, texto da resolução e apresentação integral da audiência técnica.

[Voltar ao contexto](../contexto.md)
