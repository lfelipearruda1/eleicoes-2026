# Padrões de desenvolvimento da API

[Voltar à API](README.md) · [Padrões comuns](../padroes/README.md)

`apps/api` continua opcional e fora da primeira versão. A pasta só tem `.gitkeep`. Não há `package.json`, NestJS, Fastify, endpoint, banco nem teste HTTP. Este documento não autoriza criar endpoint nem instalar dependência.

Se a API for introduzida, a stack prevista é NestJS com Fastify, em Node.js. Não é função Worker e não é o runtime de Workers Static Assets. Redis, PostgreSQL e balanceador não entram junto. Os critérios para existir API estão em [README.md](README.md).

Estilo, tipos, abstração e revisão: [estilo](../padroes/code-style-e-nomenclatura.md), [TypeScript](../padroes/typescript-funcoes-e-assincronismo.md), [Clean Code](../padroes/clean-code-e-solid.md), [revisão](../padroes/revisao-de-codigo.md).

## API-001. Organizar por funcionalidade

**Nível:** Condicional. Vale no dia em que a API for criada.

**Regra:** Cada funcionalidade é um módulo Nest com fronteira explícita. O módulo compõe dependências. Não se copia a árvore do coletor nem a da web para dentro do Nest, e não se leva controller para o React.

Árvore ilustrativa. Não criar estes arquivos agora. `<funcionalidade>` não é rota aprovada.

```text
apps/api/src/
  main.ts
  app.module.ts
  <funcionalidade>/
    <funcionalidade>.module.ts
    <funcionalidade>.controller.ts
    <funcionalidade>.service.ts
    <regra>.ts
    <adaptador>.ts
```

Nomes de arquivo seguem STYLE-007.

**Verificação:** a revisão recusa pasta `controllers/` global que misture funcionalidades sem módulo.

## Responsabilidades

A documentação de módulos do Nest, consultada em 14 de outubro de 2026, descreve o módulo como unidade que declara `providers`, `controllers`, `imports` e `exports`. Provider não exportado não é injetável em quem importa o módulo. A documentação de controllers, na mesma data, diz que o controller recebe o pedido e devolve a resposta.

| Peça                   | Responsabilidade                                                           |
| ---------------------- | -------------------------------------------------------------------------- |
| Module                 | Compõe e expõe só o que outro módulo precisa                               |
| Controller             | Adapta HTTP, delega e produz a resposta                                    |
| Pipe                   | Valida e transforma a entrada na fronteira                                 |
| Guard                  | Decide acesso quando a operação exige acesso                               |
| Service ou caso de uso | Executa a operação de aplicação                                            |
| Função de domínio      | Regra que não conhece transporte                                           |
| Adapter ou repository  | Acesso externo ou persistência, se existir                                 |
| Interceptor            | Comportamento transversal que caiba no pipeline, como medida ou correlação |
| Exception filter       | Traduz falha na fronteira HTTP, sem vazar detalhe interno                  |

### API-002. Uma camada de aplicação, não duas vazias

**Nível:** Condicional.

**Regra:** Controller não contém SQL, SDK de armazenamento nem cálculo eleitoral. Não se cria service e caso de uso quando um dos dois só chama o outro com os mesmos argumentos. Regras de negócio não conhecem `Request` e `Response` do Fastify. Validação de formato não é autorização e não é invariante de negócio: formato é pipe, acesso é guard, regra da operação fica na função de domínio ou no serviço.

**Justificativa:** Camada que só repassa parâmetro é o que [clean-code-e-solid.md](../padroes/clean-code-e-solid.md) recusa. A página de pipes do Nest, consultada em 14 de outubro de 2026, recomenda validar na fronteira, antes do método da rota.

**Exemplo adequado.** Ilustrativo. Não é endpoint aprovado. A operação lê um ponteiro já publicado; não fala com o TSE.

```ts
export function assertVersionId(versionId: string): string {
  if (versionId.length === 0) {
    throw new Error('Identificador de versão vazio.')
  }

  return versionId
}
```

O controller chamaria o serviço. O serviço chamaria esta função. Nenhum dos dois monta URL do TSE.

**Antipadrão:** método de controller com cliente SQL e regra de percentual no mesmo corpo.

**Verificação:** revisão de imports do controller. Teste isolado do serviço não prova que o controller está fino; a leitura do código prova.

### API-003. Injeção explícita, token em runtime, pouco export

**Nível:** Condicional.

**Regra:** Dependência entra pelo construtor. Interface TypeScript some na compilação e não serve de token. A página de custom providers do Nest, consultada em 14 de outubro de 2026, diz para usar string ou `Symbol` quando o contrato for interface, e `@Inject` com esse token. Classe abstrata pode ser token porque existe em runtime. Exportar só os providers que outro módulo usa. Não marcar módulo como global por conveniência: a página de módulos diz que global reduz boilerplate e aumenta acoplamento, e que o desenho recomendado é o `imports` explícito.

Não usar `forwardRef` como solução automática de ciclo. Ciclo de módulo indica que a fronteira está errada; quebrar o ciclo vem antes do atalho do framework. A página de `forwardRef` não foi consultada nesta data; a recusa é regra do projeto.

Provider de escopo padrão é singleton. Não guardar dado mutável de um pedido nesse provider. Estado do pedido fica no argumento da chamada ou num provider de escopo de pedido, se um dia o requisito existir. A página de custom providers lembra que o escopo padrão reutiliza a instância.

**Onde se aplica:** módulos da API futura.

**Antipadrão:** `providers` com token de interface sem `Symbol`, ou `@Global()` em todo módulo.

**Verificação:** teste de composição que resolve o grafo, descrito abaixo. Hoje não há grafo.

### API-004. Fastify não herda middleware Express

**Nível:** Condicional.

