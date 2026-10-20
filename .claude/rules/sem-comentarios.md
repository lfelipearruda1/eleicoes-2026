# Proibido comentário em código

Não escreva comentários em nenhum arquivo de código do projeto: `.ts`, `.tsx`, `.js`, `.mjs`, `.css`, `.html` e configurações em código. Isso vale para `//`, `/* */`, `{/* */}` em JSX e `<!-- -->`.

- Intenção, restrição e decisão vão no nome (função, variável, tipo, constante) ou em `docs/`.
- Não deixe código comentado, TODO, FIXME nem cabeçalho de arquivo.
- Ao editar um arquivo que tenha comentário, remova-o.

Únicas exceções, por serem diretivas lidas por ferramentas e não texto para pessoas:

- `// @vitest-environment <ambiente>` no topo de arquivo de teste.
- `// eslint-disable-next-line <regra> -- <razão>` conforme a exceção pontual de `docs/padroes/README.md`.
