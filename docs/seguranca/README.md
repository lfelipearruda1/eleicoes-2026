# Segurança

[Voltar ao contexto](../contexto.md)

Os controles abaixo são requisitos verificáveis. Quase todos estão planejados: não há WAF, bucket, instância, workflow nem código de coleta para inspecionar. Onde o repositório já permite uma verificação, a tabela diz isso. “Planejado” não significa “já protege”.

Controles de código, com a matriz de implementação, estão em [codigo-seguro.md](codigo-seguro.md). Eles não substituem a topologia desta página. A prova de cada controle está em [testes/seguranca.md](../testes/seguranca.md).

Os rótulos de estado estão em [contexto.md](../contexto.md). A topologia está em [arquitetura/README.md](../arquitetura/README.md).

## Frontend e leitura pública

O navegador baixa o site e os snapshots. Não há conta de visitante na primeira versão, então não há sessão para roubar nesse fluxo. O risco está em outra parte: origem errada, conteúdo interpretado como HTML, cache furado e proteção que bloqueie gente de verdade.

- O frontend só conhece o domínio público dos resultados. Não há host do TSE no código da interface. **Como verificar hoje:** `apps/web/src` não referencia o TSE. **Como verificar depois:** o tráfego da página, na homologação, só pede o nosso domínio.
- Texto de candidato e de situação eleitoral entra na página como texto.
- Ausência de dado não é preenchida com zero para “parecer” apuração.
- O polling não usa parâmetro aleatório. Parâmetro arbitrário não pode multiplicar as variantes de cache.
- Segredo não entra no bundle. Variável `VITE_*` é pública por natureza do Vite. Credencial de publicação não usa esse prefixo. Os `.env.example` atuais não definem variável alguma.

Proteção de borda, WAF, limite de requisição e mitigação de negação de serviço ficam a cargo dos produtos da Cloudflare compatíveis com o domínio e com o plano. O plano está pendente, então o conjunto exato de regras também está. A documentação de cache do R2 diz que essas proteções não existem no host `r2.dev`. A primeira exposição pública, mesmo de homologação, já precisa do domínio próprio e de proteção básica. Não se espera a véspera da eleição para ligar o mínimo.

Limite por IP tem um efeito colateral: visitantes legítimos atrás do mesmo endereço, como operadora com NAT ou uma rede institucional, podem ser bloqueados juntos. A regra precisa ser ensaiada com esse caso. Copiar o teto de 100 requisições por segundo do TSE para a nossa borda não é o desenho: aquele teto protege a origem oficial contra o coletor, não o nosso site contra o público.

## Coletor e origem oficial

- Allowlist de hosts. Na prática, o host oficial publicado e, só em ensaio autorizado, o host de simulado. Sem redirecionamento para outro host.
- URL montada com configuração confirmada. Entrada do visitante não chega ao coletor e não compõe endereço externo.
- Timeout, tamanho máximo e concorrência máxima. Os números estão pendentes; a existência dos limites não está.
- Um ciclo por vez, com novas tentativas em espera progressiva e pequena variação aleatória.
- Parar diante de bloqueio. O TSE informa que o bloqueio de 10 minutos recomeça se houver tentativa antes do fim, e que 404 repetido pode bloquear sem limiar publicado.
- Validar a resposta antes de publicar. Parâmetro inesperado e corpo que não fecha o contrato são falha, não snapshot.
- Log sem credencial, sem token e sem cabeçalho de autorização.

A verificação JWS fica pendente até a leitura do manual citado pelo TSE. Se o manual a exigir para confiar no arquivo, a publicação de homologação espera essa checagem. Não inventamos o algoritmo aqui.

## Armazenamento e publicação

