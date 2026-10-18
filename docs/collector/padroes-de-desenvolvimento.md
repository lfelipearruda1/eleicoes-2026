# Padrões de desenvolvimento do coletor

[Voltar ao coletor](README.md) · [Padrões comuns](../padroes/README.md)

O coletor consulta a origem, valida, normaliza e publica. Não atende o navegador. O comportamento operacional já está em [README.md](README.md). Este arquivo diz como organizar o código quando ele for escrito. Hoje `src/index.ts` só registra que a integração com o TSE não existe.

Não usar NestJS aqui. Não criar controller HTTP nem contêiner de injeção. Função de módulo e composição em `main.ts` bastam. Ver [clean-code-e-solid.md](../padroes/clean-code-e-solid.md).

## COL-001. Módulos por responsabilidade

**Nível:** Obrigatório para o código novo do coletor.

**Regra:** Separar as pastas pelo motivo de mudança. Nem toda pasta precisa nascer no primeiro commit da coleta. Não se cria a pasta vazia “para o desenho ficar completo”.

```text
apps/collector/src/
  main.ts                 # composição e início
  config/                 # leitura e validação da configuração
  source-client/          # HTTP da origem oficial
  normalization/          # transformação do bruto já validado
  orchestration/          # um ciclo
  publication/            # escrita da versão e do manifesto
  schedule/               # disparo do ciclo, sem sobreposição
  observability/          # log e sinal, sem segredo
```

Schema do contrato compartilhado fica em `packages/validation` quando passar a existir. Parsing que só entende o arquivo bruto pode morar no coletor, desde que o resultado entregue ao publicador já seja o modelo normalizado. A web não importa essas pastas.

**Verificação:** revisão de imports. `apps/web` não referencia `apps/collector`.

### O que cada parte faz

| Parte             | Faz                                                                       | Não faz                                 |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| Configuração      | Lê ambiente e recusa subir se o obrigatório faltar ou for incoerente      | Não busca o TSE na carga do módulo      |
| Cliente da origem | Pede URLs allowlisted, com limite de tempo, tamanho, redirect e tentativa | Não normaliza e não publica             |
| Validação         | Recusa corpo que não fecha o contrato                                     | Não “conserta” número inválido          |
| Normalização      | Produz o modelo interno                                                   | Não roda no navegador                   |
| Orquestração      | Uma tentativa de ciclo: buscar, validar, normalizar, publicar             | Não atende visita                       |
| Publicação        | Grava a versão e só então o ponteiro                                      | Não serve o arquivo ao público          |
| Agendamento       | Dispara o próximo ciclo quando o anterior terminou                        | Não empilha ciclos                      |
| Observabilidade   | Registra etapa, versão, código e tempo                                    | Não grava credencial nem corpo completo |

## COL-002. `main.ts` compõe; não concentra a regra

**Nível:** Obrigatório.

**Regra:** `main.ts` carrega a configuração, instancia cliente e publicador e entrega o controle ao agendador. Regra de negócio fica nas funções nomeadas. Efeito de rede não ocorre na importação de um módulo: importar o coletor em teste não pode disparar consulta.

Dependência externa é parâmetro, para o teste trocar cliente e publicador sem rede. Estado de execução é explícito e pequeno: ciclo em andamento ou não, e o ponteiro da última versão válida que o processo conhece. Não guardar resposta bruta acumulada sem limite.

**Onde se aplica:** `apps/collector`.

**Divergência registrada:** o `index.ts` atual chama `console.log` na carga. É o ponto de entrada mínimo, não um cliente. Código novo de coleta não consulta a rede no topo do módulo.

**Verificação:** teste que importa o módulo de decisão sem servidor. Ainda não há esse teste.

## COL-003. Um publicador, ciclo sem sobreposição, retomada

**Nível:** Obrigatório.

**Regra:** A primeira versão tem um publicador ativo, como em [README.md](README.md). Novo disparo durante o ciclo ativo é ignorado ou adiado. Não usar `setInterval` assíncrono que deixe dois ciclos juntos. Ver TS-013.

