# ET-11 — Web completo

[Catálogo e status](README.md) · [Plano mestre](../plano-mestre.md) · [Rastreabilidade](../rastreabilidade.md) · [Decisões e riscos](../decisoes-e-riscos.md)

Estado documental, estado da implementação e prontidão: ver o [catálogo](README.md).

## 1. Identificação e objetivo

| Campo | Conteúdo |
| --- | --- |
| ID | ET-11 |
| Componente | `apps/web` |
| Tipo predominante | Código com testes de interface e verificação em homologação |
| Marco | M5 — Produto funcional |
| Resultado concreto | Na homologação, o visitante escolhe uma UF pelo mapa ou por uma lista equivalente, vê o Brasil e a UF, vê governador só onde há disputa, acompanha a atualização periódica sem pedidos sobrepostos, e entende quando o dado está indisponível, falhou ou envelheceu, com teclado, leitor de tela e tela estreita |

## 2. Escopo e exclusões

**Faz:** mapa SVG e lista equivalente; navegação Brasil/UF; painéis presidencial e estadual finais; governador condicional; polling centralizado com controle de sobreposição, variação de intervalo e redução em segundo plano; tratamento de respostas fora de ordem; preservação do último válido; aviso de desatualização; responsividade e acessibilidade; segurança da apresentação; testes de interação e percurso em homologação.

**Não faz:**

- Não cria API, função Worker, SSE ou WebSocket para atualizar a tela.
- Não adiciona biblioteca de estado, roteamento ou mapas sem necessidade demonstrada (DA-10). URL compartilhável por UF é decisão própria de produto, fora desta etapa salvo pedido.
- Não mostra município, Senado, deputados nem projeção.
- Não transforma contagem de UFs lideradas em resultado nacional.

## 3. Contexto e evidências

Estado observado em 17/10/2026: só a tela inicial existe em `apps/web`. A partir de ET-06 existirão leitura, hook e painéis mínimos. Base: [web/README.md](../../web/README.md) (estados, regras de apresentação, polling), WEB-001 a WEB-007 em [web/padroes-de-desenvolvimento.md](../../web/padroes-de-desenvolvimento.md), PERF-002 em [performance.md](../../padroes/performance.md), SEC-004 em [codigo-seguro.md](../../seguranca/codigo-seguro.md). Fonte do GeoJSON pendente (DP-29).

## 4. Dependências e critérios de entrada

| Tipo | Item | Bloqueia |
| --- | --- | --- |
| Implementação | ET-06: leitura, hook, painéis mínimos | Início de todas as tarefas de código |
| Implementação | ET-08: homologação publicando resultados | Conclusão (T13 em homologação) |
| Decisão | DP-29 (GeoJSON e cor do mapa) | T01, T02 |
| Decisão | DP-14 (limiar de desatualização) | Valor de T09 |
| Decisão | DP-17 (intervalo de polling) | Valor de T07; o mecanismo não espera |
| Decisão | DP-11 (status oficial) | Rótulo em T05 |
| Decisão | DP-19 (ponta a ponta) | Automação de T13 |

**Início parcial:** depois de ET-06, todas as tarefas de código podem avançar com fixtures e com a publicação local. A conclusão exige ET-08 (dados reais publicados na homologação). Esta etapa não depende de ET-09 nem de ET-10.

## 5. Entradas e saídas

**Entradas:** contrato (ET-02), leitura e hook (ET-06), geometria (T01), site e resultados de homologação (ET-07, ET-08).

**Saídas:**

| Artefato | Consumidor |
| --- | --- |
| Interface completa em `apps/web/src/features/` (proposto: `mapa/`, `resultados/`, `selecao-uf/`) | ET-12 (build e deploy), ET-13 (cenários de interface), ET-14 |
| Geometria das UFs com atribuição e licença em `apps/web/src/features/mapa/` (proposto) | Build |
| Suíte de interação e roteiro de ponta a ponta | ET-12, ET-13 |

