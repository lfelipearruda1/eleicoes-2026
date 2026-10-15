# Consultas e transações

[Voltar aos dados](README.md) · [Padrões comuns](../padroes/README.md)

Regras condicionais: PostgreSQL e ORM não fazem parte obrigatória da primeira versão.

Não há banco no repositório, não há ORM escolhido e este documento não cria tabela nem instala dependência. A publicação da primeira versão continua sendo arquivo, na ordem descrita em [collector/README.md](../collector/README.md). As regras abaixo valem somente se um requisito futuro introduzir PostgreSQL.

O caso de uso delimita a operação. O adapter executa o SQL e oferece o mecanismo de transação. Regra de negócio não importa driver. Ver CC-005.

## Consultas

### DATA-001. Parâmetro é dado; identificador dinâmico vem de lista fechada

**Nível:** Condicional.

**Regra:** Valor externo entra por parâmetro vinculado. Nunca concatenar entrada externa no texto SQL. Nome de coluna de ordenação, direção e tabela, se precisarem variar, saem de um conjunto escrito no código. O cheat sheet de SQL injection da OWASP, consultado em 14 de outubro de 2026, trata prepared statement com parâmetro como defesa primária e allowlist como defesa quando o banco não aceita parâmetro naquele trecho, por exemplo um nome de coluna. Escapar texto à mão é a opção que o cheat sheet desaconselha. ORM não torna concatenação segura: o mesmo texto cita injeção em linguagem de consulta de ORM quando a string é montada.

**Onde se aplica:** adapter, se existir.

**Exemplo adequado.** Ilustrativo. A tabela não existe e o nome não é decisão de modelo.

```sql
SELECT version_id
FROM stored_pointer
WHERE environment = $1
```

**Antipadrão:** `` `SELECT version_id FROM stored_pointer WHERE environment = '${environment}'` ``.

**Verificação:** revisão do SQL e teste de integração com banco real isolado, usando uma entrada que seria perigosa se concatenada. Mock de repositório não prova ausência de injeção. Ver [testes/seguranca.md](../testes/seguranca.md).

### DATA-002. Volume, plano e invariante

**Nível:** Condicional.

**Regra:**

- Pedir colunas e linhas necessárias. Paginar e impor limite máximo quando a consulta puder crescer.
- Evitar N+1: não consultar uma linha filha por item dentro de um laço se uma consulta do conjunto resolver.
- Invariante que cabe ao banco vira restrição. Validação na aplicação não substitui restrição de unicidade ou de chave.
- Índice nasce da consulta real, não de um palpite anterior à tabela.
- Ler o plano com `EXPLAIN` em ambiente que não seja produção e que não use credencial de produção.
- `EXPLAIN ANALYZE` executa a instrução. A documentação do PostgreSQL 18, consultada em 14 de outubro de 2026, diz que a opção `ANALYZE` faz o `EXPLAIN` executar a consulta. Não usar isso em produção para uma escrita, e não usar dado real de produção no teste comum.
- Teste comum não usa credencial nem cópia de produção.

**Verificação:** plano arquivado junto da mudança que introduz a consulta pesada. O plano não é exigido para código que não tem banco.

## Transações

A documentação do PostgreSQL 18, consultada em 14 de outubro de 2026, diz que toda instrução SQL já corre dentro de uma transação. Sem `BEGIN`, cada instrução bem-sucedida tem `BEGIN` e `COMMIT` implícitos. Um bloco explícito existe quando várias instruções precisam ser atômicas ou quando uma leitura precisa de um isolamento que a instrução solta não dá. A mesma página avisa que algumas bibliotecas cliente abrem transação sozinhas; o adapter precisa saber o que a biblioteca faz.

Transação explícita curta. Não chamar TSE, R2 nem outro serviço de rede enquanto a transação segura lock. Falha faz rollback e devolve a conexão ao pool. Operações que participam da mesma atomicidade usam a mesma conexão e o mesmo contexto. Abrir uma transação nova dentro de cada método e supor que o conjunto é atômico está errado: cada método teria confirmado a sua parte.

`BEGIN` não elimina condição de corrida. O nível padrão do PostgreSQL é Read Committed. Nesse nível, duas leituras sucessivas na mesma transação podem ver dados diferentes se outra transação confirmar no meio, conforme a documentação de isolamento consultada na mesma data.

### DATA-003. Escolher o mecanismo pelo caso

**Nível:** Condicional.

