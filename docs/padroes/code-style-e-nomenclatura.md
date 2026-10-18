# Estilo e nomenclatura

[Voltar ao índice de padrões](README.md)

Regras de forma do código novo. Elas não mudam os arquivos de configuração nesta etapa. O que o Prettier e o EditorConfig já fazem permanece.

## Formatação

### STYLE-001. Prettier formata; ESLint não compete com ele

**Nível:** Obrigatório.

**Regra:** Prettier 3.9.10 é a referência de formatação automática. ESLint 10.12.0 fica com qualidade. `eslint-config-prettier` já encerra a configuração e desliga regras de formato que conflitariam com o Prettier.

**Justificativa:** Dois formatadores discordando produzem diff sem mudança de comportamento. A configuração atual já separa os papéis.

**Onde se aplica:** TypeScript, TSX e os demais arquivos que `pnpm format` alcança. `.prettierignore` exclui `node_modules`, `dist`, `coverage`, `pnpm-lock.yaml` e `.vite`.

**Verificação:** `pnpm format:check` e `pnpm lint`. Nenhum dos dois foi executado para redigir este documento.

### STYLE-002. Preservar o que já está configurado

**Nível:** Obrigatório.

**Regra:** As escolhas explícitas e consistentes ficam como estão.

| Opção                                     | Onde está          | Efeito adotado                                                                                             |
| ----------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `semi: false`                             | `.prettierrc.json` | Sem ponto e vírgula. A sugestão genérica de usar ponto e vírgula não se aplica: a configuração existe.     |
| `singleQuote: true`                       | `.prettierrc.json` | Aspas simples.                                                                                             |
| `trailingComma: "all"`                    | `.prettierrc.json` | Vírgula final onde a linguagem permite.                                                                    |
| `indent_size = 2`, `indent_style = space` | `.editorconfig`    | Dois espaços.                                                                                              |
| `end_of_line = lf`                        | `.editorconfig`    | LF.                                                                                                        |
| `insert_final_newline = true`             | `.editorconfig`    | Linha final nos arquivos que o EditorConfig cobre. Em Markdown, `trim_trailing_whitespace` fica desligado. |

O código já segue a ausência de ponto e vírgula e as aspas simples, como em `apps/web/src/App.tsx` e `apps/collector/src/index.ts`.

**Verificação:** leitura de `.prettierrc.json` e `.editorconfig`. Não alterar esses arquivos para “alinhar” a uma preferência de fora.

### STYLE-003. Largura de 100 caracteres é proposta, não configuração

**Nível:** Pendente.

**Regra:** `.prettierrc.json` não define `printWidth`. Enquanto a opção não for escrita, o Prettier instalado usa o padrão da própria ferramenta. A largura de 100 caracteres, sugerida para o caso de configuração ausente, fica proposta. Adotá-la exige editar a configuração, e esta etapa não edita configuração.

A página de opções do Prettier não foi aberta em 14 de outubro de 2026. Não se afirma aqui o número exato do padrão da versão 3.9.10. Quem for decidir confere a documentação da versão instalada e o resultado de `pnpm format` antes de mudar o arquivo.

**Onde se aplica:** só uma futura alteração de `.prettierrc.json`.

**Verificação:** presença ou ausência da chave `printWidth`. Hoje está ausente.

## Nomenclatura

### STYLE-004. Inglês no identificador, português na explicação

**Nível:** Obrigatório.

**Regra:** Funções, variáveis, tipos, componentes, arquivos de código e mensagens de teste automatizado que nomeiam comportamento usam inglês nos identificadores. Documentação, comentários de intenção e a descrição do `it` usam português. O `it` está especificado em [testes/unitarios-aaa.md](../testes/unitarios-aaa.md).

**Justificativa:** A stack e as bibliotecas estão em inglês. Quem lê o produto lê português. Misturar os dois no mesmo identificador dificulta busca e revisão.

**Onde se aplica:** código em `apps/` e `packages/`. Textos visíveis ao visitante continuam em português, porque são conteúdo, não identificador.

**Exemplo adequado:** `function isSnapshotFresh` no código e “o snapshot passou do prazo” no comentário ou no documento.

**Antipadrão:** `function snapshotEstaFresco` ou um comentário em inglês que só repete o nome da função.

**Verificação:** revisão. Não há regra de lint para o idioma.

### STYLE-005. Caixa conforme o papel

**Nível:** Obrigatório.

**Regra:**

- `camelCase` para funções, variáveis e parâmetros.
- `PascalCase` para componentes React, classes e tipos.
- Hook com prefixo `use`.
- Booleano com nome de condição: `isValid`, `hasResults`, `canPublish`.
- `UPPER_SNAKE_CASE` para constante global de configuração ou de domínio. Não é a caixa de todo `const`.