## 6. Responsabilidades e fronteiras

| Peça (proposta) | Responsabilidade |
| --- | --- |
| Agendador de leitura (um só) | Quando ler o manifesto; sem sobreposição; variação; segundo plano; parada no encerramento |
| Hook de resultados | Estado de exibição; último válido; descarte de obsoleto |
| Mapa | Apresentar UFs e emitir seleção |
| Lista de UFs | Mesma seleção, caminho principal para teclado e leitor de tela |
| Painéis | Apresentar o que o contrato traz |

A seleção é um estado compartilhado por mapa e lista, no menor componente comum (WEB-002). Cada painel não dispara a própria consulta (WEB-005).

## 7. Sequência de tarefas

### ET-11-T01 — Escolher a fonte cartográfica e preparar a geometria

- **Tipo:** investigação + código
- **Resultado pretendido:** geometria pública, com licença compatível, das 27 unidades (incluindo DF), simplificada, com identificadores ligados aos do contrato (DP-29).
- **Entradas e pré-requisitos:** identificadores de UF do contrato (ET-02-T01).
- **Ações:**
  1. Levantar fontes públicas de GeoJSON das UFs; registrar licença, atribuição exigida e data.
  2. Escolher e registrar como `DA-NN`.
  3. Simplificar a geometria para o tamanho adequado ao primeiro carregamento; registrar tamanho antes e depois.
  4. Mapear cada feição ao identificador do contrato.
  5. Decidir se a conversão para caminhos SVG acontece antes (arquivo gerado e versionado) ou no navegador.
- **Responsabilidade e caminhos:** `apps/web/src/features/mapa/` (proposto).
- **Regras, falhas e bordas:** feição sem correspondência no contrato é erro de build, não UF fantasma.
- **Saída:** geometria e atribuição.
- **Validações:** ET-11-V01
- **Concluída quando:** as 27 unidades têm geometria e identificador; licença registrada.
- **Bloqueios ou aprovações:** DP-29; dependência nova, se alguma ferramenta de conversão for necessária (SEC-008).

### ET-11-T02 — Construir o mapa SVG acessível

- **Tipo:** código
- **Resultado pretendido:** clicar ou usar o teclado no mapa seleciona a UF; a seleção é perceptível sem depender só de cor.
- **Entradas e pré-requisitos:** T01.
- **Ações:**
  1. Renderizar as UFs com nome acessível.
  2. Seleção por clique e por teclado, ou mapa como reforço visual com a lista (T03) como caminho de teclado, conforme decisão registrada.
  3. Indicar a seleção com contorno ou padrão, além da cor.
  4. Decidir (DP-29) se o mapa colore UFs por liderança parcial; se sim, legenda explícita "liderança parcial na UF", sem relação com o resultado nacional.
- **Responsabilidade e caminhos:** `apps/web/src/features/mapa/` (proposto).
- **Regras, falhas e bordas:** UF sem dado ainda aparece como "sem dado", não com cor de candidato.
- **Saída:** componente e testes.
- **Validações:** ET-11-V02, ET-11-V14
- **Concluída quando:** seleção por mouse e teclado testada; seleção visível sem cor.
- **Bloqueios ou aprovações:** DP-29.

### ET-11-T03 — Construir a lista de seleção equivalente

- **Tipo:** código
- **Resultado pretendido:** uma lista textual oferece a mesma escolha que o mapa (WEB-006).
- **Entradas e pré-requisitos:** ET-06-T06.
- **Ações:**
  1. Lista das UFs do contrato, com o estado de seleção compartilhado com o mapa.
  2. Ordem e rótulos claros; chave pelo identificador do contrato.
- **Responsabilidade e caminhos:** `apps/web/src/features/selecao-uf/` (proposto).
- **Regras, falhas e bordas:** a lista continua utilizável quando o mapa não couber na tela.
- **Saída:** componente e testes.
- **Validações:** ET-11-V03
- **Concluída quando:** selecionar na lista atualiza o mapa e vice-versa.
- **Bloqueios ou aprovações:** nenhum.

