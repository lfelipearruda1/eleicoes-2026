# Revisão de código

[Voltar ao índice de padrões](README.md)

O que a ferramenta pode pegar e o que continua com quem revisa. Nada neste arquivo altera `eslint.config.mjs`.

Configuração conferida em 14 de outubro de 2026: ESLint 10.12.0, typescript-eslint 8.71.2, `typescript-eslint` recomendado sem informação de tipos, `eslint-config-prettier`, e no frontend `eslint-plugin-react-hooks` 7.1.1 com `react-refresh`. O comando é `pnpm lint`.

## REV-001. Verificação automática e verificação humana

**Nível:** Obrigatório.

**Regra:** Lint, tipo e teste automatizado respondem por regra que a ferramenta realmente executa. Revisão humana responde por responsabilidade, contrato, segurança e teste que a ferramenta não entende. Os dois aparecem no relato da mudança. “Não rodei” fica dito. Não se apresenta ausência de teste como sucesso: `pnpm test` usa `--passWithNoTests`.

**Verificação:** comandos citados na revisão e leitura do diff.

## O que já dá para ligar no uso atual

| Verificação | Estado no repositório |
| --- | --- |
| `strict` e variáveis não usadas | Ligado em `tsconfig.base.json` |
| `noFallthroughCasesInSwitch` | Ligado na base |
| Regras recomendadas do typescript-eslint, sem tipos | Ligadas |
| Prettier via `eslint-config-prettier` | Ligado, por último na configuração |
| Regras recomendadas de hooks e refresh no `apps/web` | Ligadas |
| Fronteira entre aplicativos e pacotes | Não ligada |
| Teste focado (`it.only`, `describe.only`) | Não ligada. Não há suíte |

## Regras a avaliar antes de configurar

Os nomes abaixo são os da ferramenta na data da consulta. Não estão no `eslint.config.mjs`. Ligá-las é tarefa futura, com exemplo validado no código real.

### REV-002. Promises e tipos

**Nível:** Pendente como lint. Obrigatório como prática, em [typescript-funcoes-e-assincronismo.md](typescript-funcoes-e-assincronismo.md).

**Regra:** `@typescript-eslint/no-floating-promises` e `@typescript-eslint/no-misused-promises` pedem informação de tipos. A página de cada uma, consultada em 14 de outubro de 2026, diz que entram em preset com tipos (`recommended-type-checked` no caso das duas) e que há custo de desempenho. A configuração atual usa o recomendado sem esse projeto de tipos. Habilitar as duas exige `parserOptions.project` ou o serviço de projeto suportado pela versão 8.71.2, medido no monorepo, não só copiado de um exemplo.

`no-floating-promises` trata `void` como forma de não acusar a chamada quando `ignoreVoid` está no padrão, e a própria página diz que `void` não trata a rejeição. Se a regra for ligada, `void` continua exigindo justificativa humana.

`no-misused-promises` aponta Promise em `if`, em `forEach(async ...)` e em executor de `new Promise`. Isso combina com o guia. Não dispensa o limite de concorrência, que a regra não conhece.

**Verificação futura:** lint com tipos num arquivo que tenha Promise esquecida, e comparação do tempo de `pnpm lint` antes e depois.

### REV-003. Ternário

**Nível:** Pendente como lint.

**Regra:** `no-nested-ternary` recusa ternário aninhado. `no-unneeded-ternary` recusa `condicao ? true : false`. As duas foram lidas em 14 de outubro de 2026. As duas estão congeladas na documentação do ESLint e não fazem parte do conjunto recomendado que este repositório liga.

Cuidado ao ligar `no-unneeded-ternary`: a sugestão de trocar um padrão de atribuição por `||` apaga `0` e `false`. Isso contraria STYLE-012. A opção `defaultAssignment` não deve ser desligada sem exemplos nossos. O exemplo que a página de `no-nested-ternary` marca como correto usa `else`. Não usar esse exemplo como correção automática neste projeto.

**Verificação futura:** rodar a regra em exemplo mínimo, fora do código de produção, antes de colocá-la na configuração.

### REV-004. `else` não cai sozinho em `no-else-return`

**Nível:** Ligada como lint em ET-00 (17/10/2026): `no-restricted-syntax` com `IfStatement[alternate]` em `apps/**` e `packages/**` ([eslint.config.mjs](../../eslint.config.mjs)); validação em [ET-00.md](../planejamento/evidencias/ET-00.md). Obrigatório como convenção em STYLE-009.

**Regra:** `no-else-return` acusa `else` depois de um `if` que retorna. Com o padrão `allowElseIf: true`, `else if` depois de `return` continua aceito. A página da regra mostra código com `else` considerado correto quando o `if` não retorna. Portanto a regra não implementa a proibição completa deste projeto.

