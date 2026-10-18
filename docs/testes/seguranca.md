# Testes de segurança e garantias

[Voltar aos testes](README.md) · [Código seguro](../seguranca/codigo-seguro.md)

Este documento liga cada controle ao nível que consegue observá-lo. Não cria teste executável e não envia payload ao TSE nem a terceiros. Entrada de teste é sintética e pequena. Serviço de apoio, quando precisar existir, é local e controlado.

Os níveis:

| Nível                           | O que cabe                                                                     | O que não cabe                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Unitário                        | Decisão pura, schema, descarte de URL já interpretada, texto renderizado no nó | SQL real, CDN, WAF, guard realmente montado na rota                                        |
| Integração                      | Processo com disco local, servidor HTTP local ou, no futuro, banco isolado     | O domínio público de produção                                                              |
| Navegador ou ponta a ponta      | Percurso do visitante na aplicação                                             | A política inteira do navegador e o cabeçalho da borda, se o teste não sair do DOM isolado |
| Homologação ou infraestrutura   | Cache, CORS, caminho alternativo do bucket, grupo de segurança, cabeçalho      | Prova obtida só com fake                                                                   |
| Análise estática e dependências | Padrão conhecido no código e aviso de dependência                              | Ausência de vulnerabilidade                                                                |
| Revisão manual                  | Ameaça que a ferramenta não modela, exceção de lint, desenho da publicação     | Substituto dos outros níveis                                                               |

## Matriz

Requisito relacionado aponta para o identificador local em [codigo-seguro.md](../seguranca/codigo-seguro.md) ou para o documento operacional. Não é número da OWASP.

| Cenário                                                              | Resultado esperado                                                           | Nível                                                                                   | Componente             | Requisito |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------- | --------- |
| Campo obrigatório do contrato ausente                                | A publicação não ocorre e o ponteiro anterior permanece                      | Unitário, no schema e na decisão                                                        | Validação e coletor    | SEC-001   |
| Tipo errado ou valor fora do limite                                  | Rejeição, sem coerção para zero ou texto vazio “útil”                        | Unitário                                                                                | Validação              | SEC-001   |
| Corpo acima do tamanho máximo                                        | A leitura para antes do parse completo e a tentativa falha                   | Integração com fixture local                                                            | Cliente do coletor     | SEC-001   |
| Campo que o contrato não nomeia                                      | O campo não aparece no snapshot público                                      | Unitário do normalizador                                                                | Coletor                | SEC-001   |
| Texto externo com marcação                                           | O visitante vê o texto, não um elemento criado por essa marcação             | Unitário de componente, quando a tela existir                                           | Web                    | SEC-004   |
| URL com host fora da allowlist                                       | Nenhuma conexão é aberta                                                     | Unitário da função que decide o destino, mais integração se o cliente HTTP for o objeto | Coletor                | SEC-003   |
| Redirect para host não permitido                                     | A resposta de redirect é falha e o host final não é consultado               | Integração com servidor local que responde redirect                                     | Coletor                | SEC-003   |
| Caminho com `..` para fora do diretório de trabalho                  | Nenhum arquivo é escrito fora da área                                        | Integração em diretório temporário                                                      | Publicação local       | SEC-003   |
| Erro cuja mensagem incluiria token, se o token estivesse no contexto | Log e erro público não contêm o token da fixture                             | Unitário do formatador de log                                                           | Coletor                | SEC-006   |
| Falha no meio da publicação                                          | O manifesto lido ao final ainda é o anterior                                 | Unitário com fake, e integração em disco                                                | Coletor                | SEC-007   |
| Chaves de dois ambientes                                             | Prefixo ou bucket da fixture de simulado não é o da fixture oficial          | Unitário da função que monta a chave                                                    | Publicação             | SEC-007   |
| Resposta da unidade A chega depois da resposta da unidade B          | A tela permanece na seleção B                                                | Unitário com timers e Promises controladas                                              | Web                    | WEB-005   |
| Concorrência acima do limite do ciclo                                | A segunda tentativa não dispara outra coleta enquanto a primeira não termina | Unitário do agendador com relógio falso                                                 | Coletor                | COL-003   |
| Nova tentativa depois de erro permanente                             | O número de chamadas para no limite, sem laço infinito                       | Unitário                                                                                | Cliente do coletor     | COL-004   |
| Credencial sem permissão de escrita                                  | A operação administrativa futura responde recusa                             | HTTP da API, com o guard ligado                                                         | API futura             | SEC-005   |
| Consulta com texto hostil no valor                                   | O banco trata o texto como dado; a estrutura da consulta não muda            | Integração em PostgreSQL isolado                                                        | Adapter futuro         | DATA-001  |
| Chamada a recurso privado sem autorização                            | A rota nega, inclusive quando o identificador é válido                       | HTTP                                                                                    | API futura autenticada | SEC-005   |

Unidades “A” e “B” não são a lista oficial de circunscrições. Token de fixture é um literal óbvio, como `token-de-teste`, nunca um segredo real.

## Ressalvas

- Mock de repository não comprova ausência de SQL injection. A string concatenada pode estar no adapter que o mock substituiu.
- Mock de cache não comprova a configuração da CDN. A página de consistência do R2, consultada em 14 de outubro de 2026, separa o acesso direto ao bucket do acesso por domínio com cache.
- Teste da função de um guard não comprova que a rota usa o guard. A página de testes do Nest, consultada na mesma data, mostra override de guard justamente no teste da aplicação montada.
- Teste de DOM isolado não comprova a política de segurança do navegador nem o cabeçalho enviado pela borda.
- Scanner sem achados não prova ausência de vulnerabilidade.
- WAF e limite de taxa se validam no ambiente em que estão ligados. O plano da Cloudflare continua pendente.
- Não desligar, no próprio teste, o controle que se quer observar. Um teste de schema não remove o schema para “isolar”. Um teste de rota não desliga o guard e ainda assim afirma que a rota está protegida.

## Quando houver banco

Além da matriz, o banco isolado precisa de testes que:

- falhem uma escrita no meio da transação e confirmem que a outra escrita do mesmo bloco não permaneceu;
- violem uma restrição e confirmem a rejeição;
- disparem duas conexões concorrentes sobre a regra que exigir isolamento ou lock.

Esses testes não usam dado nem credencial de produção. O desenho está em [consultas-e-transacoes.md](../dados/consultas-e-transacoes.md). Sem banco, eles não são escritos contra um serviço imaginário.

## Quando houver R2 e CDN

Fake local cobre a ordem lógica: arquivos da versão, depois o manifesto, ponteiro antigo se a escrita falhar. Homologação cobre o resto:

- leitura pelo domínio próprio depois da publicação;
- status de cache do manifesto e do arquivo versionado;
- objeto apagado ou substituído que o cache ainda sirva até o TTL, para o teste não tratar a borda como se fosse o bucket;
- caminho alternativo, como `r2.dev`, fora do uso público.

Isso repete, no nível de prova, o que [testes/README.md](README.md) e [seguranca/README.md](../seguranca/README.md) já exigem para a infraestrutura. Não substitui aqueles critérios.

## Referências

Consultadas em 14 de outubro de 2026:

- NestJS, testes: <https://docs.nestjs.com/fundamentals/testing>
- Cloudflare R2, consistência: <https://developers.cloudflare.com/r2/reference/consistency/>
- OWASP Cheat Sheet Series, validação de entrada: <https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html>
- OWASP Cheat Sheet Series, SSRF: <https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html>

[Voltar aos testes](README.md)