### ET-11-T04 — Implementar a navegação Brasil/UF

- **Tipo:** código
- **Resultado pretendido:** o visitante alterna entre a visão Brasil e a UF selecionada e volta ao Brasil.
- **Entradas e pré-requisitos:** T02, T03.
- **Ações:**
  1. Estado de visão (Brasil ou UF) e ação de voltar.
  2. Mover o foco para o painel aberto, de forma previsível.
- **Responsabilidade e caminhos:** `apps/web/src/app/` ou feature (proposto).
- **Regras, falhas e bordas:** sem roteador novo; se o produto pedir URL por UF, registrar decisão antes.
- **Saída:** navegação e testes.
- **Validações:** ET-11-V04
- **Concluída quando:** ida e volta funcionam por teclado.
- **Bloqueios ou aprovações:** nenhum.

### ET-11-T05 — Finalizar o painel presidencial

- **Tipo:** código
- **Resultado pretendido:** painel nacional e estadual completos, claros sobre o que é parcial.
- **Entradas e pré-requisitos:** ET-06-T05; DP-11.
- **Ações:**
  1. Candidaturas, votos, percentual de votos e percentual de apuração com rótulos distintos.
  2. Indicação de que a liderança é parcial enquanto o contrato não indicar totalização final; status oficial só se DP-11 decidir e com rótulo de fonte.
  3. Horários e indicação de simulado.
  4. Identificação da fonte, conforme DP-07.
- **Responsabilidade e caminhos:** `apps/web/src/features/resultados/` (proposto).
- **Regras, falhas e bordas:** nenhuma frase do tipo "eleito" produzida por nós.
- **Saída:** painel e testes.
- **Validações:** ET-11-V05
- **Concluída quando:** cada regra de apresentação de [web/README.md](../../web/README.md) tem teste.
- **Bloqueios ou aprovações:** DP-11, DP-07.

### ET-11-T06 — Finalizar o painel de governador condicional

- **Tipo:** código
- **Resultado pretendido:** governador aparece só onde o contrato indica disputa; nas outras UFs, explicação.
- **Entradas e pré-requisitos:** ET-06-T06.
- **Ações:**
  1. Painel com as mesmas regras de T05.
  2. Texto para "sem disputa no segundo turno nesta UF".
  3. Estado "ainda não disponível" distinto de "sem disputa".
- **Responsabilidade e caminhos:** `apps/web/src/features/resultados/` (proposto).
- **Regras, falhas e bordas:** lista de UFs com disputa vem só do contrato.
- **Saída:** painel e testes.
- **Validações:** ET-11-V06
- **Concluída quando:** os três estados têm teste.
- **Bloqueios ou aprovações:** nenhum.

### ET-11-T07 — Centralizar o polling com controle de sobreposição

- **Tipo:** código
- **Resultado pretendido:** um agendador único lê o manifesto, nunca com dois pedidos simultâneos, espalhando os clientes no tempo e reduzindo trabalho quando previsto.
- **Entradas e pré-requisitos:** ET-06-T07.
- **Ações:**
  1. Próxima leitura só depois da anterior terminar.
  2. Variação pequena e aleatória do intervalo (aleatoriedade injetada para teste), sem alterar a URL.
  3. Aba em segundo plano: pausar ou espaçar, conforme decisão registrada; ao voltar, ler logo.
  4. Parar quando o manifesto sinalizar atualização encerrada (ET-02-T02).
  5. Buscar arquivos só quando a versão mudar, e só os da visão ativa.
- **Responsabilidade e caminhos:** `apps/web/src/features/resultados/hooks/` (proposto).
- **Regras, falhas e bordas:** sem parâmetro aleatório na URL (WEB-005); intervalo de configuração até DP-17.
- **Saída:** agendador e testes com timers falsos.
- **Validações:** ET-11-V07
- **Concluída quando:** os cinco comportamentos têm teste separado.
- **Bloqueios ou aprovações:** DP-17 só quanto ao valor.