Uma proibição completa pode usar `no-restricted-syntax` com um seletor que alcance `IfStatement` com alternativa, por exemplo `IfStatement[alternate]`. A página de `no-restricted-syntax`, consultada em 14 de outubro de 2026, diz que o seletor é definido pelo projeto e que a mensagem pode ser personalizada. Esse seletor também pega `else if`, porque `else if` é alternativa de um `if`. Ele não deve pegar `switch`. Validar em exemplos mínimos, incluindo guarda, `switch` e código gerado, antes de qualquer configuração. Não alterar o ESLint nesta etapa.

**Verificação futura:** os exemplos de STYLE-009, o antipadrão com `else` e um `switch` sem `else`.

### REV-005. Não proibir `return await`

**Nível:** Obrigatório como decisão de lint.

**Regra:** Não recomendar `no-return-await` como proibição geral. A página de `@typescript-eslint/return-await`, consultada em 14 de outubro de 2026, explica que a regra antiga do núcleo foi descontinuada e que a opção `never` é prejudicial em `try`/`catch`/`finally`. Se um dia a regra com tipos for adotada, a opção precisa preservar `return await` no contexto de erro. A prática está em TS-015.

**Verificação:** ausência de `no-return-await` na configuração. Hoje está ausente.

### REV-006. Hooks e fronteiras

**Nível:** Hooks recomendados já ligados na web. Fronteiras pendentes.

**Regra:** Não remover dependência de efeito para calar o lint. Não desligar a regra de hooks no arquivo. Restrição de import entre `apps/web`, `apps/collector`, `apps/api` e `packages` é desejável quando o código passar a cruzar pastas. A ferramenta ainda não foi escolhida. Não instalar plugin nesta etapa. A regra de dependência está em PKG-001.

**Verificação:** `pnpm lint` no frontend quando houver efeito. Revisão de imports até haver regra automática.

### REV-007. Teste focado

**Nível:** Obrigatório como prática. Pendente como lint.

**Regra:** `it.only`, `describe.only` e `test.only` não permanecem no código integrado. Skip sem justificativa também não. A detecção automática ainda não está configurada. O revisor procura essas chamadas no diff.

**Verificação:** leitura do diff de teste. Quando a suíte existir, um job não pode ficar verde só com teste focado.

## Checklist de revisão

Quem revisa percorre o que a mudança realmente toca:

1. A mudança atende ao escopo pedido e não cria serviço fora da arquitetura?
2. A responsabilidade está no módulo certo? Há abstração sem segunda implementação nem fronteira?
3. O contrato está explícito: tipos, ausência, zero e falha?
4. Entrada externa e permissão foram tratadas no nível em que o componente existe?
5. Erro e cancelamento são observáveis? `catch` vazio ou sucesso inventado?
6. A concorrência tem limite? Há ciclo que pode sobrepor o anterior?
7. Cache e publicação preservam a última versão válida e separam manifesto de arquivo versionado?
8. Há risco de custo, de bloqueio do event loop ou de consulta sem teto?
9. Os testes verificam comportamento e falha, não um espelho da implementação?
10. Documento de contrato acompanha a mudança, se o formato compartilhado mudou?
11. Há evidência dos comandos executados, ou está dito o que não foi executado?

API e banco condicionais: se a mudança não introduz esses componentes, os itens correspondentes não viram tarefa extra.

## REV-008. Exceção

**Nível:** Obrigatório.

**Regra:** Exceção tem motivo, escopo, risco e registro, como em [README.md](README.md). Não se desliga um conjunto amplo de regras para a verificação passar. Comentário de lint sem o identificador da regra do projeto, ou sem razão, volta na revisão.

**Antipadrão:** `eslint-disable` no topo do arquivo porque uma Promise ficou sem tratamento.

**Verificação:** busca por desativações no diff.

## Referências

Consultadas em 14 de outubro de 2026:

- typescript-eslint, `no-floating-promises`: <https://typescript-eslint.io/rules/no-floating-promises/>
- typescript-eslint, `no-misused-promises`: <https://typescript-eslint.io/rules/no-misused-promises/>
- typescript-eslint, `return-await`: <https://typescript-eslint.io/rules/return-await/>
- ESLint, `no-else-return`: <https://eslint.org/docs/latest/rules/no-else-return>
- ESLint, `no-restricted-syntax`: <https://eslint.org/docs/latest/rules/no-restricted-syntax>
- ESLint, `no-nested-ternary`: <https://eslint.org/docs/latest/rules/no-nested-ternary>
- ESLint, `no-unneeded-ternary`: <https://eslint.org/docs/latest/rules/no-unneeded-ternary>

[Voltar ao índice de padrões](README.md)