Depois de falha ou reinício, o processo não publica snapshot vazio. A versão já publicada continua. Publicação é idempotente onde a mesma versão puder ser reenviada sem misturar arquivos: reescrever o mesmo identificador de versão com o mesmo conteúdo pode ser seguro; reutilizar identificador para outro conteúdo não. Isso não é execução exatamente uma vez. Uma tentativa pode gravar arquivo e cair antes de atualizar o manifesto. A retomada continua sem apontar o manifesto para um conjunto incompleto.

**Verificação:** teste de falha no meio da escrita e teste de segundo disparo com o primeiro ainda pendente. Exemplos em [testes/unitarios-aaa.md](../testes/unitarios-aaa.md).

## Cliente HTTP

### COL-004. Status, tamanho, destino e tentativa

**Nível:** Obrigatório.

**Regra:**

- Ausência de exceção não basta. Conferir status e se o corpo é o que a etapa esperava.
- Limitar tempo e tamanho antes de ler o corpo inteiro para memória sem teto.
- Destinos saem da allowlist de hosts oficiais. Não aceitar URL montada com texto livre nem com dado do visitante. O visitante não fala com o coletor.
- Redirect para outro host não é seguido. Tratar redirect como falha até a origem documentar outro comportamento. Essa proposta já está em [README.md](README.md). Comparar prefixo de string não basta: vale o destino resolvido, esquema, porta e caminho. Ver [seguranca/codigo-seguro.md](../seguranca/codigo-seguro.md).
- Limitar novas tentativas e concorrência. Erro permanente, como caminho inexistente confirmado, não entra em repetição infinita.
- Respeitar orientação da origem e `Retry-After` quando existirem. O bloqueio descrito pelo TSE recomeça se houver tentativa antes do fim; parar nesse caso. O número de concorrência continua pendente.

**Justificativa:** O cheat sheet de SSRF da OWASP, consultado em 14 de outubro de 2026, trata allowlist e o não seguimento cego de redirect como proteção quando o destino deveria ser conhecido. O coletor é o caso em que os hosts cabem numa allowlist.

**Verificação:** teste com servidor local controlado. Não enviar esses casos ao TSE.

## Publicação

### COL-005. Versão inteira, depois o manifesto

**Nível:** Obrigatório.

**Regra:** A ordem já definida no README do coletor permanece:

1. Validar antes de publicar. Inválido não vira arquivo de resultado.
2. Publicar os arquivos da versão, com identificador que não é reaproveitado para outro conteúdo.
3. Conferir o conjunto.
4. Só então atualizar o manifesto.
5. Falha conserva o manifesto anterior.
6. Não misturar arquivo de duas versões no ponteiro que o navegador segue.

Três horários continuam distintos: origem, coleta e publicação. Coleta bem-sucedida não prova que a apuração mudou.

Não presumir atomicidade entre objetos. A página de consistência do R2, consultada em 14 de outubro de 2026, diz que leitura após escrita de um objeto é fortemente consistente no acesso direto ao bucket, e que dois escritores na mesma chave: o último a concluir prevalece. Também diz que, com cache no domínio, o objeto antigo pode continuar na borda até o TTL ou um purge. Vários arquivos mais um manifesto mais o cache não são uma escrita única. Não prometer troca global instantânea.

Normalização pesada e interpretação de campo bruto não vão para o navegador.

**Onde se aplica:** publicador local e, depois, publicador do R2. Os dois preservam a mesma ordem. Ver CC-003.

**Antipadrão:** atualizar o manifesto e gravar os arquivos em seguida.

**Verificação:** teste em que a escrita de um arquivo exigido falha e o ponteiro lido ao final é o anterior. Fake de R2 não prova o cache da CDN. Isso fica na homologação, [testes/seguranca.md](../testes/seguranca.md).

## Referências

Consultadas em 14 de outubro de 2026:

- Cloudflare R2, consistência: <https://developers.cloudflare.com/r2/reference/consistency/>
- OWASP Cheat Sheet Series, prevenção de SSRF: <https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html>
- Node.js, não bloquear o event loop: <https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop>

A operação de coleta continua limitada pelo que [README.md](README.md) e [dados/README.md](../dados/README.md) já registraram sobre o TSE.

[Voltar ao coletor](README.md)