### ET-11-T08 — Tratar respostas fora de ordem e regressão de versão

- **Tipo:** código
- **Resultado pretendido:** resposta atrasada não substitui estado mais novo nem de outra seleção.
- **Entradas e pré-requisitos:** ET-06-T04.
- **Ações:**
  1. Descartar resposta de arquivo de seleção anterior.
  2. Ignorar manifesto com versão anterior à exibida (ET-02-T08).
  3. Testes com Promises resolvidas em ordem inversa.
- **Responsabilidade e caminhos:** hook de resultados (proposto).
- **Regras, falhas e bordas:** —
- **Saída:** testes.
- **Validações:** ET-11-V08
- **Concluída quando:** os dois casos têm teste.
- **Bloqueios ou aprovações:** nenhum.

### ET-11-T09 — Preservar o último válido e avisar desatualização

- **Tipo:** código
- **Resultado pretendido:** durante falha, os números continuam com aviso; acima do limiar decidido, o aviso de desatualização aparece (DP-14).
- **Entradas e pré-requisitos:** ET-06-T04.
- **Ações:**
  1. Aplicar o limiar decidido em DP-14 aos horários do contrato (origem, verificação ou publicação, conforme ET-02-T02).
  2. Textos distintos para "falha na última tentativa" e "dados podem estar desatualizados".
  3. Usar região viva educada para avisos, sem anunciar cada leitura sem mudança.
- **Responsabilidade e caminhos:** hook e componentes (proposto).
- **Regras, falhas e bordas:** relógio do navegador pode estar errado; registrar a escolha (comparar com horário do servidor, se disponível no cabeçalho, ou aceitar o relógio local).
- **Saída:** comportamento e testes.
- **Validações:** ET-11-V09
- **Concluída quando:** falha e envelhecimento têm testes separados.
- **Bloqueios ou aprovações:** DP-14 para o valor.

### ET-11-T10 — Garantir responsividade, teclado, foco e textos claros

- **Tipo:** código
- **Resultado pretendido:** a interface é utilizável em tela estreita, por teclado e por leitor de tela.
- **Entradas e pré-requisitos:** T02–T09.
- **Ações:**
  1. Layout em tela estreita: mapa pode ceder espaço; seleção de UF permanece.
  2. Ordem de foco, foco visível, nomes acessíveis, contraste.
  3. Revisão manual com leitor de tela em pelo menos um navegador; registrar qual.
  4. Verificação automatizada de acessibilidade, se uma ferramenta for aprovada (DP-19).
- **Responsabilidade e caminhos:** componentes.
- **Regras, falhas e bordas:** cor nunca é o único sinal.
- **Saída:** ajustes e evidência.
- **Validações:** ET-11-V10, ET-11-V11
- **Concluída quando:** checklist registrado sem bloqueadores.
- **Bloqueios ou aprovações:** nenhum.

### ET-11-T11 — Garantir a segurança da apresentação

- **Tipo:** código
- **Resultado pretendido:** conteúdo externo nunca vira HTML; links só para destinos permitidos (SEC-004, WEB-006).
- **Entradas e pré-requisitos:** T05, T06.
- **Ações:**
  1. Revisar ausência de `dangerouslySetInnerHTML`.
  2. Validar qualquer URL dinâmica contra destinos permitidos.
  3. Conferir os cabeçalhos de segurança do site de homologação (ET-07-T11) com a interface completa (por exemplo, política de conteúdo compatível com o SVG e o build).
- **Responsabilidade e caminhos:** componentes; configuração de cabeçalhos em `infra/cloudflare/` (proposto).
- **Regras, falhas e bordas:** —
- **Saída:** testes e revisão.
- **Validações:** ET-11-V12
- **Concluída quando:** testes de texto e de link passam; cabeçalhos não bloqueiam a interface.
- **Bloqueios ou aprovações:** nenhum.

