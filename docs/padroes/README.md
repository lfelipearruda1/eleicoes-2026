# Padrões de engenharia

[Voltar ao contexto](../contexto.md)

Este guia orienta o código que ainda será escrito. Ele não implementa coleta, tela, API nem banco. Onde o repositório já tem uma escolha, a escolha fica. Onde o código de hoje diverge de uma regra nova, a divergência é registrada e o arquivo de aplicação não é alterado.

Os rótulos de estado estão em [contexto.md](../contexto.md).

## Ordem de leitura

1. [Contexto](../contexto.md), para separar decisão adotada, implementação e plano.
2. Este índice, para saber qual documento vale para a tarefa.
3. [Estilo e nomenclatura](code-style-e-nomenclatura.md), se a tarefa cria ou edita código.
4. [TypeScript, funções e assincronismo](typescript-funcoes-e-assincronismo.md), se há tipo, Promise, erro ou concorrência.
5. [Clean Code e SOLID](clean-code-e-solid.md), antes de criar módulo, interface ou camada.
6. O documento da aplicação envolvida.
7. [Performance](performance.md), [código seguro](../seguranca/codigo-seguro.md) e [testes](../testes/unitarios-aaa.md), na medida do que a tarefa toca.
8. [Revisão](revisao-de-codigo.md), ao fechar a mudança.

Não é preciso reler o guia inteiro para um ajuste pequeno. É preciso abrir o documento da aplicação e as regras comuns que ele aponta.

## O que é comum

Vale para web, coletor, pacotes e, se um dia existir, API:

- estilo, nomes e fluxo de controle;
- tipagem, funções, Promises e erros;
- limite de abstração;
- segurança de código e testes unitários no formato AAA;
- revisão humana e o que o lint poderá passar a verificar.

## O que é específico

