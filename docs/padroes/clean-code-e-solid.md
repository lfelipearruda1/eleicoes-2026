# Clean Code e SOLID

[Voltar ao índice de padrões](README.md)

Princípios para decidir onde o código mora. Eles não pedem microserviço, CQRS, event sourcing nem DDD completo. Também não provam segurança nem capacidade de pico. Estilo está em [code-style-e-nomenclatura.md](code-style-e-nomenclatura.md).

Robert C. Martin, no texto consultado em 14 de outubro de 2026, trata SOLID como disciplina para manter o código simples: separar o que muda por motivos diferentes, estender sem reabrir o que continua certo, preservar o significado de um contrato, não obrigar o cliente a depender do que não usa e apontar a dependência para a abstração. O mesmo texto responde a quem reduziria tudo a “escreva código simples” sem mais critério. Este projeto usa os princípios com limite: abstração só quando há variação ou fronteira real.

<https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html>

## Princípios

### CC-001. SRP: um motivo de mudança por unidade

**Nível:** Obrigatório como critério, não como contagem de classes.

**Regra:** Buscar a origem, normalizar, publicar e apresentar são motivos de mudança diferentes. Não moram na mesma função. Dentro de uma dessas etapas, não se parte o código de novo só para cada detalhe ter um arquivo.

**Justificativa:** A arquitetura já separa coletor, snapshot e navegador. O princípio explica essa separação. Não pede uma classe para cada passo interno se uma função ainda tem um motivo só.

**Onde se aplica:** coletor, web, pacotes e API futura.

**Exemplo adequado:** `fetchOfficialPayload` devolve o corpo ainda bruto. `normalizeElectionResult` recebe dado já obtido. `publishSnapshot` recebe o modelo já aceito. Nomes ilustrativos.

**Antipadrão:** `runElection()` busca, decide vencedor e devolve JSX.

**Verificação:** revisão da responsabilidade do módulo. Não há métrica automática de SRP.

### CC-002. OCP: extensão onde a variação existe

**Nível:** Condicional. Só quando houver pelo menos duas implementações reais ou uma troca já decidida.

**Regra:** Abrir um ponto de extensão para variação que o projeto já tem. Armazenamento local no desenvolvimento e R2 no destino planejado são uma variação real de publicação. Isso não justifica interface para cada função.

**Onde se aplica:** publicador do coletor, quando o segundo destino for escrito. Até lá, uma função que grava no diretório local pode existir sem interface.

**Exemplo adequado:** o ciclo de coleta chama `publish(snapshot)`. Em teste, a função grava em memória. No processo, grava em disco ou no cliente do R2. O contrato da função é o mesmo: só confirma depois que o conjunto exigido está disponível.

**Antipadrão:** `interface Clock`, `interface IdGenerator` e `interface Logger` criados no primeiro dia para um único `new Date()` e um único `console`.

**Verificação:** revisão. A segunda implementação, ou o teste que substitui a função, é a evidência de que a extensão existe.

### CC-003. LSP: substituto preserva o contrato inteiro

**Nível:** Obrigatório quando houver mais de uma implementação.

**Regra:** Quem substitui uma função ou uma classe preserva resultado, erro e garantia. Ter o mesmo nome de método não basta. Um publicador de teste que engole falha não substitui o publicador real.

**Justificativa:** Martin descreve o princípio como subtipagem, não como herança. Implementação que surpreende o chamador espalha `if` pelo código.

**Onde se aplica:** publicador, cliente da origem em teste e, se a API existir, adaptadores substituídos no módulo de teste.

**Antipadrão:** a implementação “local” atualiza o manifesto mesmo quando a escrita do arquivo falha, e a implementação “R2” não.

**Verificação:** os testes das duas implementações cobrem a mesma falha observável.

### CC-004. ISP: o cliente não depende do que não usa

**Nível:** Obrigatório nas fronteiras entre módulos.

**Regra:** Contrato pequeno, orientado a quem consome. Quem só lê snapshot não recebe operação de apagar publicação ou de abrir sessão administrativa.

**Onde se aplica:** pacotes compartilhados e API futura. A web não importa função de escrita do coletor.

**Exemplo adequado:** `readSnapshot(versionId)` para a tela. `publishSnapshot` fica no coletor.

**Antipadrão:** um tipo `ElectionStore` com ler, publicar, apagar, autenticar e configurar cache, importado pelo componente de painel.

**Verificação:** revisão dos imports.

### CC-005. DIP: regra de negócio sem SDK na assinatura

**Nível:** Obrigatório para regra de domínio. Recomendado não virar contêiner de injeção no coletor.

