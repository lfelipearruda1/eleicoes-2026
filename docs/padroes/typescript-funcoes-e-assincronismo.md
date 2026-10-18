# TypeScript, funções e assincronismo

[Voltar ao índice de padrões](README.md)

Como escolher tipo, forma de função, concorrência e tratamento de erro. Estilo de nome e `else` estão em [code-style-e-nomenclatura.md](code-style-e-nomenclatura.md).

`tsconfig.base.json` já liga `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `isolatedModules` e `forceConsistentCasingInFileNames`. Os aplicativos e os pacotes acrescentam `verbatimModuleSyntax` e `erasableSyntaxOnly`. TypeScript 6.0.3 é a versão do repositório.

## Tipagem

### TS-001. `strict` é a base

**Nível:** Obrigatório.

**Regra:** Código novo compila com `strict`. Não se enfraquece o `tsconfig` da base para fazer um arquivo passar.

**Onde se aplica:** todos os workspaces que estendem `tsconfig.base.json`.

**Verificação:** `pnpm typecheck`. Não foi executado para escrever este texto.

### TS-002. Dado externo chega como `unknown` e é validado em runtime

**Nível:** Obrigatório.

**Regra:** Resposta do TSE, arquivo lido do disco, corpo HTTP e JSON de snapshot entram como `unknown`, ou como o tipo de entrada de um schema, até a validação. O tipo TypeScript não substitui essa validação. A fronteira de confiança é o lugar da checagem: cliente da origem, leitura do snapshot e, se a API existir, o pipe.

**Justificativa:** O compilador apaga os tipos. JSON não os respeita. Zod 4.6.7 está instalado para essa checagem. A página de uso básico, consultada em 14 de outubro de 2026, mostra `.parse`, `.safeParse` e a falha com `ZodError` quando o valor não corresponde ao schema.

**Onde se aplica:** coletor, pacote de validação, leitura de snapshot na web e API futura.

**Exemplo adequado.** Ilustrativo. Não é schema eleitoral aprovado.

```ts
import { z } from 'zod'

const versionPointerSchema = z.object({
  versionId: z.string().min(1),
})