| Caso | Decisão |
| --- | --- |
| Uma escrita que o banco já executa de forma atômica | Uma instrução. Sem `BEGIN` explícito só por cerimônia. |
| Várias escritas que precisam valer juntas ou falhar juntas | Uma transação explícita no caso de uso, no mesmo contexto. |
| Leituras que precisam observar um estado estável | Transação com isolamento escolhido, ou uma consulta só, se uma consulta bastar. |
| Consulta sem exigência extra de consistência | Instrução simples. Não abrir transação longa. |
| Fluxo que mistura banco e serviço externo | A transação do banco termina antes da chamada externa, ou o desenho trata os dois lados. Rollback SQL não desfaz o outro lado. |

Para corrida, avaliar escrita condicional, restrição, versão otimista ou lock. A escolha depende da regra. Não prescrever Serializable para toda operação.

Diferenças práticas, a partir da documentação de isolamento do PostgreSQL 18:

| Nível | O que o projeto precisa lembrar |
| --- | --- |
| Read Committed | Padrão. Cada comando vê o que estava confirmado quando o comando começou. É suficiente para muita escrita simples e insuficiente para regra que exige uma fotografia estável de várias leituras. |
| Repeatable Read | A fotografia é do início da transação. Atualização concorrente da mesma linha pode falhar com erro de serialização. A aplicação precisa repetir a transação inteira. Leitura pura não encontra esse conflito. O PostgreSQL também não apresenta phantom read nesse nível, garantia acima do mínimo do padrão SQL. |
| Serializable | Acrescenta monitoramento de anomalia de serialização, com o mesmo tipo de falha que pede repetir a transação. Tem custo extra. Não é o nível padrão deste projeto. |

Repetir a transação inteira quando o erro for de serialização ou deadlock, com limite de tentativas. Só repetir se os efeitos externos ainda não tiverem acontecido, ou se forem idempotentes. A documentação de locks explícitos, consultada na mesma data, diz que o PostgreSQL aborta uma das transações em deadlock e que lock fica retido até o fim da transação. Segurar lock enquanto se espera rede é o caso que essa página desaconselha ao falar de transação longa.

Lock de linha (`SELECT ... FOR UPDATE` e variantes) existe quando a regra pede bloquear escritores. Não é o primeiro recurso de uma leitura de painel. A primeira versão nem tem painel lido do banco.

**Exemplo adequado.** Ilustrativo. Duas escritas fictícias que precisariam ser indivisíveis. Não são tabelas do projeto.

```sql
BEGIN;
UPDATE stored_pointer
SET version_id = $1
WHERE environment = $2
  AND version_id = $3;
-- a segunda escrita só faz sentido se a primeira afetou a linha esperada
COMMIT;
```

A aplicação confere a quantidade de linhas afetadas. Zero linhas significa que o ponteiro mudou no meio; não se trata isso como sucesso.

**Antipadrão:** `BEGIN` no início do processo do coletor, com `fetch` ao TSE no meio e `COMMIT` no final.

**Verificação:** teste de integração com duas conexões no banco isolado. Não há esse banco.

## Banco e arquivo não são a mesma transação

### DATA-004. Rollback não desfaz R2

**Nível:** Condicional, e já verdadeiro para o desenho atual mesmo sem banco.

**Regra:** `ROLLBACK` no PostgreSQL desfaz o que a transação fez no banco. Não desfaz upload no R2, purge de cache nem arquivo local já escrito. Publicar vários objetos não é transação SQL. Coordenação entre os dois, se um dia os dois existirem na mesma operação, usa idempotência, compensação ou outro desenho explícito. Não introduzir outbox nem fila antes de um requisito escrito. A primeira versão não tem os dois lados: publica arquivo e não grava banco.

**Verificação:** revisão de qualquer fluxo futuro que escreva nos dois. Teste de rollback no banco não afirma nada sobre o objeto no R2.

## Testes que o mock não substitui

Quando houver banco, atomicidade, isolamento, restrição e lock são testados contra PostgreSQL real, em instância isolada, sem dado de produção. O teste sobe o esquema necessário e não depende de ordem com outra suíte. Mock de adapter não entra nessa prova.

## Referências

Consultadas em 14 de outubro de 2026. As páginas do PostgreSQL identificam a documentação 18:

- Transações: <https://www.postgresql.org/docs/current/tutorial-transactions.html>
- Isolamento: <https://www.postgresql.org/docs/current/transaction-iso.html>
- Locks explícitos: <https://www.postgresql.org/docs/current/explicit-locking.html>
- `EXPLAIN`: <https://www.postgresql.org/docs/current/using-explain.html>
- Cloudflare R2, consistência: <https://developers.cloudflare.com/r2/reference/consistency/>
- OWASP Cheat Sheet Series, prevenção de SQL injection: <https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html>

[Voltar aos dados](README.md)
