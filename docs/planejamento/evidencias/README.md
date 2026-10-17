# Evidências das etapas

[Planejamento](../README.md) · [Catálogo das etapas](../etapas/README.md)

Um arquivo por etapa, `ET-XX.md`, criado quando a etapa começa. O [catálogo](../etapas/README.md) só muda o estado de uma etapa citando um registro daqui.

## Colunas mínimas

Cada verificação registrada tem:

| Coluna | Conteúdo |
| --- | --- |
| Data | Dia (e hora, quando importa) da execução |
| Executor | Quem executou, ou "a designar" |
| Comando ou ação | O comando exato, ou a ação manual descrita |
| Ambiente | Máquina, diretório, versões de Node e pnpm, ou ambiente de nuvem |
| Resultado observado | Código de saída e saída resumida; o que de fato apareceu |
| Classificação | Aprovado, Reprovado, Bloqueado, Não executado, ou Executado sem testes encontrados |
| Limitação | O que o resultado não prova |
| Artefato | Link para arquivo, captura ou log, quando houver |

## Regras

- **Proibido** colar segredo, token, senha, chave, identificador de conta, conteúdo de `.env` ou corpo completo de resposta da origem (TSE). Cite o nome da variável, nunca o valor; resuma a resposta (tamanho, status, campos).
- Não registrar como aprovado o que não foi executado. `pnpm test` com zero testes é "Executado sem testes encontrados", não suíte aprovada.
- Evidência histórica (por exemplo, o `dist` de 14/10/2026) é registrada como histórica e não substitui uma execução nova.
- Falha registrada com causa e correção é evidência válida; esconder falha (`|| true`, saída filtrada) não é.
- Experimentos descartáveis ficam fora do repositório; registra-se o procedimento e o resultado.