### ET-11-T12 — Medir bundle e render do mapa

- **Tipo:** teste
- **Resultado pretendido:** custo do mapa conhecido antes de qualquer otimização (PERF-001, PERF-002).
- **Entradas e pré-requisitos:** T02.
- **Ações:**
  1. Tamanho do bundle e da geometria comparado com a linha de base de ET-06-T10.
  2. Observar se a mudança de horário ou de versão redesenha o mapa inteiro sem necessidade.
  3. Só otimizar com medida registrada.
- **Responsabilidade e caminhos:** evidência.
- **Regras, falhas e bordas:** memoização só com custo medido (WEB-004).
- **Saída:** medição.
- **Validações:** ET-11-V13
- **Concluída quando:** valores registrados.
- **Bloqueios ou aprovações:** nenhum.

### ET-11-T13 — Testar interação, atualização e o percurso em homologação

- **Tipo:** teste
- **Resultado pretendido:** M5 demonstrado na homologação.
- **Entradas e pré-requisitos:** T01–T12; ET-08.
- **Ações:**
  1. Decidir a ferramenta de ponta a ponta (DP-19) ou manter roteiro manual registrado.
  2. Percurso: abrir Brasil; escolher UF com governador; escolher UF sem governador; observar nova versão; provocar falha (parar o coletor de homologação ou apontar para versão ausente em ensaio) e ver último válido e aviso.
  3. Registrar com evidência real.
- **Responsabilidade e caminhos:** `tests/e2e/` (proposto) ou roteiro em evidência.
- **Regras, falhas e bordas:** dados de homologação marcados como simulados quando forem.
- **Saída:** evidência de M5.
- **Validações:** ET-11-V15
- **Concluída quando:** todos os estados de [web/README.md](../../web/README.md) foram observados em homologação.
- **Bloqueios ou aprovações:** ET-08; DP-19 para automação.

## 8. Contratos e compatibilidade

- Consome o contrato sem campo novo. Se a interface precisar de informação que o contrato não tem, a mudança começa em ET-02 (PKG-003).
- O sinal de atualização encerrada (ET-02-T02) passa a ter efeito aqui.
- Geometria liga-se ao identificador de UF do contrato; mudança desse identificador é incompatível.

## 9. Segurança, integridade e performance

- R-19: V08. R-22: V07. R-05: V09.
- PL-REQ-001: V14 garante que o nacional vem do agregado.
- SEC-004: V12.
- Performance: geometria simplificada; uma leitura de manifesto por intervalo por visitante; arquivos só quando muda a versão. O efeito na borda é medido em ET-13.

## 10. Plano de validação

