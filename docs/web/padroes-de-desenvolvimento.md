# Padrões de desenvolvimento da web

[Voltar à web](README.md) · [Padrões comuns](../padroes/README.md)

A interface lê snapshots publicados. Não consulta o TSE e não chama o EC2. React 19.3.1, Vite 8.3.4 e Tailwind CSS 4.3.3 já estão em `apps/web`. O painel presidencial nacional, com polling local, está em `src/features/president/`. Mapa e UFs estão planejados em [README.md](README.md).

Não copiar controller, provider e módulo do Nest para o React. A API é outro processo, e continua opcional.

## WEB-001. Pastas por funcionalidade

**Nível:** Obrigatório para código novo de tela. Recomendado não criar a árvore inteira vazia.

**Regra:** Uma funcionalidade só ganha a pasta de que precisa.

```text
apps/web/src/
  app/                         # composição: montagem, provedores que realmente existirem
  features/<funcionalidade>/
    components/                # apresentação dessa funcionalidade
    hooks/                     # comportamento React reutilizável dessa funcionalidade
    <leitura>.ts               # leitura dos snapshots, se a funcionalidade buscar dado
  shared/                      # o que mais de uma funcionalidade usa de fato
```

`App.tsx` e `main.tsx` continuam o ponto de entrada atual. Não movê-los nesta etapa. `shared` não é depósito: ver CC-009.

**Verificação:** revisão. Componente usado num lugar só não vai para `shared`.

## Componentes e estado

### WEB-002. Função, prop pequena, estado no menor escopo

**Nível:** Obrigatório.

**Regra:** Componentes são funções e se compõem. Props expõem o que o pai precisa controlar, não o estado interno inteiro. Estado fica no menor componente que o usa. Dado derivado se calcula no render. Não se copia para outro `useState`. Não colocar mapa, seleção e snapshots num único contexto global. Biblioteca de estado ou de cliente HTTP não entra por hábito; a decisão de não escolher outra agora está no README da web.

Função pura de transformação sai do JSX quando a expressão deixa de ser óbvia. A interação (evento), a busca (leitura do snapshot) e a apresentação (markup) não moram no mesmo arquivo se cada uma já tiver motivo próprio para mudar. Um bloco pequeno pode permanecer junto.

**Justificativa:** A página “Thinking in React” não foi reaberta nesta sessão. A prática acima segue o desenho já adotado no README: a tela consome contrato pronto e não recalcula a eleição. A página “You Might Not Need an Effect”, consultada em 14 de outubro de 2026, pede para calcular durante o render o que é derivado dos props ou do estado, em vez de sincronizar isso num efeito.

**Onde se aplica:** `apps/web/src` novo.

**Exemplo adequado.** Ilustrativo. Não é o componente real do mapa.