- Não publicar resposta inválida como resultado eleitoral.
- Manifesto, snapshots versionados e registros de erro ficam separados. Erro não ocupa a chave de um resultado.
- A chave de cache distingue ambiente e conjunto de dados. Oficial e simulado não compartilham a mesma URL pública.
- Arquivo de versão é imutável. O manifesto é o ponteiro curto. Uma política única de cache para os dois está errada.
- O bucket exposto publicamente contém só o que o visitante pode ler. Segredo, dump e arquivo de trabalho ficam fora dele.
- CORS, quando as origens de site e de resultados forem diferentes, libera o navegador da origem do site. Não autentica ninguém. Cliente que não seja navegador não é contido por CORS. A documentação do R2 lembra que, sem o cabeçalho `Origin`, a resposta nem traz os cabeçalhos CORS; o teste precisa enviá-lo.
- O caminho alternativo também importa. `r2.dev`, URL antiga de bucket ou objeto sem passar pelo domínio protegido não pode ser um atalho sem cache e sem WAF. O acesso público alternativo precisa estar desligado ou restrito, e isso tem de ser testado por fora do domínio bonito.
- Credencial de publicação com o menor privilégio que ainda permita gravar os prefixos daquele ambiente, e só dele. Rotação prevista. Credencial de homologação não escreve na produção.

Conectar um domínio próprio ao bucket torna a leitura pública, segundo a documentação de cache do R2. A decisão de publicar os snapshots é compatível com isso. A decisão não autoriza colocar mais nada no mesmo bucket.

## AWS e acessos administrativos

O EC2 executa o coletor. Não publica porta de leitura dos resultados. O grupo de segurança precisa permitir a saída até a origem oficial e até o R2, e negar entrada de aplicação vinda da internet.

**Proposta:** administrar a instância com o AWS Systems Manager Session Manager. A documentação desse recurso, consultada em 14 de outubro de 2026, descreve acesso por IAM, sem porta de entrada aberta, sem bastion e sem chave SSH espalhada, com registro de sessão. A página avisa que o console legado do Session Manager seria descontinuado em 31 de dezembro de 2026 e que a função segue no console unificado. A proposta usa a capacidade, não uma tela específica. Ela ainda não está adotada como recurso criado, porque a conta AWS não existe neste projeto.

Quem puder abrir sessão na instância consegue o mesmo que o coletor. O grupo autorizado deve ser pequeno. Credencial de nuvem e credencial de publicação são papéis diferentes.

Atualização de sistema e de imagem entra na operação contínua. Não há, hoje, política de patch no repositório.

## Segredos e automação

- Um segredo por ambiente. Local não reutiliza a chave de produção.
- Segredo não vai para Git. `.gitignore` já ignora `.env` e `.env.*`, com exceção de `.env.example`.
- GitHub Actions, quando existir, usa o cofre do próprio GitHub, com permissão mínima para o workflow que publica. A pasta de workflows está vazia.
- Log de CI também não imprime segredo.
- Dependências: a atualização é deliberada. Uma auditoria automática entra com a automação. Enquanto o workflow não existe, esse controle está por fazer, não feito.

Sentry e OpenTelemetry com Grafana, se forem ligados, recebem evento sem credencial e sem conteúdo desnecessário da apuração. Ligá-los não é pré-requisito do primeiro deploy de homologação.

## Integridade, disponibilidade e incidente

Integridade, aqui, é não exibir como oficial um arquivo que não passou na validação, e não apontar o manifesto para um conjunto incompleto.

Disponibilidade da leitura é a CDN servir a última versão boa. Disponibilidade da atualização é o coletor continuar publicando. As duas falham de jeitos diferentes e o site precisa conseguir dizer que os dados envelheceram.

Resposta a incidente, na ordem prática:

1. Interromper novas publicações do publicador afetado.
2. Manter a última versão válida no manifesto, quando ela ainda for a melhor informação correta.
3. Revogar ou rotacionar a credencial comprometida e separar a credencial dos outros ambientes.
4. Corrigir ou retirar a publicação incorreta, fazendo o manifesto voltar a uma versão boa ou substituindo-a por uma versão corrigida completa.
5. Comunicar a desatualização na própria interface, pelo estado já previsto de dados envelhecidos.
6. Registrar o ocorrido sem colar segredo no relato.

O ensaio desse roteiro está em [testes/README.md](../testes/README.md). Enquanto não for executado, o roteiro é plano.