| Documento                                                    | Quando abrir                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [API](../api/padroes-de-desenvolvimento.md)                  | Somente se a tarefa for sobre `apps/api`. O componente continua opcional. |
| [Coletor](../collector/padroes-de-desenvolvimento.md)        | Coleta, validação, normalização, agendamento ou publicação.               |
| [Web](../web/padroes-de-desenvolvimento.md)                  | Interface, polling e leitura dos snapshots.                               |
| [Pacotes compartilhados](#pacotes-compartilhados)            | `packages/types`, `packages/validation` ou `packages/election-data`.      |
| [Consultas e transações](../dados/consultas-e-transacoes.md) | Somente se PostgreSQL entrar. Não faz parte da primeira versão.           |
| [Testes de segurança](../testes/seguranca.md)                | Ao provar um controle, no nível que realmente o demonstra.                |

Os documentos específicos apontam para cá em vez de repetir a regra comum. Se dois textos discordarem, vale o mais específico para o componente e, para o desenho do sistema, vale [arquitetura/README.md](../arquitetura/README.md). Uma contradição deve ser corrigida no documento, não convivendo em silêncio.

## Como consultar o guia antes de implementar

1. Nomeie a aplicação e o efeito observável da tarefa.
2. Confira se a tarefa pede um serviço que a arquitetura ainda não adotou. API dinâmica, PostgreSQL, Redis, fila, balanceador e função Worker não entram por conveniência.
3. Leia o documento da aplicação e as regras comuns ligadas por ele.
4. Separe o que já está no repositório do que este guia passa a exigir no código novo.
5. Se a regra não couber, registre uma exceção. Não desligue a regra em silêncio.

Nenhuma página deste guia autoriza criar endpoint, schema eleitoral, tabela ou recurso de nuvem.

## Como propor e registrar uma exceção

Uma exceção precisa de motivo, escopo, risco e registro. “O lint falhou” não é motivo.

- **Exceção pontual.** Comentário de desativação na linha, com o identificador da regra e a razão. O escopo é aquela ocorrência. A revisão recusa desativação de arquivo ou de diretório só para a verificação passar.
- **Exceção duradoura.** Entrada curta no documento da regra: identificador, motivo, escopo, risco e data. O código aponta para essa entrada. A entrada sai quando o motivo deixar de existir.

Proposta de exceção nova entra na revisão descrita em [revisao-de-codigo.md](revisao-de-codigo.md). Não se cria, nesta etapa, um registro paralelo fora de `docs/`.

## Pacotes compartilhados

Os três pacotes existem e exportam um módulo vazio. Nenhum `package.json` depende de outro pacote do workspace. Essa independência foi conferida nos manifestos em 14 de outubro de 2026.

| Pacote                    | Responsabilidade já descrita                                       | Estado                          |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------- |
| `@eleicoes/types`         | Tipos do contrato compartilhado, quando o contrato existir         | Export vazio                    |
| `@eleicoes/validation`    | Schemas Zod desse contrato                                         | Zod 4.6.7 instalado, sem schema |
| `@eleicoes/election-data` | Material eleitoral compartilhado, quando houver o que compartilhar | Export vazio                    |

### PKG-001. A dependência aponta dos aplicativos para os pacotes

**Nível:** Obrigatório, para o código novo.

**Regra:** `apps/*` pode depender de `packages/*`. Um pacote não importa `apps/web`, `apps/collector` nem `apps/api`. Pacotes não importam React enquanto nenhum deles for um pacote de interface. Hoje nenhum é.

**Justificativa:** O contrato precisa ser usável pelo coletor e pelo navegador sem carregar a tela nem o processo de coleta. A fronteira já está em [arquitetura/README.md](../arquitetura/README.md).

**Onde se aplica:** workspaces em `packages/*`.

**Exemplo adequado:** o coletor importa um schema de `@eleicoes/validation` quando esse schema existir. Ilustrativo: a dependência ainda não está declarada.

**Antipadrão:** o pacote de tipos importa um cliente HTTP do coletor para “aproveitar” um tipo interno.

**Verificação:** revisão da declaração de dependência e, mais tarde, regra de fronteira entre pastas. Não há essa regra no ESLint atual.

### PKG-002. O schema compartilhado é a fonte do tipo compartilhado

**Nível:** Obrigatório, quando o schema existir.

**Regra:** O tipo público do contrato sai do schema Zod com o utilitário de inferência da biblioteca, em vez de uma segunda declaração manual equivalente. Dados brutos do TSE não são o tipo público. A distinção está em [typescript-funcoes-e-assincronismo.md](typescript-funcoes-e-assincronismo.md).

**Justificativa:** Zod 4.6.7 já está em `@eleicoes/validation`. A página de uso básico, consultada em 14 de outubro de 2026, mostra inferência do tipo a partir do schema e tipos distintos de entrada e saída quando há transformação.

**Onde se aplica:** `packages/validation` e quem consumir o contrato.

**Exemplo adequado:** um schema pequeno e `z.infer` no mesmo módulo. O exemplo da biblioteca não é o contrato eleitoral deste projeto.

**Antipadrão:** interface escrita à mão ao lado de um schema com os mesmos campos, corrigida só quando os dois já divergiram.

**Verificação:** revisão do módulo do contrato. Não há schema no repositório para inspecionar hoje.

### PKG-003. Mudança de contrato é mudança de documentação

**Nível:** Obrigatório.

**Regra:** Alterar o formato que web e coletor compartilham atualiza [dados/README.md](../dados/README.md) no mesmo conjunto de mudanças. Pacote vazio não ganha tipo “provisório” que finja um campo ainda pendente.

**Justificativa:** O documento de dados já lista o que depende da especificação do TSE. Um tipo antecipado vira contrato por acidente.

**Onde se aplica:** `packages/types`, `packages/validation` e `packages/election-data`.

**Verificação:** a revisão confere se o diff do pacote e o diff do documento descrevem a mesma mudança.

## Portões de qualidade no ESLint

As regras `quality/*` ficam em `eslint-rules/`. Foram copiadas sem alteração do [vibe-coding-toolkit](https://github.com/soumatheusgomes/vibe-coding-toolkit/tree/main/templates/eslint) e não devem ser editadas aqui. Para atualizar, copie de novo os três `.cjs` da mesma revisão e meça outra vez.

| Regra                       | Escopo                                                             | Nível   | Linha de base (21/10/2026) |
| --------------------------- | ------------------------------------------------------------------ | ------- | -------------------------- |
| `quality/max-lines` (350)   | `apps/*/src`, `packages/*/src`                                     | `error` | 0                          |
| `quality/max-lines` (350)   | testes (`*.spec.*`, `*.test.*`, `testes/`)                         | `warn`  | 8 arquivos                 |
| `quality/no-direct-console` | `apps/*/src`, `packages/*/src`, exceto `apps/collector/src/cli.ts` | `error` | 0                          |

`quality/no-direct-data-access` não foi ligada, porque o projeto não tem cliente de banco. A migração termina quando os testes chegarem a zero e o bloco de testes voltar para `error`.

O nível com tipos roda à parte em `pnpm lint:typed` (`eslint.typed.config.mjs`), com todas as regras em `warn`. Leva cerca de 4 s e usa uns 700 MB. Linha de base: 62 avisos de `quality/max-lines`, `no-unsafe-*` e `require-await`.

## Níveis usados nas regras

| Nível       | Significado                                                         |
| ----------- | ------------------------------------------------------------------- |
| Obrigatório | Padrão do projeto para o código novo escrito pela equipe.           |
| Recomendado | Preferência que admite outra solução, com justificativa na revisão. |
| Condicional | Vale só quando o componente citado existir.                         |
| Pendente    | Depende de decisão que ainda não foi tomada.                        |

Identificadores como STYLE-001 e SEC-001 são locais. Não são números de requisito da OWASP.

Convenção de estilo não é controle de segurança nem promessa de desempenho. Essa separação está repetida nos documentos em que a confusão seria fácil.

## Referências

Consultadas em 14 de outubro de 2026:

- Zod, uso básico: <https://zod.dev/basics>

Os demais links ficam no documento que usa cada fonte.

[Voltar ao contexto](../contexto.md)