**Regra:** Função que decide se um snapshot pode ser publicado não importa cliente HTTP, SDK de armazenamento, driver de banco nem tipos de pedido do framework. Receber a dependência como função já é inversão suficiente. A API, se existir, usa o contêiner do Nest porque esse é o mecanismo do framework, não porque toda função do monorepo precise dele. O coletor não adota esse contêiner.

**Onde se aplica:** núcleo de normalização e de decisão de publicação. Composição em `main.ts` ou no módulo Nest.

**Exemplo adequado:** `decidePublication(input, writeFiles)`, como no exemplo de [code-style-e-nomenclatura.md](code-style-e-nomenclatura.md).

**Antipadrão:** a função de normalização abre `fetch` para o TSE.

**Verificação:** o módulo de domínio não importa SDK. Inspeção de imports quando o módulo existir.

## Hábitos que acompanham os princípios

### CC-006. Coesão, acoplamento e composição

**Nível:** Obrigatório como critério de revisão.

**Regra:** Módulo coeso muda por um motivo e é compreensível sem abrir o restante do repositório. Acoplamento fica nas bordas explícitas. Composição vem antes de herança quando as duas resolvem o mesmo problema. Não há hierarquia de classes no código atual; código novo não cria herança profunda.

**Verificação:** revisão. Herança nova pede justificativa na exceção ou no documento da decisão.

### CC-007. KISS, YAGNI e DRY de conhecimento

**Nível:** Obrigatório.

**Regra:** A solução mais simples que preserva a arquitetura vence. Não se constrói mecanismo para um requisito imaginado. DRY se aplica a conhecimento que precisa permanecer igual, como a regra de não trocar o manifesto se a versão falhar. Duas linhas parecidas em contextos diferentes podem continuar duplicadas. Extraí-las cedo acopla o que muda por motivos diferentes.

**Onde se aplica:** qualquer tarefa de implementação.

**Exemplo em que a função simples é a decisão correta:** no primeiro publicador local, uma função `publishToDirectory(snapshot, directory)` que escreve os arquivos e só então o ponteiro. Sem `StorageStrategy`, sem fábrica e sem classe. A interface aparece quando o cliente do R2 for a segunda implementação real, ou quando o teste precisar substituir a escrita. Até lá, o teste pode usar um diretório temporário isolado se for teste de integração de arquivo, ou uma função injetada se for teste unitário da decisão.

**Antipadrão:** introduzir fila, outbox ou barramento porque “publicação distribuída costuma precisar”. [dados/consultas-e-transacoes.md](../dados/consultas-e-transacoes.md) recusa outbox antes de um requisito.

**Verificação:** a revisão pergunta qual variação real a abstração cobre.

### CC-008. Núcleo puro, efeito na borda, dependência explícita

**Nível:** Obrigatório.

**Regra:** Regra de normalização e de decisão é função pura sempre que o dado já esteja em memória. Efeito de rede, disco e relógio fica na borda: cliente, publicador, agendador, efeito React. Dependência entra por parâmetro ou pelo construtor do framework. A interface pública de um módulo exporta poucas funções. O restante não é reexportado “para facilitar”.

**Onde se aplica:** `packages/election-data`, `packages/validation` e o miolo do coletor.

**Verificação:** teste da função pura sem rede. A ausência de teste, hoje, não é sucesso; a suíte ainda não existe, como diz [testes/README.md](../testes/README.md).

## O que não é padrão inicial

### CC-009. Abstração proibida como padrão de partida

**Nível:** Obrigatório.

**Regra:** Não começar por:

- `BaseController`, `BaseService` ou `BaseRepository` universais;
- interface para cada classe;
- camada que só repassa o mesmo parâmetro;
- herança profunda;
- classe em volta de função pura trivial;
- pasta `utils`, `common` ou `shared` como depósito do que não teve lugar;
- genérico desenhado para uma necessidade futura que ninguém especificou.

`shared` na web é o lugar de elemento realmente usado por mais de uma funcionalidade, como definido em [web/padroes-de-desenvolvimento.md](../web/padroes-de-desenvolvimento.md). Não é sinônimo desta proibição.

**Verificação:** revisão. Presença de `Base*` ou de pasta depósito é motivo para recusar a mudança, salvo exceção registrada.

## Quando criar uma abstração

Criar quando as três respostas forem sim:

1. Existe mais de uma implementação agora, ou um teste que precise substituir um efeito real.
2. O contrato cabe em poucas operações e inclui a falha.
3. Sem a abstração, o chamador importaria SDK, HTTP ou framework.

Se uma resposta for não, manter a função simples. CC-007 é o exemplo.

## Referências

Consultada em 14 de outubro de 2026:

- Robert C. Martin, “Solid Relevance”: <https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html>

[Voltar ao índice de padrões](README.md)
