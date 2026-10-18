# Testes unitários e AAA

[Voltar aos testes](README.md) · [Padrões comuns](../padroes/README.md)

A primeira suíte real é `packages/validation/src/contract/envelope.spec.ts`. `pnpm test` roda Vitest 5.0.4 sem `--passWithNoTests` e falha quando não encontra teste. Os blocos deste arquivo são documentação e não foram executados.

A página de boas práticas de teste unitário da Microsoft, consultada em 14 de outubro de 2026, descreve Arrange, Act e Assert para projetos .NET. Usamos o padrão de estrutura, não as ferramentas, os atributos nem a arquitetura dessa plataforma. A mesma página diz que fake, stub e mock são usados de forma inconsistente na literatura. O glossário abaixo é o deste projeto.

## TEST-001. Arrange, Act, Assert

**Nível:** Obrigatório quando a suíte for escrita.

**Regra:**

- **Arrange:** entradas e dependências.
- **Act:** a ação principal. Pode ter mais de uma linha se for uma ação só.
- **Assert:** o comportamento esperado.

Um comportamento ou cenário por teste. Cenários independentes são testes separados. `it.each` parametriza casos independentes. Não colocar vários cenários num laço dentro de um único `it`. Mais de uma asserção é permitida quando verifica o mesmo comportamento. O valor esperado não é calculado pela mesma implementação que se está testando.

**Onde se aplica:** Vitest, em arquivo `.spec.ts` ou `.spec.tsx` ao lado da unidade. `describe` nomeia a unidade. `it` descreve, em português, o comportamento e a condição.

**Exemplo de nome:** “deve preservar o manifesto anterior quando a publicação falhar”.

**Verificação:** leitura do teste. Não há lint de AAA.

## TEST-002. Isolamento do teste unitário

**Nível:** Obrigatório.

**Regra:** Teste unitário não usa rede real, TSE, R2 nem banco. Relógio, temporizador, aleatoriedade e dependência externa são controlados. Mocks, timers, variáveis e spies são restaurados. O teste não depende da ordem da suíte. Não usar `sleep` real para esperar polling. Fixture é pequena e não contém segredo nem dado pessoal. Builder só quando deixar o cenário mais claro do que o objeto literal. Setup global não esconde o caso.

A página de timers do Vitest, consultada em 14 de outubro de 2026, mostra `vi.useFakeTimers`, `vi.advanceTimersByTime` e `vi.advanceTimersToNextTimer`. O exemplo dessa página limpa mocks e não mostra `useRealTimers`. Neste projeto, o `afterEach` também devolve os timers reais.

**Verificação:** o teste unitário passa sem rede. Teste que precise de disco ou de banco deixa de ser unitário e fica na camada descrita em [README.md](README.md).

## TEST-003. Dublês

**Nível:** Obrigatório.

**Regra:**

| Dublê | Papel aqui                                                                   |
| ----- | ---------------------------------------------------------------------------- |
| Fake  | Implementação simples que funciona de verdade, como um publicador em memória |
| Stub  | Devolve valor combinado e não é o foco da asserção                           |
| Spy   | Registra chamadas de uma função real ou substituta                           |
| Mock  | Dublê cuja expectativa de chamada decide o resultado do teste                |

Mockar a fronteira, não cada função interna. Não mockar a unidade sob teste. Preferir efeito e resultado observáveis. Verificar chamada quando a chamada for o contrato, como “o manifesto não foi atualizado”. Não testar método privado por conveniência; testar pelo comportamento público. Se a regra só é alcançável pelo privado, a fronteira pública está estreita demais ou o teste está no lugar errado.

**Verificação:** revisão do teste. A página de mocking do Vitest não foi aberta nesta sessão; os nomes `vi.fn` e `vi.spyOn` aparecem nos exemplos abaixo como API já usada na documentação de testes do Nest com Vitest, consultada na mesma data.

## TEST-004. Assincronismo no teste

**Nível:** Obrigatório.