**Justificativa:** A caixa diz o papel do nome antes da leitura do corpo. Um `const` local que guarda um resultado não é configuração global.

**Onde se aplica:** código novo em todos os workspaces.

**Exemplo adequado:**

```ts
const publishedAt = new Date('2026-10-25T00:00:00Z')
const MAX_RESPONSE_BYTES = 1_000_000
```

O número é ilustrativo. O projeto ainda não adotou limite de tamanho; o valor real continua pendente em [collector/README.md](../collector/README.md).

**Antipadrão:** `const PUBLISHED_AT = new Date()` para um instante local, ou `const flag = true` sem dizer a condição.

**Verificação:** revisão.

### STYLE-006. Sem prefixo `I` e sem nome vazio

**Nível:** Obrigatório.

**Regra:** Interface não ganha prefixo `I` por hábito. Nome genérico (`data`, `item`, `manager`, `helper`, `utils`) só permanece quando não houver nome mais informativo no contexto. Um parâmetro curto de callback, como o elemento de um `map` já delimitado pelo tipo, pode ser curto. O módulo não pode se chamar `helper` para esconder a operação.

**Justificativa:** O prefixo `I` não acrescenta contrato. Nome genérico obriga o leitor a abrir a implementação para saber o que muda.

**Onde se aplica:** tipos e módulos novos.

**Exemplo adequado:** `interface SnapshotPublisher` e `function publishSnapshot`.

**Antipadrão:** `interface IData` e `class SnapshotManagerHelper`.

**Verificação:** revisão. Não há tipo com prefixo `I` no código atual; os pacotes exportam vazio.

## Arquivos

### STYLE-007. O nome do arquivo segue o artefato

**Nível:** Obrigatório para arquivo novo.

**Regra:**

| Artefato                                        | Nome                                                  |
| ----------------------------------------------- | ----------------------------------------------------- |
| Módulo de backend, função utilitária, adaptador | `kebab-case.ts`                                       |
| Componente React                                | `PascalCase.tsx`                                      |
| Hook                                            | `useNomeDoHook.ts`                                    |
| Módulo Nest, se a API existir                   | sufixos `.module.ts`, `.controller.ts`, `.service.ts` |
| Teste                                           | `.spec.ts` ou `.spec.tsx`, ao lado da unidade         |

Ponto de entrada já usado permanece: `main.tsx`, `index.ts`, `vite.config.ts`. Não se renomeia `App.tsx`. O componente de entrada exporta função default, e `main.tsx` importa esse default. Componente novo de funcionalidade usa export nomeado. Mudar o `App` atual só por causa dessa preferência está fora desta etapa.

**Justificativa:** O repositório já tem `App.tsx` em PascalCase e módulos `index.ts`. Testes ainda não existem. Vitest 5.0.4 está na raiz, sem `vitest.config` visto no repositório; a convenção `.spec` precisa ser compatível com o padrão do Vitest quando a suíte for criada. Confirmar o padrão de descoberta na versão instalada antes do primeiro teste, sem instalar outra ferramenta agora.

**Onde se aplica:** arquivos novos. A árvore ilustrativa de cada aplicativo está no documento daquele aplicativo.

**Divergência registrada:** não há arquivos de teste para comparar. Não há módulos Nest.

**Verificação:** revisão do caminho do arquivo novo.

## Nomes que indicam intenção

### STYLE-008. O prefixo sugere a operação e não substitui o contrato

**Nível:** Recomendado.

**Regra:** Preferir um verbo que diga o efeito.

| Nome                      | Uso                                       |
| ------------------------- | ----------------------------------------- |
| `fetchElectionResult`     | Busca externa. Não normaliza nem publica. |
| `publishSnapshot`         | Efeito de publicação.                     |
| `normalizeElectionResult` | Transformação para o modelo interno.      |
| `isSnapshotFresh`         | Consulta de condição, sem efeito.         |
| `handleStateSelection`    | Tratamento de evento na interface.        |
| `onStateSelect`           | Callback recebido por um componente.      |

O prefixo não documenta timeout, formato nem o que acontece na falha. Isso fica no tipo de retorno e, se a operação cruzar uma fronteira, no documento do contrato.

**Justificativa:** Buscar, transformar e publicar são responsabilidades diferentes, já separadas na arquitetura. O nome ajuda a não juntá-las. Não cria, sozinho, essa separação.

**Onde se aplica:** funções novas de coleta, publicação e interface. Os nomes acima são ilustrativos. Não existem no código e não fecham campo de payload.

**Antipadrão:** `processData` para uma função que busca no TSE, grava arquivo e devolve JSX.

**Verificação:** revisão do nome junto com o tipo. Não há lint de prefixo, e não se deve criar uma lista fechada de prefixos permitidos.

## Fluxo de controle