function readVersionPointer(input: unknown): string | undefined {
  const parsed = versionPointerSchema.safeParse(input)
  if (!parsed.success) {
    return undefined
  }

  return parsed.data.versionId
}
```

**Antipadrão:** `const body = (await response.json()) as ElectionPayload` sem schema.

**Verificação:** revisão da fronteira. Teste do schema quando ele existir, como em [testes/unitarios-aaa.md](../testes/unitarios-aaa.md).

### TS-003. `any`, asserção dupla e `!` não escondem buraco

**Nível:** Obrigatório para código novo.

**Regra:** Evitar `any`, `as unknown as` e asserção não nula. Exceção inevitável é local, justificada e vista na revisão. Preferir estreitamento (`if`, discriminação, `safeParse`) a asserção.

**Onde se aplica:** código novo.

**Divergência registrada:** `apps/web/src/main.tsx` contém `document.getElementById('root')!`. É o ponto de montagem gerado com a base do Vite. Não foi refatorado nesta etapa. Código novo de tela não copia esse `!` para dado de snapshot.

**Verificação:** revisão. O preset `recommended` do typescript-eslint já reclama de alguns usos de `any`. Não foi medido aqui quais casos ele cobre na versão 8.71.2.

### TS-004. Inferir por dentro, explicitar na fronteira

**Nível:** Recomendado.

**Regra:** Variável local pode usar inferência. Função exportada, método público e retorno de operação de fronteira declaram o tipo quando ele não for óbvio pela assinatura. Com `verbatimModuleSyntax`, import só de tipo usa `import type`.

**Onde se aplica:** módulos exportados dos pacotes e funções públicas dos aplicativos.

**Verificação:** `pnpm typecheck` e revisão da assinatura exportada.

### TS-005. Não duplicar schema e tipo à mão

**Nível:** Obrigatório, quando houver schema.

**Regra:** O tipo de um valor validado sai de `z.infer`, `z.input` ou `z.output`, conforme a página básica do Zod. Entrada e saída se separam quando o schema transforma o valor. Não manter uma interface manual equivalente.

**Onde se aplica:** `packages/validation` e consumidores. Detalhe de pacote em [README.md](README.md).

**Verificação:** revisão do módulo do schema. Hoje não há schema.

### TS-006. Bruto, normalizado e público são tipos diferentes

**Nível:** Obrigatório.

**Regra:** A resposta do TSE é dado bruto. O modelo normalizado é o que o coletor produz depois da validação. A representação pública é o snapshot que o navegador lê. Uma função não aceita os três no mesmo parâmetro sem dizer qual é.

**Justificativa:** [dados/README.md](../dados/README.md) já separa origem e contrato. O navegador não interpreta campo bruto.

**Onde se aplica:** coletor, pacotes e web.

**Exemplo adequado:** `normalizeElectionResult(raw: unknown): NormalizedSnapshot | ValidationFailure`. Os nomes são ilustrativos. Campos não estão aprovados.

**Antipadrão:** o componente React recebe o JSON do TSE e escolhe campos pelo nome oficial.

**Verificação:** revisão dos imports da web. Hoje `apps/web/src` não fala com o TSE.

### TS-007. `null`, `undefined`, ausência e lista vazia

**Nível:** Obrigatório.

**Regra:** Combinar, no contrato, um significado para cada caso:

- `undefined` ou campo omitido: a origem não trouxe o dado, ou ele ainda não existe.
- `null`: só se o contrato escolher `null` de propósito. Não usar os dois para a mesma ausência.
- lista vazia: a coleção existe e não tem itens.
- zero: o valor numérico zero foi informado. Não é ausência.

Até o schema existir, esta é a semântica que o código novo deve preservar. Ela não inventa o campo. [dados/README.md](../dados/README.md) já diz que ausência não é zero.

**Verificação:** testes de ausência, vazio e zero quando a normalização existir. A fórmula eleitoral continua pendente.

### TS-008. Contrato compartilhado permanece compatível

**Nível:** Obrigatório.

**Regra:** Mudança que o navegador já publicado não consiga ler exige versão do contrato, não um ajuste silencioso no pacote. A versão do contrato ainda é proposta em [dados/README.md](../dados/README.md). Não se remove campo público sem essa decisão.

**Onde se aplica:** `packages/types` e `packages/validation`.

**Verificação:** revisão conjunta de pacote, coletor e web.

## Formas de função

| Construção            | Quando usar                                        | Quando evitar                                                         | Exemplo                                          |
| --------------------- | -------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| Declaração `function` | Operação nomeada, reutilizável ou exportada        | Callback de uma linha                                                 | `function normalizeLabel(value: string): string` |
| Arrow function        | Callback e função local curta                      | Método que precise de `this` dinâmico                                 | `items.filter((item) => item.isCurrent)`         |
| Método de classe      | Comportamento da instância, inclusive serviço Nest | Função pura que não usa estado da instância                           | `readCurrent()` dentro de um serviço             |
| Função síncrona       | Cálculo ou decisão já em memória                   | Operação cujo contrato é I/O                                          | `isSnapshotFresh(publishedAt, now, maxAgeMs)`    |
| Função `async`        | O contrato espera uma Promise                      | Trabalho só de CPU, “por hábito”                                      | `async function publishSnapshot(...)`            |
| Callback              | API que já pede callback, ou predicado de coleção  | Cadeia longa de callbacks quando `async`/`await` expressa a sequência | predicado de `filter`                            |
| Função pura           | Regra de domínio sem I/O                           | Quando o efeito é o objetivo da função                                | normalizar um valor já em memória                |
| Função com efeito     | Publicar, gravar, agendar, registrar               | Escondida dentro de `map`                                             | `publishSnapshot`                                |

### TS-009. Arrow e `async` não são alternativas

**Nível:** Obrigatório. Esclarecimento de linguagem.

**Regra:** Uma arrow pode ser `async`. Escolher arrow não decide se a função espera I/O. Escolher `async` não decide se ela é callback. `async` envolve o retorno em Promise. A página da MDN sobre `async function`, consultada em 14 de outubro de 2026, mostra que o retorno não Promise é embrulhado e que `await` suspende até a Promise assentar.

**Onde se aplica:** todo TypeScript do repositório.

**Exemplo adequado de função síncrona.** Ilustrativo. `maxAgeMs` é parâmetro, não meta do projeto.

```ts
function isSnapshotFresh(
  publishedAt: Date,
  now: Date,
  maxAgeMs: number,
): boolean {
  return now.getTime() - publishedAt.getTime() <= maxAgeMs
}
```

**Exemplo adequado de callback arrow.** Ilustrativo.

```ts
const freshSnapshots = snapshots.filter((snapshot) =>
  isSnapshotFresh(snapshot.publishedAt, now, maxAgeMs),
)
```

**Verificação:** revisão da assinatura. Não converter método em propriedade arrow em massa.

### TS-010. `this` de arrow e `this` de método

**Nível:** Obrigatório.

**Regra:** Arrow captura `this` do lugar em que foi criada. Método obtém `this` da chamada. Não transformar todo método de classe em propriedade arrow. No coletor, preferir função de módulo quando não houver `this`. Na API, o método de serviço continua método, com injeção no construtor.

**Justificativa:** Propriedade arrow muda a semântica e, com `erasableSyntaxOnly`, nem toda forma de classe dos exemplos de framework é automaticamente aceita. A compatibilidade com Nest está em [api/padroes-de-desenvolvimento.md](../api/padroes-de-desenvolvimento.md).

**Onde se aplica:** classes, se existirem. Hoje não há classe de aplicação.

**Verificação:** revisão. Não há lint de `this` específico além do que o `recommended` já fizer.

### TS-011. `async` segue o contrato, e não paraleliza CPU

**Nível:** Obrigatório.

**Regra:** Usar `async` quando a operação for assíncrona. Não marcar função síncrona como `async` por hábito. Não devolver ora um valor direto, ora uma Promise, para a mesma operação, salvo se o contrato documentar essa união. `async` não move cálculo pesado para outro núcleo. O guia do Node.js sobre não bloquear o event loop, consultado em 14 de outubro de 2026, separa o loop de eventos do pool de workers: JavaScript de callback roda no loop, e trabalho longo nesse loop impede o processo de atender o resto.

**Onde se aplica:** coletor, web e API futura.

**Antipadrão:** `async function sumVotes(values: readonly number[])` que só soma um array já em memória.

**Verificação:** revisão e, se houver suspeita de bloqueio, medição descrita em [performance.md](performance.md).

## Coleções

### TS-012. O método diz se há transformação, seleção ou efeito

**Nível:** Obrigatório.

**Regra:**

- `map` transforma e devolve outra coleção.
- `filter` seleciona.
- `some` e `every` respondem predicado.
- `for...of` serve a sequência, interrupção ou efeito claro.
- `reduce` fica quando a agregação continua legível. Se precisar de comentário para explicar o acumulador, um `for...of` é melhor.
- Não usar `map` só pelo efeito.
- Não usar `forEach(async ...)` esperando que ele aguarde. O `async` devolve uma Promise que o `forEach` não espera.

**Onde se aplica:** código novo.

**Antipadrão:** `files.map(async (file) => publish(file))` sem tratar as Promises.

**Verificação:** revisão. A regra `no-misused-promises`, ainda não ligada, aponta `forEach(async ...)` quando a informação de tipos está disponível. Ver [revisao-de-codigo.md](revisao-de-codigo.md).

## Concorrência

### TS-013. Limitar o que dispara junto

**Nível:** Obrigatório.

**Regra:**

- `await` em sequência quando a próxima etapa depende da anterior ou a ordem importa.
- Concorrência limitada quando as operações são independentes.
- `Promise.all` só para um conjunto de tamanho conhecido ou limitado.
- Não disparar um número ilimitado de operações.
- A rejeição de `Promise.all` rejeita o agregado. Ela não cancela, por si, o que as outras operações já começaram. Cancelamento pede `AbortSignal` ou outro mecanismo explícito, mais limpeza.
- Tratar timeout e liberar recurso no caminho de falha.
- Não usar `setInterval` com callback `async` se um ciclo puder ainda estar rodando quando o próximo disparar. O coletor exige um ciclo por vez em [collector/padroes-de-desenvolvimento.md](../collector/padroes-de-desenvolvimento.md).
- Não passar função `async` como executor de `new Promise`.
- Não embrulhar uma Promise só para devolvê-la de novo.

**Justificativa:** A página de `async function` da MDN, consultada em 14 de outubro de 2026, mostra que criar duas Promises e dar `await` nelas em série não é o mesmo que `Promise.all`: se a segunda rejeitar antes de a primeira cumprir, a rejeição pode ficar sem tratamento. Também mostra que `Promise.all` liga a cadeia de uma vez e falha rápido. A página não descreve cancelamento das demais. O limite de concorrência do coletor protege a origem oficial; o número continua pendente.

**Onde se aplica:** coleta, publicação e polling.

**Exemplo adequado de falha assíncrona.** Ilustrativo. `return await` está dentro do `try` para o `catch` ver a rejeição. Ver TS-015.

```ts
class PublishError extends Error {
  override readonly name = 'PublishError'
}