**Regra:** Aguardar Promises e asserções assíncronas. Usar `resolves` e `rejects` quando o que se espera é o assentamento da Promise. Não escrever teste que passe antes de a falha esperada acontecer. Executar a ação principal uma vez quando ela tem efeito; a segunda chamada é outro cenário. Avançar timers falsos de modo controlado. Cancelamento, concorrência e resposta fora de ordem usam cenário determinístico, não espera real.

**Antipadrão:** `expect(promise).rejects.toThrow()` sem `await` ou `return`. A expectativa pode ficar para depois do fim do teste.

## Exemplos documentais

Tipos e funções abaixo são ilustrativos. Não são módulos do repositório e não fixam regra eleitoral.

### 1. Função pura

```ts
import { describe, expect, it } from 'vitest'

function hasVersionId(input: { readonly versionId?: string }): boolean {
  return typeof input.versionId === 'string' && input.versionId.length > 0
}

describe('hasVersionId', () => {
  it('deve aceitar um identificador não vazio', () => {
    // Arrange
    const input = { versionId: 'versao-1' }

    // Act
    const accepted = hasVersionId(input)

    // Assert
    expect(accepted).toBe(true)
  })
})
```

### 2. `it.each` para entradas inválidas

A função `hasVersionId` é a do exemplo anterior. O bloco mostra só o caso parametrizado.

```ts
import { describe, expect, it } from 'vitest'

describe('hasVersionId', () => {
  it.each([
    { label: 'campo ausente', input: {} },
    { label: 'texto vazio', input: { versionId: '' } },
    { label: 'tipo numérico', input: { versionId: 1 } },
  ])('deve recusar $label', ({ input }) => {
    // Arrange
    const value = input as { versionId?: string }

    // Act
    const accepted = hasVersionId(value)

    // Assert
    expect(accepted).toBe(false)
  })
})
```

O `as` está só neste exemplo documental, para o caso de tipo errado. No teste real, a fronteira recebe `unknown` e o schema rejeita. Não usar asserção para esconder entrada inválida no código de produção. Ver TS-003.

### 3. Falha de publicação preserva o estado anterior

```ts
import { describe, expect, it } from 'vitest'

type Pointer = { readonly versionId: string }

async function publishOrKeep(
  previous: Pointer,
  writeVersion: () => Promise<void>,
  updateManifest: (versionId: string) => Promise<void>,
  nextVersionId: string,
): Promise<Pointer> {
  try {
    await writeVersion()
    await updateManifest(nextVersionId)
    return { versionId: nextVersionId }
  } catch {
    return previous
  }
}

describe('publishOrKeep', () => {
  it('deve preservar o manifesto anterior quando a publicação falhar', async () => {
    // Arrange
    const previous = { versionId: 'versao-1' }
    let manifest = previous
    const writeVersion = () => Promise.reject(new Error('disco cheio'))
    const updateManifest = async (versionId: string) => {
      manifest = { versionId }
    }

    // Act
    const current = await publishOrKeep(
      previous,
      writeVersion,
      updateManifest,
      'versao-2',
    )

    // Assert
    expect(current).toEqual({ versionId: 'versao-1' })
    expect(manifest).toEqual({ versionId: 'versao-1' })
  })
})
```

As duas asserções verificam o mesmo comportamento: o ponteiro visível não mudou. O `catch` deste exemplo devolve o ponteiro anterior de propósito. Não é modelo para engolir erro sem registro. O coletor real registra a falha e mantém o ponteiro, como em [collector/padroes-de-desenvolvimento.md](../collector/padroes-de-desenvolvimento.md).

### 4. Polling com timers controlados

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('agendador de leitura', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve adiar a leitura seguinte enquanto a anterior não terminou', async () => {
    // Arrange
    let inFlight = false
    const reads: string[] = []
    const scheduled = setInterval(() => {
      if (inFlight) {
        return
      }

      inFlight = true
      reads.push('iniciou')
    }, 1_000)

    // Act
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.advanceTimersByTimeAsync(1_000)
    clearInterval(scheduled)

    // Assert
    expect(reads).toEqual(['iniciou'])
  })
})
```

Ilustrativo. O intervalo falso dispara duas vezes; a segunda não começa outra leitura porque a primeira ainda está marcada em andamento. Não é o hook da tela. A resposta fora de ordem da seleção de unidade é o cenário da matriz em [seguranca.md](seguranca.md), com o mesmo recurso de Promise controlada.

### 5. Serviço da API com dependência substituída

Condicional: não há API. O exemplo mostra o nível isolado, sem HTTP e sem Nest. Guard e pipe não rodam aqui. Ver [api/padroes-de-desenvolvimento.md](../api/padroes-de-desenvolvimento.md).

```ts
import { describe, expect, it, vi } from 'vitest'