| ID | Cenário | Preparação | Ação | Sucesso | Falha se | Nível | Ambiente | Tarefa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ET-11-V01 | Geometria | T01 | Cruzar feições com UFs do contrato; ler licença | 27 unidades com identificador; licença e atribuição registradas | Unidade faltando ou licença ausente | Revisão + unitário | Local | T01 |
| ET-11-V02 | Seleção no mapa | Mapa renderizado | Clicar; usar teclado | UF selecionada; seleção visível sem cor | Seleção só por cor, ou teclado não funciona | Interface | Local | T02 |
| ET-11-V03 | Lista equivalente | Mapa e lista | Selecionar em cada um | Estado compartilhado | Divergência | Interface | Local | T03 |
| ET-11-V04 | Brasil/UF | Visão Brasil | Abrir UF; voltar | Ida e volta; foco previsível | Foco perdido ou estado preso | Interface | Local | T04 |
| ET-11-V05 | Painel presidencial | Fixtures parcial e final | Renderizar | Rótulos distintos; parcial indicado; nenhum "eleito" nosso | Vencedor declarado ou rótulos confundidos | Interface | Local | T05 |
| ET-11-V06 | Governador | UF com disputa, sem disputa, sem dado (casos separados) | Selecionar | Painel, explicação, indisponível | Estados confundidos | Interface | Local | T06 |
| ET-11-V07 | Polling | Timers e aleatoriedade controlados | Avançar tempo; simular segundo plano; manifesto encerrado; resposta lenta (casos separados) | Sem sobreposição; intervalos variam; URL sem parâmetro aleatório; segundo plano reduzido; parada no encerramento | Qualquer caso diferente | Unitário | Local | T07 |
| ET-11-V08 | Ordem e regressão | Respostas invertidas; manifesto antigo | Resolver fora de ordem | Estado mais novo e seleção atual preservados | Regressão | Unitário | Local | T08 |
| ET-11-V09 | Falha e envelhecimento | Versão exibida | Falhar leitura; avançar além do limiar (casos separados) | Último válido com aviso de falha; aviso de desatualização no limiar | Tela vazia, zerada, ou sem aviso | Interface | Local | T09 |
| ET-11-V10 | Teclado e leitor | Interface completa | Checklist manual e verificação automatizada, se aprovada | Sem bloqueador registrado | Bloqueador | Interface | Local | T10 |
| ET-11-V11 | Tela estreita | Largura pequena | Navegar | Seleção de UF disponível; painéis legíveis | Seleção inacessível | Interface | Local | T10 |
| ET-11-V12 | Apresentação segura | Texto com marcação; URL não permitida | Renderizar | Texto literal; link não criado | Elemento criado ou link aceito | Interface | Local | T11 |
| ET-11-V13 | Custo do mapa | Build | Medir bundle e redesenho | Valores registrados | Sem registro | Integração | Local | T12 |
| ET-11-V14 | Nacional não é contagem | UFs com líderes diferentes do nacional | Renderizar Brasil e mapa | Nacional do agregado; legenda de liderança por UF, se houver cor | Nacional derivado do mapa | Interface | Local | T02 |
| ET-11-V15 | Percurso em homologação | ET-08 ativo | Roteiro de T13 | Todos os estados observados e registrados | Estado não observado | Ponta a ponta | Homologação | T13 |

Testes de interface com fixtures não provam cache nem comportamento sob carga; V15 prova o percurso, não a capacidade (ET-13).

## 11. Infraestrutura e ações externas

Usa o site e os resultados de homologação já existentes. Deploy do build segue o procedimento de ET-08-T06 até ET-12 automatizar.

## 12. Falha, reversão e recuperação

- **Código:** reverter o commit; redeploy do build anterior em homologação.
- **Interface quebrada em homologação:** voltar à versão anterior do site pela ferramenta de deploy (confirmar recurso de versões na documentação vigente).
- **Dados:** a interface não grava dados.

## 13. Critérios de conclusão

- [ ] Geometria com licença; mapa e lista com seleção compartilhada (V01–V03).
- [ ] Navegação e painéis finais (V04–V06, V14).
- [ ] Polling, ordem, falha e envelhecimento (V07–V09).
- [ ] Acessibilidade, tela estreita e apresentação segura (V10–V12).
- [ ] Custo do mapa medido (V13).
- [ ] Percurso em homologação registrado (V15).

## 14. Pendências e passagem adiante

- DP-14 e DP-17 podem receber valores depois de ET-13; o código usa configuração.
- ET-12 recebe: build final para automatizar.
- ET-13 recebe: comportamento real de polling para modelar a carga (leituras por visitante por intervalo).

## 15. Brief de execução

Completar o web: geometria pública com licença, mapa SVG acessível e lista equivalente, navegação Brasil/UF, painéis finais, governador condicional, polling central sem sobreposição com variação e redução em segundo plano, descarte de resposta obsoleta, último válido com aviso, desatualização pelo limiar, tela estreita, teclado e apresentação segura. Medir o mapa. Concluir com percurso em homologação. Sem API, sem biblioteca nova sem motivo, sem contar UFs como resultado nacional. Validações V01–V15. Referências: WEB-001 a WEB-007, PERF-002, SEC-004, [web/README.md](../../web/README.md).