async function publishSnapshot(
  versionId: string,
  publisher: {
    putVersion: (versionId: string) => Promise<void>
    updateManifest: (versionId: string) => Promise<void>
  },
): Promise<void> {
  try {
    await publisher.putVersion(versionId)
    return await publisher.updateManifest(versionId)
  } catch (error) {
    throw new PublishError('Falha ao publicar o snapshot.', { cause: error })
  }
}
```

**Antipadrão:** `new Promise(async (resolve, reject) => { ... })`.

**Verificação:** teste com timers falsos e revisão do limite. Teste unitário não mede a origem oficial.

## Erros

### TS-014. Promise é aguardada, devolvida ou tratada

**Nível:** Obrigatório.

**Regra:** Toda Promise é aguardada, devolvida ou tem tratamento explícito da rejeição. `void` na frente da chamada marca que o autor não vai aguardar; a página de `no-floating-promises`, consultada em 14 de outubro de 2026, diz que isso não trata a rejeição. `catch` vazio não é tratamento. Não converter erro qualquer em `[]`, `null` ou sucesso. Não espalhar `try/catch` que só relança o mesmo erro sem contexto. Capturar onde houver recuperação, tradução de fronteira ou contexto útil. Guardar a causa interna. Não colocar stack trace, token ou corpo bruto em resposta e log públicos.

Separar:

- falha de validação: o dado não serve para publicar nem para exibir como apuração;
- indisponibilidade transitória: timeout, rede, bloqueio, resposta incompleta;
- defeito de programação: invariante que o código deveria ter impedido.

Cada operação pública define o que faz na falha. O coletor não troca o manifesto. A tela conserva a última versão válida. Não introduzir um tipo genérico `Result` para o projeto inteiro sem uma operação que fique mais clara com ele. `safeParse` já devolve um resultado discriminado na fronteira Zod; isso não obriga o mesmo invólucro em toda função.

**Onde se aplica:** coletor, web, pacotes e API futura. Logs em [seguranca/codigo-seguro.md](../seguranca/codigo-seguro.md).

**Antipadrão:**

```ts
try {
  await publisher.updateManifest(versionId)
} catch {
  return null
}
```

O `catch` vazio e o `null` escondem se o manifesto anterior continua valendo.

**Verificação:** revisão e testes de falha. `no-floating-promises` ainda não está ligado.

### TS-015. `return await` dentro de `try`, `catch` e `finally`

**Nível:** Obrigatório nesse contexto. Fora dele, recomendado ser consistente, sem proibição geral.

**Regra:** Dentro de `try`, `catch` ou `finally`, aguardar a Promise devolvida quando a rejeição precisar passar pelo `catch` ou o `finally` precisar terminar antes de o chamador observar a falha. Não adotar `no-return-await` como proibição geral. A regra antiga do ESLint foi substituída, no typescript-eslint, por `@typescript-eslint/return-await`, que distingue contexto comum e contexto de tratamento de erro. A página dessa regra, consultada em 14 de outubro de 2026, marca a opção `never` como prejudicial e obsoleta.

**Onde se aplica:** funções `async` novas.

**Verificação:** revisão dos `return` dentro de `try`. A regra de lint pede informação de tipos e ainda não está configurada.

### TS-016. `finally` libera recurso sem apagar o erro

**Nível:** Obrigatório.

**Regra:** Temporizador, requisição e alça de arquivo ou de cliente que precisem de encerramento explícito são liberados em `finally`, ou por cancelamento no cleanup do React. O `finally` não substitui o erro original por um sucesso. Se a liberação também falhar, preservar a falha da operação e registrar a falha da liberação à parte.

**Onde se aplica:** coletor, efeitos React e API futura.

**Verificação:** teste de cancelamento e revisão do caminho de exceção.

## Referências

Consultadas em 14 de outubro de 2026:

- Zod, uso básico: <https://zod.dev/basics>
- MDN, `async function`: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function>
- Node.js, não bloquear o event loop: <https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop>
- typescript-eslint, `no-floating-promises`: <https://typescript-eslint.io/rules/no-floating-promises/>
- typescript-eslint, `no-misused-promises`: <https://typescript-eslint.io/rules/no-misused-promises/>
- typescript-eslint, `return-await`: <https://typescript-eslint.io/rules/return-await/>

Não consultadas nesta data, e por isso sem afirmação extraída delas: o handbook de funções do TypeScript e a página da MDN sobre arrow functions. Arrow e `this` acima seguem o comportamento de linguagem usado por este guia; a página da arrow não foi reaberta.

[Voltar ao índice de padrões](README.md)