class SnapshotQuery {
  private readonly readPointer: () => Promise<{ versionId: string } | undefined>

  constructor(readPointer: () => Promise<{ versionId: string } | undefined>) {
    this.readPointer = readPointer
  }

  async currentVersion(): Promise<string | undefined> {
    const pointer = await this.readPointer()
    return pointer?.versionId
  }
}

describe('SnapshotQuery', () => {
  it('deve devolver o identificador lido na dependência', async () => {
    // Arrange
    const readPointer = vi.fn().mockResolvedValue({ versionId: 'versao-1' })
    const query = new SnapshotQuery(readPointer)

    // Act
    const versionId = await query.currentVersion()

    // Assert
    expect(versionId).toBe('versao-1')
    expect(readPointer).toHaveBeenCalledOnce()
  })
})
```

A expectativa de chamada faz sentido porque “leu o ponteiro uma vez” é parte do comportamento. Não acrescentar expectativa para método que o teste não precisa observar.

### 6. Componente pelo comportamento acessível

Testing Library não está instalada. O bloco mostra o formato previsto por WEB-007. Não é suíte do repositório.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StateList } from './StateList'

describe('StateList', () => {
  it('deve informar a unidade escolhida', async () => {
    // Arrange
    const user = userEvent.setup()
    const onStateSelect = vi.fn()
    render(
      <StateList
        labels={['Unidade A', 'Unidade B']}
        selectedLabel={undefined}
        onStateSelect={onStateSelect}
      />,
    )

    // Act
    await user.click(screen.getByRole('button', { name: 'Unidade A' }))

    // Assert
    expect(onStateSelect).toHaveBeenCalledWith('Unidade A')
  })
})
```

Os rótulos são fictícios. Não representam lista oficial de unidades. O teste não lê `useState`. Não substitui um snapshot grande do HTML.

## API e React, em resumo

Na API, o teste isolado da classe e o teste do módulo Nest são níveis diferentes. O HTTP usa o adapter Fastify. `inject` e Supertest não convivem sem justificativa. Detalhe em [api/padroes-de-desenvolvimento.md](../api/padroes-de-desenvolvimento.md).

No React, papel e nome acessíveis vêm antes de detalhe interno. Strict Mode permanece.

## TEST-005. Cobertura

**Nível:** Obrigatório como interpretação. Pendente como número.

**Regra:** Cobertura é sinal, não prova. A página da Microsoft consultada diz o mesmo para percentual alto: medir linhas cobertas não mede qualidade, e perseguir o restante só para subir o número rende pouco. Priorizar regra crítica, fronteira, falha e ramo que muda comportamento. Não inventar percentual obrigatório. Não escrever teste trivial para aumentar o número. Não deixar `.only`, skip sem motivo ou ausência de teste como evidência de sucesso depois que a funcionalidade existir.

**Verificação:** revisão dos casos de falha. Relatório de cobertura, quando existir, não fecha a revisão sozinho.

## Referências

Consultadas em 14 de outubro de 2026:

- Microsoft, boas práticas de teste unitário, seção Arrange, Act, Assert: <https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices>
- Vitest, timers: <https://vitest.dev/guide/mocking/timers>
- Testing Library, princípios: <https://testing-library.com/docs/guiding-principles/>
- NestJS, testes: <https://docs.nestjs.com/fundamentals/testing>

Não consultada nesta data: a visão geral de mocking do Vitest, <https://vitest.dev/guide/mocking>.

[Voltar aos testes](README.md)