## Tabela de riscos

| Risco | Controle planejado | Componente responsável | Como verificar |
| --- | --- | --- | --- |
| Visitante consulta o TSE a partir do navegador | A interface só chama o domínio público de resultados | Web | Hoje, revisão de `apps/web`. Na homologação, inspeção do tráfego |
| O EC2 vira servidor público dos JSON | Sem porta HTTP de leitura para a internet. O público usa a CDN | Coletor e AWS | Grupo de segurança e tentativa de acesso ao endereço da instância |
| Segredo no JavaScript do site | Proibir credencial em `VITE_*` e no bundle | Web | Busca no resultado de `vite build` e nas variáveis de exemplo |
| Credencial de publicação ampla demais | Permissão mínima de escrita no prefixo do ambiente | Coletor e R2 | Revisão da política e tentativa de ler outro bucket ou outro ambiente |
| A mesma chave em local, homologação e produção | Credenciais distintas | Infraestrutura | Inventário por ambiente, quando existirem |
| JSON inválido publicado como apuração | Validar antes de gravar. Manifesto só muda com o conjunto completo | Coletor | Teste de resposta inválida. O ponteiro anterior permanece |
| Cache mistura oficial e simulado, ou manifesto e arquivo antigo | Chave de cache com ambiente e conjunto. Políticas separadas | CDN e R2 | Pedidos dos dois ambientes e leitura do status de cache |
| Query string arbitrária multiplica o cache | Não variar o cache por parâmetro imprevisto. O cliente não inventa parâmetro | Web e CDN | Duas URLs com queries diferentes, medindo acerto de cache |
| `r2.dev` ou outro caminho entrega o bucket sem WAF e sem cache | Domínio próprio em produção. Caminho alternativo desligado ou restrito | R2 | Pedido direto ao caminho alternativo |
| Arquivo privado no bucket público | Bucket público só com manifesto e snapshots | R2 | Inventário dos objetos publicados |
| CORS tratado como se fosse autenticação | CORS apenas para o navegador da origem do site | R2 | Cliente sem navegador lê o objeto público. Outra origem é barrada só no navegador |
| HTML vindo da origem é interpretado | Inserir os textos como texto | Web | Amostra com marcação não vira elemento |
| Resposta enorme ou lenta prende o coletor | Limites de tamanho e de tempo | Coletor | Testes de timeout e de corpo excedente |
| Coleta acima do limite ou com 404 em série | Allowlist, um ciclo, backoff, parada em bloqueio | Coletor | Ensaio controlado e revisão das URLs. Sem teste de carga contra o TSE |
| URL externa montada com dado do visitante | O coletor não recebe URL do visitante | Coletor | Revisão de código quando a coleta existir |
| WAF bloqueia visitantes que compartilham IP | Regras do plano escolhido, ensaiadas com esse caso | Cloudflare | Homologação antes da produção |
| SSH aberto para administrar o EC2 | Proposta de Session Manager, sem porta administrativa pública | AWS | Grupo de segurança e abertura de sessão |
| Log ou CI revela credencial | Não registrar segredo. Cofre do workflow no futuro | Coletor e GitHub Actions | Amostra de log e revisão do workflow, quando existir |
| Dependência com falha conhecida | Atualização deliberada e auditoria na automação | Repositório | Comando de auditoria quando o workflow existir. Hoje o controle não roda |
| Publicação errada permanece no ar | Parar o publicador, conservar ou restaurar versão válida, avisar na tela | Operação | Exercício de retorno em homologação |

## Referências

Consultadas em 14 de outubro de 2026:

- Cloudflare, cache no R2, inclusive a ressalva sobre `r2.dev`, domínio próprio e cache de JSON: <https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/>
- Cloudflare, CORS no R2, página com atualização indicada em 23 de setembro de 2026: <https://developers.cloudflare.com/r2/buckets/cors/>
- AWS Systems Manager Session Manager: <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html>
- TSE, limites de acesso e bloqueio: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>

[Voltar ao contexto](../contexto.md)