### STYLE-009. `if` é permitido; `else` e `else if` não entram no código novo

**Nível:** Obrigatório. Convenção deste projeto, não recomendação de segurança nem de desempenho.

**Regra:**

- `if` é permitido.
- Preferir cláusula de guarda e retorno antecipado.
- Código novo escrito pela equipe não usa `else` nem `else if`.
- Não se troca `else` por ternário aninhado.
- Não se criam objeto de despacho, polimorfismo ou classe apenas para eliminar um `if`.
- Condição que expressa regra de negócio permanece explícita.
- `switch` pode ser usado quando representar melhor um conjunto finito de alternativas.
- Verificação de segurança não é removida para reduzir o número de condicionais.
- Bloco condicional usa chaves.

`else` pode aparecer neste guia só em exemplo marcado como antipadrão ou em citação externa.

**Justificativa:** Guardas mantêm a validação na ordem em que ela acontece e deixam o caminho principal no final da função. Eliminar o `if` com uma abstração nova aumenta código sem mudar a regra. A página do ESLint sobre `no-else-return`, consultada em 14 de outubro de 2026, não proíbe todo `else`: a regra aponta `else` depois de `return`, e `allowElseIf` vem ligado por padrão. A proibição deste projeto é mais ampla: vale para todo `else` e todo `else if` no código novo, não só para o `else` que segue um `return`. Como automatizá-la está em [revisao-de-codigo.md](revisao-de-codigo.md).

**Onde se aplica:** código novo da equipe em `apps/` e `packages/`. Código gerado ou de terceiros não é reformatado só para obedecer a esta regra.

**Exemplo adequado.** Ilustrativo. A ordem de checagem e os resultados observáveis são: entrada ausente, entrada estruturalmente inválida, falha de escrita conservando o manifesto anterior, sucesso devolvendo o manifesto novo. Não é a função real de publicação.

```ts
type ManifestPointer = { readonly versionId: string }

type PublishInput = {
  readonly candidateFiles: readonly string[]
  readonly isStructurallyValid: boolean
  readonly previousManifest: ManifestPointer
  readonly nextManifest: ManifestPointer
}

type PublishOutcome =
  | {
      readonly published: false
      readonly reason: 'missing' | 'invalid' | 'write-failed'
      readonly manifest?: ManifestPointer
    }
  | { readonly published: true; readonly manifest: ManifestPointer }

function decidePublication(
  input: PublishInput | undefined,
  writeFiles: (files: readonly string[]) => { readonly ok: boolean },
): PublishOutcome {
  if (!input) {
    return { published: false, reason: 'missing' }
  }

  if (!input.isStructurallyValid) {
    return { published: false, reason: 'invalid' }
  }

  const stored = writeFiles(input.candidateFiles)
  if (!stored.ok) {
    return {
      published: false,
      reason: 'write-failed',
      manifest: input.previousManifest,
    }
  }

  return { published: true, manifest: input.nextManifest }
}
```

**Antipadrão.** O bloco abaixo usa `else` de propósito, para mostrar o que não escrever. Não copiar.

```ts
function decidePublicationNested(
  input: PublishInput | undefined,
  writeFiles: (files: readonly string[]) => { readonly ok: boolean },
): PublishOutcome {
  if (!input) {
    return { published: false, reason: 'missing' }
  } else {
    if (!input.isStructurallyValid) {
      return { published: false, reason: 'invalid' }
    } else {
      const stored = writeFiles(input.candidateFiles)
      if (!stored.ok) {
        return {
          published: false,
          reason: 'write-failed',
          manifest: input.previousManifest,
        }
      } else {
        return { published: true, manifest: input.nextManifest }
      }
    }
  }
}
```

**Citação externa.** O catálogo de refatoração mostra o mesmo movimento, com `else` apenas no código de partida. O código de partida não segue nossas chaves obrigatórias. Fonte consultada em 14 de outubro de 2026: <https://refactoring.com/catalog/replaceNestedConditionalWithGuardClauses.html>.

**Verificação:** revisão do diff. A regra de lint correspondente ainda não está ligada. O código atual da aplicação não contém `else`.

### STYLE-010. Ternário simples, nunca aninhado

**Nível:** Obrigatório.

**Regra:** Ternário é permitido quando a expressão é curta, não tem efeito colateral e é mais legível do que um `if`. É proibido aninhar ternários. Evitar ternário longo ou usado para disparar comando. Evitar `condicao ? true : false`. Não se extrai um componente só para esconder um ternário simples de JSX.