**Regra:** Usar API compatível com Fastify. A página de performance do Nest, consultada em 14 de outubro de 2026, diz que receitas feitas para Express podem não funcionar com o `FastifyAdapter`, e que o middleware recebe o pedido e a resposta crus por baixo do `@fastify/middie`. Não copiar middleware Express assumindo compatibilidade. Não assumir que o processo escuta fora de localhost: a mesma página diz que o padrão do Fastify é a interface local e que outro host precisa ser passado a `listen`.

Fastify mais rápido num benchmark do framework não é capacidade deste sistema. Ver [performance.md](../padroes/performance.md).

**Verificação:** teste HTTP com o adapter Fastify, não com o adapter Express padrão.

### API-005. `erasableSyntaxOnly` precisa ser decidido junto

**Nível:** Pendente.

**Regra:** Os `tsconfig` de coletor, web e pacotes ligam `verbatimModuleSyntax` e `erasableSyntaxOnly`. A base não liga `erasableSyntaxOnly`. Exemplos oficiais de Nest usam propriedade de parâmetro no construtor (`constructor(private readonly service: Service)`). Essa forma pode ser incompatível com `erasableSyntaxOnly`. A API futura não copia o `tsconfig` do coletor sem testar a compilação dos decorators. A decisão fica para a introdução da API. Não se desliga a opção dos outros pacotes agora.

**Verificação:** quando a API existir, `pnpm typecheck` do pacote dela com o `tsconfig` escolhido.

## Validação

### API-006. Zod continua sendo a biblioteca de schema

**Nível:** Condicional para o pipe. Obrigatório preservar a escolha já feita no monorepo.

**Regra:** Schemas compartilhados ficam em `@eleicoes/validation`. Não instalar `class-validator` nem um segundo Zod sem motivo registrado. Não afirmar que o `ValidationPipe` embutido interpreta schema Zod sozinho.

A página de pipes do Nest, consultada em 14 de outubro de 2026, separa duas peças:

- `ValidationPipe`, associada no capítulo ao caminho de `class-validator`.
- `StandardSchemaValidationPipe`, descrita como pipe para bibliotecas compatíveis com Standard Schema, entre elas Zod, quando o schema é informado na opção do decorador de parâmetro.

O mesmo capítulo mostra um `ZodValidationPipe` de exemplo que chama `schema.parse`. Qualquer uma dessas integrações é explícita. Nenhuma está instalada. Na hora de introduzir a API, confirmar contra Zod 4.6.7 e a versão do Nest escolhida se `StandardSchemaValidationPipe` cobre os schemas reais. Até essa confirmação, a integração é um pipe que chama o schema, não um efeito automático do `ValidationPipe`.

**Exemplo adequado.** Ilustrativo, no formato do capítulo de pipes, adaptado à ausência de ponto e vírgula do repositório. Não é rota deste produto.

```ts
import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

export class ZodSchemaPipe implements PipeTransform {
  private readonly schema: ZodType

  constructor(schema: ZodType) {
    this.schema = schema
  }

  transform(value: unknown): unknown {
    const parsed = this.schema.safeParse(value)
    if (!parsed.success) {
      throw new BadRequestException('Entrada inválida.')
    }

    return parsed.data
  }
}
```

**Antipadrão:** corpo do controller fazendo `as` no JSON e seguindo adiante.

**Verificação:** teste do pipe com valor inválido, sem subir a aplicação inteira, e um teste HTTP que mostre que a rota usa o pipe. Teste só da classe do pipe não prova o uso na rota.

## Testes, quando a API existir

Três níveis, que não se substituem. Ferramenta de execução prevista do monorepo: Vitest. A página de testes do Nest, consultada em 14 de outubro de 2026, usa Vitest nos exemplos e separa teste isolado, módulo de teste e HTTP.

| Nível      | O que instancia                                     | O que prova                                  |
| ---------- | --------------------------------------------------- | -------------------------------------------- |
| Isolado    | A classe ou a função, com dependência passada à mão | A regra da operação                          |
| Composição | `Test.createTestingModule`                          | O grafo de injeção e os providers exportados |
| HTTP       | Aplicação com `FastifyAdapter`                      | Rota, status e o pipeline realmente ligado   |

Teste direto de controller, com o serviço passado no construtor, não executa guard, pipe nem filter. A página do Nest mostra `overrideGuard`, `overridePipe` e `overrideFilter` justamente porque o teste isolado não passa por eles.

No HTTP, a mesma página mostra `app.inject` quando o adapter é Fastify, depois de `init` e `ready`. [README.md](README.md) já nomeia Supertest, ou ferramenta equivalente, se a API for introduzida. `inject` é o equivalente que a documentação do Nest mostra para Fastify. Escolher um quando a API existir. Não manter os dois sem uma diferença de cobertura que um deles não alcance. Não instalar nenhum agora.

Decorators e injeção precisam ser exercitados pelo setup real do pacote, não só por uma classe instanciada à mão, quando o comportamento depender de metadata. `erasableSyntaxOnly` entra nessa verificação.

Exemplo documental de serviço com dependência substituída: [testes/unitarios-aaa.md](../testes/unitarios-aaa.md).

## Referências

Consultadas em 14 de outubro de 2026:

- NestJS, módulos: <https://docs.nestjs.com/modules>
- NestJS, controllers: <https://docs.nestjs.com/controllers>
- NestJS, custom providers: <https://docs.nestjs.com/fundamentals/custom-providers>
- NestJS, pipes: <https://docs.nestjs.com/pipes>
- NestJS, testes: <https://docs.nestjs.com/fundamentals/testing>
- NestJS, Fastify: <https://docs.nestjs.com/techniques/performance>
- Zod, uso básico: <https://zod.dev/basics>

[Voltar à API](README.md)
