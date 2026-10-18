# Prompt — gerar a documentação das etapas

> **Histórico, não pendência.** Em 17/10/2026 os 16 planos de etapa foram escritos diretamente em [etapas/](../etapas/README.md), com o [modelo](../modelos/plano-de-etapa.md) e o [plano mestre](../plano-mestre.md). Este prompt não foi executado e não é mais pré-requisito de nada. Os caminhos de arquivo citados abaixo para ET-00, ET-05, ET-06, ET-09 e ET-11 foram renomeados (ver [histórico do catálogo](../etapas/README.md#histórico)), e a estrutura de seções A–Q foi substituída pelas 15 seções do modelo. Para executar uma etapa, use [executar-etapa.md](executar-etapa.md). O texto original segue sem alteração para referência.

Este arquivo é um prompt para uma sessão nova do Cursor. Ele pede a documentação detalhada das etapas já catalogadas. A sessão que o executar deve cumprir o pedido abaixo e parar. Não deve gerar outro prompt, não deve implementar código e não deve provisionar infraestrutura.

---

Você está trabalhando no projeto eleicoes-2026, na raiz deste repositório.

Sua tarefa é escrever a documentação detalhada das etapas de desenvolvimento. O plano geral e     o catálogo já existem. Você transforma cada etapa selecionada num documento que permita implementá-la depois, sem reconstruir o contexto a partir da conversa.

Execute o detalhamento agora. Não crie um prompt seguinte. Não implemente funcionalidade. Não provisione Cloudflare, AWS nem qualquer recurso externo. Não faça deploy. Não execute testes de carga. Não consulte o TSE em repetição. Não leia arquivos de segredo. Não faça commit nem push.

## Modo de seleção

O modo padrão é detalhar todas as etapas do catálogo, de ET-00 a ET-15.

Se a mensagem do usuário listar identificadores, detalhe somente esses IDs. Não altere o conteúdo das etapas não selecionadas. No catálogo, atualize apenas as linhas selecionadas. Se um ID não existir no catálogo, registre a ausência e não invente etapa.

## O que ler antes de escrever

Leia de fato, e use o que estiver no arquivo:

- `docs/planejamento/README.md`
- `docs/planejamento/etapas/README.md`
- `docs/contexto.md`
- `docs/arquitetura/README.md`
- `docs/dados/README.md` e, só se a etapa tocar banco, `docs/dados/consultas-e-transacoes.md`
- `docs/infraestrutura/README.md`
- `docs/seguranca/README.md` e `docs/seguranca/codigo-seguro.md`
- `docs/testes/README.md`, `docs/testes/unitarios-aaa.md` e `docs/testes/seguranca.md`
- `docs/padroes/README.md` e os guias de estilo, TypeScript, SOLID, performance e revisão que a etapa exigir
- `docs/collector/README.md` e `docs/collector/padroes-de-desenvolvimento.md`, nas etapas do coletor
- `docs/web/README.md` e `docs/web/padroes-de-desenvolvimento.md`, nas etapas de interface
- `docs/api/README.md` e `docs/api/padroes-de-desenvolvimento.md` somente para confirmar que a API continua condicional. Não crie etapa de API
- `README.md` e os `package.json` da raiz, de `apps/web`, de `apps/collector` e dos pacotes, para citar comandos que já existem
- Uma amostra do código suficiente para separar arquivo existente de caminho proposto: `apps/web/src/App.tsx`, `apps/collector/src/index.ts` e os `src/index.ts` dos pacotes

Se um arquivo dessa lista não existir, registre a ausência e o impacto. Não afirme que o leu.

As decisões explícitas deste prompt e do plano geral prevalecem sobre proposta antiga incompatível. Registre divergência e decisão vigente. A divergência já conhecida é o `README.md` da raiz, que ainda cita Cloudflare Pages. A decisão vigente é Workers Static Assets. Não misture as duas como se estivessem aprovadas ao mesmo tempo.

Não reabra escolha já adotada por preferência de tecnologia. Não use nomes de candidatos, listas de UFs com segundo turno, códigos eleitorais ou exemplos de outro pleito como dado confirmado. Código citado em `docs/dados/README.md` só pode ser repetido como leitura da página do TSE, com a ressalva de que o coletor só o fixa depois de encontrá-lo no EA11 vigente.

Não copie os guias inteiros para dentro das etapas. Aponte o identificador da regra.

## Decisões que cada documento deve preservar

Produto: acompanhamento dos resultados oficiais do segundo turno de 2026; visão presidencial nacional pelo agregado oficial; resultado presidencial por UF, incluindo o Distrito Federal; governador somente onde a configuração oficial confirmar a disputa; mapa interativo; atualização periódica; ausência e desatualização visíveis; liderança parcial não é confirmação de eleição.

Arquitetura vigente:

```text
TSE → collector → validação e normalização → snapshots JSON → Cloudflare R2 e CDN → frontend
```

```text
React + Vite → build estático → Cloudflare Workers Static Assets → navegador
```

Infraestrutura vigente:

- Workers Static Assets substitui Pages.
- R2 armazena os snapshots. O bucket nasce privado. A leitura pública usa domínio próprio. `r2.dev` não é caminho de produção nem de homologação pública.
- JSON não entra no cache padrão. Manifesto e snapshots versionados têm políticas diferentes.
- AWS EC2 com Docker é o destino do coletor contínuo.
- O desenvolvimento começa local. A Cloudflare é integrada antes da operação contínua na AWS.
- O mapa completo não é pré-requisito dessa integração.
- Há um publicador ativo. O navegador não consulta o TSE. O coletor não atende visitas. Atualizar resultados não exige rebuild do frontend.
- O coletor pode publicar no R2 a partir do computador antes da AWS.

Condicionais, fora da sequência: `apps/api` com NestJS e Fastify, PostgreSQL, Redis, load balancer próprio, SSE, WebSocket, filas e função Worker no meio da leitura dos JSON.

Engenharia, por referência e sem copiar o guia: módulos por responsabilidade; SOLID sem abstração desnecessária; coletor em funções e módulos, sem NestJS; frontend por funcionalidade, componentes e hooks; `if` com retorno antecipado e sem `else` / `else if` no código novo; sem ternário aninhado; testes AAA com um comportamento por teste; segurança, integridade e performance desde as primeiras etapas.

## Arquivos a criar

Crie um Markdown por etapa selecionada, no caminho do catálogo:

| ID    | Caminho                                                             |
| ----- | ------------------------------------------------------------------- |
| ET-00 | `docs/planejamento/etapas/00-base-do-projeto.md`                    |
| ET-01 | `docs/planejamento/etapas/01-validacao-dados-tse.md`                |
| ET-02 | `docs/planejamento/etapas/02-contrato-e-snapshots.md`               |
| ET-03 | `docs/planejamento/etapas/03-validacao-e-normalizacao.md`           |
| ET-04 | `docs/planejamento/etapas/04-coletor.md`                            |
| ET-05 | `docs/planejamento/etapas/05-publicacao-e-snapshots-locais.md`      |
| ET-06 | `docs/planejamento/etapas/06-interface-funcional-inicial.md`        |
| ET-07 | `docs/planejamento/etapas/07-homologacao-cloudflare.md`             |
| ET-08 | `docs/planejamento/etapas/08-integracao-cloudflare.md`              |
| ET-09 | `docs/planejamento/etapas/09-container-do-coletor.md`               |
| ET-10 | `docs/planejamento/etapas/10-aws-e-operacao-do-coletor.md`          |
| ET-11 | `docs/planejamento/etapas/11-frontend-completo.md`                  |
| ET-12 | `docs/planejamento/etapas/12-automacao-e-operacao.md`               |
| ET-13 | `docs/planejamento/etapas/13-capacidade-seguranca-e-resiliencia.md` |
| ET-14 | `docs/planejamento/etapas/14-entrada-em-producao.md`                |
| ET-15 | `docs/planejamento/etapas/15-continuidade-e-encerramento.md`        |

Se o arquivo já existir, atualize-o. Não deixe versão paralela com outro nome.

Depois de criar os selecionados:

- Em `docs/planejamento/etapas/README.md`, troque o caminho previsto por link relativo válido e atualize a coluna de documentação. Use "Detalhada com pendências" quando o documento registrar decisão aberta. Use "Detalhada e revisada" somente se você tiver relido o documento e conferido links e pendências na mesma sessão. Não mude a coluna de implementação para concluída.
- Se todos os documentos passarem a existir, o plano geral pode citar os links. Enquanto faltar algum, o plano continua mostrando os ausentes como caminho previsto, não como link quebrado.
- Mantenha o apontamento em `docs/contexto.md`. Não reescreva o contexto.

Não altere código de aplicação, testes executáveis, dependências, lockfiles, configuração de build, lint ou runtime, Dockerfiles, workflows, nem recursos externos.

## Profundidade

Cada documento é específico da etapa. Trocar o título de um modelo único não basta.

- Etapa de dados (ET-01 e ET-02): origem, evidência, contrato, integridade e o que permanece bloqueado.
- Etapa de código (ET-03, ET-04, ET-05, ET-06 e ET-11): responsabilidades, limites entre módulos, tarefas verificáveis e plano de testes.
- Etapa de infraestrutura (ET-07, ET-09 e ET-10): recursos, acessos, configuração não sensível, validação e recuperação.
- Etapa de integração (ET-08): contrato de publicação, credencial de homologação, cache e o que a tela passa a ler.
- Etapa operacional (ET-12, ET-13, ET-14 e ET-15): observabilidade, procedimento, evidência, custo e reversão.

O detalhamento orienta a implementação e não é a implementação. Não escreva classes, endpoints, bancos ou camadas para alongar o texto. Não adicione serviço para justificar pasta.

Se a evidência não permitir fechar uma solução:

- registre o que é conhecido;
- nomeie a decisão pendente;
- crie uma tarefa concreta para resolvê-la;
- bloqueie só o trabalho que depende dela;
- não invente campo, número, URL, candidato, lista de UF nem meta.

## Estrutura obrigatória de cada documento

Use estas seções, nesta ordem. O conteúdo muda conforme a etapa.

### A. Identificação

ID, título, marco do plano geral, componentes, estado documental, estado da implementação e referências consultadas com caminho. O estado da implementação sai do catálogo e da inspeção. Não o marque como concluído por ter escrito o plano.

### B. Objetivo concreto

O que passará a ser possível quando a etapa terminar, em uma entrega observável.

### C. Escopo e exclusões

O que a etapa faz e o que não deve ser antecipado. Diga explicitamente quando mapa, AWS, API, banco ou carga estiverem fora daquela etapa.

### D. Pré-requisitos e critério de entrada

Documentos, contratos, resultados ou recursos que precisam existir. Classifique cada pendência como bloqueante ou não bloqueante para aquela entrega. Não autorize implementação que dependa de decisão desconhecida.

### E. Entradas e saídas

Dados de entrada, artefatos produzidos e quem os consome. Separe resposta bruta do TSE, modelo normalizado, snapshot versionado e manifesto.

### F. Requisitos rastreáveis

Ligações para as regras aplicáveis: PL-REQ do plano, SEC, COL, WEB, PKG, PERF, TEST, STYLE e as regras de arquitetura, dados, infraestrutura e testes. Não copie o texto das regras.

### G. Áreas do repositório afetadas

Três listas:

- arquivos ou módulos existentes que poderão ser alterados;
- caminhos propostos para criação;
- componentes que devem permanecer intocados.

Não invente número de linha. Não afirme que um caminho proposto já existe. `apps/api`, banco, Redis e balanceador permanecem intocados, salvo menção de exclusão.

### H. Tarefas em ordem de execução

Cada tarefa tem:

- identificador no formato `ET-XX-NN`;
- ação específica;
- motivo;
- dependências;
- tipo: código, infraestrutura, configuração, teste ou documentação;
- resultado esperado;
- forma de verificação.

A tarefa deve poder ser implementada e revisada com uma entrega verificável. Não use "fazer backend", "configurar segurança" nem "implementar testes". Não fatie a ponto de a tarefa não ter resultado observável.

Para código novo, a tarefa de teste unitário acompanha a regra, no formato AAA, um comportamento por teste. Não deixe a suíte para o fim do projeto.

### I. Contratos e decisões técnicas

Contratos afetados, limite entre módulos e compatibilidade. Não redefina contrato aprovado em silêncio. Se uma mudança for necessária, registre motivo, impacto e, se ainda não houver decisão, a pendência. `latest.json` só deixa de ser proposta se ET-02 o adotar. Políticas de cache do manifesto e dos arquivos versionados permanecem distintas.

### J. Segurança e integridade

Riscos daquela etapa e controles a implementar nela. Não repita a mesma lista genérica nas dezesseis etapas. Aplique o que for pertinente:

- credencial restrita e separada por ambiente;
- nenhum segredo no frontend, em `VITE_*`, em exemplo ou em log;
- preservação do último snapshot válido;
- resposta inválida não publicada;
- allowlist e parada diante de bloqueio, nas etapas que falam com a origem;
- proteção básica antes de exposição pública;
- oficial e simulado sem o mesmo destino público.

### K. Performance e custo

Trabalho caro, concorrência, volume, o que medir, risco de custo e limite ainda pendente. Não invente meta numérica. Não trate "milhões de acessos" como aceite. Onde houver carga, separe visitantes simultâneos, requisições por segundo e volume transferido. O teto de 100 requisições por segundo por IP é limite da origem oficial, não meta do coletor nem regra da nossa borda.

### L. Plano de testes

Matriz:

| Cenário | Preparação | Ação | Resultado esperado | Nível do teste | Ambiente |

Níveis possíveis: unitário, integração, interface, ponta a ponta, homologação, carga, verificação operacional.

Inclua caminho feliz, entrada inválida, falha e recuperação quando a etapa tiver esses casos. Um comportamento por cenário. Diga o que o nível não prova. Mock não prova CDN, WAF, R2 público nem grupo de segurança. Teste local não prova Cloudflare nem AWS. Carga não aponta para o TSE.

ET-00 pode ter uma matriz curta de verificação dos comandos existentes. ET-15 pode ter verificação operacional da decisão de retenção. Não force teste de carga numa etapa que não o comporta.

### M. Validação e comandos

Comandos que já existem no `package.json`, e o que cada um comprova. `pnpm test` com `--passWithNoTests` não prova que haja suíte. Comando que ainda precise ser criado fica marcado como proposto e não como testado. Não inclua segredo, identificador de conta, chave nem token.

### N. Infraestrutura e ações manuais

Quando a etapa criar ou alterar recurso, liste recurso, permissão, configuração não sensível, decisão que precisa estar fechada, o que é manual, o que pode ser automatizado e a evidência da configuração. Quando a etapa não tiver infraestrutura, diga isso em um parágrafo curto, sem inventar bucket nem instância.

### O. Falha, reversão e recuperação

Como perceber execução incorreta e como voltar a um estado utilizável. Em nuvem, considere impacto, custo e o risco de alterar ou remover recurso. Não use "apagar tudo e recriar" como procedimento padrão. A última versão válida permanece endereçada pelo manifesto quando a nova falhar.

### P. Critérios de conclusão

Critérios observáveis, separados em: código escrito, testes aprovados, integração validada, documentação atualizada e aceite operacional. Marque todos como não cumpridos. Este prompt produz documentação, não aceite.

### Q. Pendências e passagem para a próxima etapa

O que ficou em aberto, quem resolve (use "a definir" quando não houver responsável), o que a próxima etapa recebe e qual condição permite avançar. Documento completo pode conter pendência, desde que diga como e quando ela se resolve.

## Cuidados que atravessam todas as etapas

- Testes unitários junto das primeiras regras, a partir de ET-03.
- Proteção básica na ET-07, antes da exposição da ET-08. ET-12 consolida automação e não é a primeira proteção.
- Credenciais por ambiente. Homologação não escreve na produção.
- Nenhum segredo em exemplo, bundle ou documento.
- Último snapshot válido preservado.
- Atualização da origem, coleta e publicação são eventos distintos.
- Consistência dos arquivos publicados é diferente da sincronização dos arquivos oficiais entre si.
- Manifesto e snapshots versionados não compartilham a mesma política de cache.
- Consulta à origem oficial é controlada e pequena. Carga só na nossa infraestrutura autorizada, com orçamento e interrupção escritos antes, na ET-13.
- Recuperação faz parte da prova, não só o caminho feliz.
- Não prometa capacidade antes da medição.
- Não declare recurso provisionado, teste executado ou deploy feito.
- ET-11 pode ser implementada sem esperar ET-10. A conclusão na homologação espera ET-08.
- ET-15 não apaga dado sem decisão explícita de retenção.
- Não insira a API opcional na sequência.

## Verificação antes de encerrar

Confira:

- cada etapa selecionada tem o arquivo previsto;
- IDs, nomes, marcos e dependências batem com o plano geral e o catálogo;
- não há ciclo novo de dependência;
- Cloudflare continua antes da operação contínua na AWS;
- API, banco, Redis e balanceamento continuam fora da sequência;
- estados de documentação e de implementação continuam separados;
- links de arquivos existentes funcionam;
- caminho ainda não criado não virou link;
- não houve mudança fora de `docs/planejamento/` e do apontamento já existente em `docs/contexto.md`;
- nenhum critério de conclusão foi marcado como cumprido;
- o catálogo não contradiz os documentos individuais.

## Relato final

Ao terminar, informe:

1. Árvore dos documentos criados ou atualizados.
2. Quais IDs foram detalhados e quais ficaram de fora, se houve seleção.
3. Pendências bloqueantes por etapa.
4. Links conferidos e caminhos que continuam previstos.
5. Qualquer divergência entre o plano geral e o que você encontrou no repositório.
6. Confirmação de que não houve implementação, teste executado, deploy nem provisionamento.

Não continue para a implementação.