**Justificativa:** Ternário aninhado reintroduz o desvio que a guarda deveria deixar plano. A regra ESLint `no-nested-ternary` rejeita aninhamento. A regra `no-unneeded-ternary` rejeita a escolha entre `true` e `false`. As duas foram lidas em 14 de outubro de 2026. O exemplo “correto” de `no-nested-ternary` na documentação do ESLint usa `else` e `else if`; esse exemplo não é modelo deste projeto. `no-unneeded-ternary` sugere `||` para alguns padrões de atribuição; isso pode apagar `0` e `false`, o que STYLE-012 proíbe. Não ligar as regras sem esse cuidado. Detalhe em [revisao-de-codigo.md](revisao-de-codigo.md).

**Onde se aplica:** TypeScript e TSX novos.

**Exemplo adequado:** `const label = hasResults ? 'disponível' : 'indisponível'`.

**Antipadrão:** `isValid ? true : false`. Outro antipadrão, com aninhamento: `ready ? publish() : cached ? showCached() : showEmpty()`.

**Verificação:** revisão. As regras citadas não estão em `eslint.config.mjs`.

### STYLE-011. `switch` para um conjunto finito, não como fuga de `if`

**Nível:** Recomendado.

**Regra:** `switch` cabe quando as alternativas são um conjunto pequeno e conhecido, por exemplo o estado de disponibilidade já nomeado na interface: carregando, disponível, ausente, falha. Cada braço termina de modo explícito. `noFallthroughCasesInSwitch` já está ligado em `tsconfig.base.json`. Não se cria `switch` com uma única alternativa para evitar um `if`.

**Onde se aplica:** código novo.

**Verificação:** `pnpm typecheck`, quando houver `switch`, e revisão da completude dos casos. O compilador não exige `else`.

## Outras regras de escrita

### STYLE-012. `const`, mutação e `??`

**Nível:** Obrigatório.

**Regra:** Preferir `const`. Usar `let` quando a reatribuição for legítima. Não mutar argumento nem estado compartilhado para comunicar resultado; devolver um valor novo. `??` só substitui `null` ou `undefined`. `||` também substitui `0` e `false`. Quando zero, falso ou texto vazio forem valores válidos, não usar `||` para “preencher buraco”.

**Justificativa:** Ausência de voto e zero voto já são estados diferentes no produto. Um preenchimento por `||` mistura os dois. Isso é correção de domínio, não um enfeite de estilo. A regra de segurança correspondente está em [seguranca/codigo-seguro.md](../seguranca/codigo-seguro.md).

**Onde se aplica:** todo código novo que leia número, booleano ou texto que possa ser vazio de propósito.

**Exemplo adequado:** `const votes = raw.votes ?? undefined`, quando `undefined` significa campo ausente e `0` significa zero informado. Ilustrativo: não há campo `votes` aprovado.

**Antipadrão:** `const votes = raw.votes || 0`.

**Verificação:** revisão dos operadores em fronteira de dado. Não há lint específico configurado.

### STYLE-013. Tamanho, comentário e código morto

**Nível:** Obrigatório para comentário e código morto. Recomendado para o tamanho.

**Regra:** Não há limite arbitrário de linhas que defina função limpa. Função longa se divide quando mistura motivos de mudança, não quando atravessa um número. Comentário explica intenção, restrição ou decisão. Não repete a sintaxe. Não se deixa código morto nem bloco grande comentado.

**Justificativa:** Um teto de linhas empurra extração sem responsabilidade nova, o contrário de [clean-code-e-solid.md](clean-code-e-solid.md).

**Onde se aplica:** código novo.

**Exemplo adequado:** um comentário que diga por que um redirecionamento não é seguido, apontando a decisão do coletor.

**Antipadrão:** `// incrementa i` acima de `i += 1`, ou uma função antiga inteira comentada “por garantia”.

**Verificação:** revisão. `noUnusedLocals` e `noUnusedParameters` já estão em `tsconfig.base.json` e pegam parte do código morto, não um bloco comentado.

## Divergências já vistas

- `apps/web/src/main.tsx` usa asserção não nula em `getElementById('root')!`. A regra que limita esse recurso está em [typescript-funcoes-e-assincronismo.md](typescript-funcoes-e-assincronismo.md). O arquivo não foi alterado.
- Não há `else` no código de aplicação atual. A proibição ainda não está no ESLint.
- `printWidth` não está configurado. Ver STYLE-003.

## Referências

Consultadas em 14 de outubro de 2026:

- ESLint, `no-else-return`: <https://eslint.org/docs/latest/rules/no-else-return>
- ESLint, `no-nested-ternary`: <https://eslint.org/docs/latest/rules/no-nested-ternary>
- ESLint, `no-unneeded-ternary`: <https://eslint.org/docs/latest/rules/no-unneeded-ternary>
- Catálogo de refatoração, substituir condicional aninhada por cláusulas de guarda: <https://refactoring.com/catalog/replaceNestedConditionalWithGuardClauses.html>

A página de opções do Prettier não foi consultada nesta data.

[Voltar ao índice de padrões](README.md)