```tsx
type StateListProps = {
  readonly labels: readonly string[]
  readonly selectedLabel: string | undefined
  readonly onStateSelect: (label: string) => void
}

export function StateList(props: StateListProps) {
  return (
    <ul>
      {props.labels.map((label) => (
        <li key={label}>
          <button
            type="button"
            aria-pressed={props.selectedLabel === label}
            onClick={() => props.onStateSelect(label)}
          >
            {label}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

**Antipadrão:** contexto com cliente HTTP, GeoJSON, votos e tema, lido por todos os componentes.

**Verificação:** revisão da árvore de estado. Teste de interface pelo comportamento, não pelo contexto.

## Efeitos e memoização

### WEB-003. Efeito sincroniza com o que está fora do React

**Nível:** Obrigatório.

**Regra:** Hooks no topo do componente ou de outro hook. `useEffect` para assinatura, temporizador e requisição. Não usar efeito para recalcular valor derivado. Não tornar o callback do `useEffect` uma função `async`: o efeito precisa poder devolver limpeza, e uma função `async` devolve Promise. Busca assíncrona fica numa função chamada pelo efeito, com cancelamento ou bandeira de descarte.

Limpar temporizador, assinatura e requisição. Resposta que chega fora de ordem, inclusive quando a pessoa troca de unidade da Federação depressa, não substitui o estado de outra seleção. Não tirar dependência do array para esconder execução repetida. Não desligar Strict Mode para esconder efeito que não aguenta rodar duas vezes em desenvolvimento. O `main.tsx` atual envolve a árvore em `StrictMode`. Isso permanece.

**Justificativa:** A referência de `useEffect`, consultada em 14 de outubro de 2026, foi lida para esta regra. A página é longa; o ponto usado aqui é o contrato do efeito: sincronizar com sistema externo e devolver limpeza. Não se atribui à página uma frase que não tenha sido localizada numa citação curta. A proibição de callback `async` é regra deste projeto, coerente com o fato de o efeito esperar uma função de limpeza ou nada, não uma Promise.

**Onde se aplica:** polling e qualquer leitura de rede da tela.

**Verificação:** teste com timers falsos e duas respostas resolvidas na ordem inversa. Exemplo em [testes/unitarios-aaa.md](../testes/unitarios-aaa.md). O lint de hooks já está ligado; não remover dependência para silenciá-lo.

### WEB-004. Memoização com medida ou custo visível

**Nível:** Recomendado.

**Regra:** `useMemo` e `useCallback` respondem a custo demonstrado: render caro, dependência de efeito que não deve mudar a cada render, ou valor passado a filho que já se mediu como caro. Não enrolar toda função. A referência de `useMemo` não foi reaberta nesta sessão; a regra é do projeto e combina com PERF-002.

**Verificação:** a revisão pede o motivo da memoização nova.

## Resultados e polling

### WEB-005. Só os nossos snapshots

**Nível:** Obrigatório.

**Regra:**

- Consumir o contrato publicado. Não montar URL do TSE.
- Centralizar o polling para que cada painel não dispare a própria consulta.
- Não acrescentar parâmetro aleatório para furar cache.
- Conservar a última versão válida quando a tentativa nova falhar.
- Não mostrar ausência como zero.
- Não tratar liderança parcial como eleição confirmada. O site não declara vencedor.
- Não misturar percentual de votos e percentual de apuração.
- Validar o contrato recebido fora do caminho quente de cada render: uma vez por resposta, não a cada nó da árvore. O schema, quando existir, vive em `@eleicoes/validation`.

Os estados de tela e o restante do polling estão em [README.md](README.md). Intervalos continuam pendentes.

**Verificação:** revisão de URLs e teste dos estados com fixture pequena. Hoje a tela não tem esses estados.

## Segurança e experiência

### WEB-006. Texto é texto; segredo não entra no bundle

**Nível:** Obrigatório.

**Regra:** Nenhum segredo no bundle. Variável `VITE_*` é pública. Credencial não usa esse prefixo. As únicas `VITE_*` atuais são `VITE_RESULTS_BASE_URL`, `VITE_RESULTS_CHANNEL` e `VITE_RESULTS_STALE_AFTER_MS`, todas públicas por natureza ([README.md](README.md#origem-dos-resultados-no-build)).

Evitar HTML bruto e os atalhos que furam o escape do React. O cheat sheet de XSS da OWASP, consultado em 14 de outubro de 2026, cita `dangerouslySetInnerHTML` sem sanitizar e URL não validada entre as falhas que o framework não cobre sozinho. A mesma página diz que o React 19 bloqueia URLs `javascript:` em `src` e `href`, e que isso não substitui a validação da aplicação. Nome e texto vindos do snapshot são dados, renderizados como texto. Link dinâmico só aponta para destino permitido; na primeira versão o destino esperado é o nosso domínio de resultados ou um caminho interno. Validar antes de usar.

Política de segurança de conteúdo e cabeçalhos são defesa complementar, na hospedagem, não desculpa para inserir HTML. CORS não é autenticação; isso já está no README da web.

Manter acessibilidade: foco, teclado e uma lista textual além do mapa. Cor não é o único sinal. Listas usam identificador estável. Se o identificador público do contrato ainda não existe, não usar o índice do array como chave quando a ordem puder mudar.

**Verificação:** revisão de `dangerouslySetInnerHTML` e de URLs. Teste de texto com marcação, em [testes/seguranca.md](../testes/seguranca.md). Busca de segredo no artefato de `vite build` quando houver publicação; não foi feita nesta etapa.

## Teste de interface

### WEB-007. Testing Library nos testes de componente

**Nível:** Obrigatório.

**Regra:** `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2 e `jsdom` 30.1.3 são dependências de desenvolvimento do web (19/10/2026). O arquivo de teste que precisa de DOM declara `// @vitest-environment jsdom` e chama `cleanup` no `afterEach`, porque a suíte não usa globais. Princípios consultados em 14 de outubro de 2026: o teste se parece com o uso, mexe em nó do DOM e não em instância do componente.

Priorizar papel, nome acessível e interação. Não afirmar comportamento lendo estado interno do hook. Snapshot extenso de markup não é o teste único de uma tela.

O exemplo documental está em [testes/unitarios-aaa.md](../testes/unitarios-aaa.md).

## Referências

Consultadas em 14 de outubro de 2026:

- React, “You Might Not Need an Effect”: <https://react.dev/learn/you-might-not-need-an-effect>
- React, referência de `useEffect`: <https://react.dev/reference/react/useEffect>
- Testing Library, princípios: <https://testing-library.com/docs/guiding-principles/>
- OWASP Cheat Sheet Series, prevenção de XSS: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>

Não consultadas nesta data: “Thinking in React” e a referência de `useMemo`. As regras de composição e de memoização não citam frase dessas páginas.

[Voltar à web](README.md)
