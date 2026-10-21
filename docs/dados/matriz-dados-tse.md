# Matriz de dados do TSE

[Voltar a dados](README.md) · [Contrato](contrato.md) · [Evidência ET-01](../planejamento/evidencias/ET-01.md)

Liga cada informação da tela a um arquivo e campo da origem.

**Fontes.** Além das especificações, foram lidos as "Instruções para download" (v1.1, 19/10/2026) e o "Manual de verificação dos arquivos JWS" (16/09/2026). "Spec" é a especificação oficial lida por inteiro em 20/10/2026, a partir dos PDFs baixados pelo usuário (o site do TSE responde 403 ao cliente automatizado): EA11 de 23/06/2026, EA14 e EA15 de 10/06/2026, EA20 de 13/10/2026. Os PDFs ficam em `.local/tse/docs/` (fora do git). "Amostra" é observação em captura oficial em `.local/tse/` (EA11 de 18/10; EA20 presidente Brasil, presidente SP e governador DF, todos em estado pré-eleição do 2º turno). Nenhuma linha vem de conhecimento externo.

## Caminhos e nomes de arquivo

| Arquivo                      | Caminho                                                                                                                                                                                                          | Fonte                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Configuração (EA11)          | `<base>/<ambiente>/comum/config/ele-c.json`                                                                                                                                                                      | Spec (nome), Amostra (caminho)                      |
| Resultado (EA20)             | `arq[tp=u].dir` = `<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>`; nome `br-c<cargo:4>-e<eleição:6>-u.json` (Brasil, só presidente) ou `<uf>-c<cargo:4>-e<eleição:6>-u.json` (UF: presidente e cargos da UF) | Spec, Amostra (BR, SP, DF)                          |
| Acompanhamento Brasil (EA14) | `<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/br/br-e<eleição:6>-ab.json`                                                                                                                                        | Spec, Instruções v1.1 (pasta `dados/{br             | uf  | zz}` guarda unificados, eleitos e acompanhamentos), exemplo do simulado na página técnica |
| Acompanhamento UF (EA15)     | `<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>/<uf>-e<eleição:6>-ab.json`                                                                                                                                    | Spec, Instruções v1.1, exemplo do simulado          |
| Eleitos (EA10)               | `dados/<br\|uf>/<br\|uf>-c<cargo:4>-e<eleição:6>-e.json`; só após a totalização final da primeira UF                                                                                                             | Instruções v1.1, página técnica. Spec EA10 não lida |
| Assinatura (JWS)             | Cada JSON tem um par `.jws` com os mesmos dados assinados                                                                                                                                                        | Manual JWS. Nome do par não explicitado             |

O EA14 traz num único arquivo um `abr` para o Brasil e um por UF com eleição ordinária, com seções e eleitorado. É a fonte natural do andamento por UF no mapa, sem baixar 27 arquivos de resultado. Gerado só para eleições ordinárias.

## Configuração (EA11)

| Informação  | Campo                                  | Semântica                                                                                                      | Fonte         |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------- |
| Fase        | `f`                                    | `s` simulado, `o` oficial                                                                                      | Spec          |
| Pleito      | `pl[].cd`, `cdpr`, `c`, `dt`, `dtlim`  | Pleito, processo eleitoral, ciclo, data, data-limite de divulgação                                             | Spec          |
| Eleição     | `pl[].e[].cd`, `cdt2`, `nm`, `t`, `tp` | Código; código do 2º turno (no registro do 1º); nome; turno; tipo (1 estadual ordinária … 8 federal ordinária) | Spec          |
| Abrangência | `e[].abr[].cd`                         | `br` para federal; **UF no 2º turno de eleição estadual ordinária** (fonte da lista de governador, DP-05)      | Spec, Amostra |
| Cargo       | `abr[].cp[].cd`, `ds`, `tp`            | Código, nome, tipo (1 majoritário, 2 proporcional, 3 pergunta)                                                 | Spec          |
| Geração     | `dg`, `hg`, `idg`                      | Data, hora, identificador da geração. Sem ordem garantida para `idg`                                           | Spec          |

## Resultado (EA20)

| Informação da tela       | Campo                            | Semântica                                                                                                                                                               | Fonte         | Uso no contrato                         |
| ------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------- |
| Abrangência              | `tpabr`, `cdabr`                 | `br`, `uf`, `mu`, `zona`                                                                                                                                                | Spec, Amostra | Validação do arquivo pedido             |
| Fase, suplementar        | `f`, `sup`                       | `s`/`o`; `s`/`n`                                                                                                                                                        | Spec          | Não usado                               |
| Votação liberada         | `dv`                             | Só aplicável a presidente. Com `n`, os votos vêm zerados                                                                                                                | Spec          | `votesReleased`                         |
| Andamento                | `and`                            | **`n`** não totalizado, **`p`** em andamento, **`f`** finalizado. Eleição federal: no arquivo de UF, `f` quando `snt` = 0; no arquivo Brasil, `f` com totalização final | Spec          | `totalization.status`                   |
| Totalização final        | `tf`                             | Juiz eleitoral finaliza a eleição, elegendo ou não. Diferente de `and` = `f`                                                                                            | Spec          | `totalization.finalIndicator`           |
| Reprocessamento pendente | `mntf`                           | Motivo de não haver totalização final por atualização de candidatura                                                                                                    | Spec          | Não usado                               |
| Matematicamente definido | `md`                             | `e` eleito, `s` segundo turno, `n` não definido; presidente, governador e prefeito; só enquanto `tf` = `n`                                                              | Spec          | Não usado (DP-11)                       |
| Sem atribuição de eleito | `esae`, `mnae`                   | Após `tf` = `s`                                                                                                                                                         | Spec          | Não usado                               |
| Horário da totalização   | `dt`, `ht`                       | Última totalização. Vazios antes da primeira                                                                                                                            | Spec, Amostra | `origin.totalizedAt`, sem fuso          |
| Horário da geração       | `dg`, `hg`                       | Geração do arquivo                                                                                                                                                      | Spec          | `origin.generatedAt`, sem fuso          |
| Cargo                    | `carg[].cd`, `nmn`               | 1 Presidente, 3 Governador                                                                                                                                              | Spec, Amostra | Validação                               |
| Candidatura              | `cand[].sqcand`, `n`, `nmu`      | Identificador único (também da foto), número e nome de urna                                                                                                             | Spec          | `candidateId`, `number`, `ballotName`   |
| Votos                    | `cand[].vap`                     | Votos **computados**: destinados pela urna, antes das regras de totalização                                                                                             | Spec          | `votes`                                 |
| Percentual               | `cand[].pvap`, `pvapn`           | Sobre votos a votáveis concorrentes (`vvc`). `pvap` com 2 casas e vírgula; `pvapn` com 9 casas                                                                          | Spec          | `contestantVotesPercentage` (de `pvap`) |
| Eleito / 2º turno        | `cand[].e`                       | `s` também quando a candidatura vai ao 2º turno                                                                                                                         | Spec          | Não usado (DP-11)                       |
| Situação                 | `cand[].st`                      | Só após totalização final                                                                                                                                               | Spec          | Não usado (DP-11)                       |
| Vice                     | `cand[].vs[]` (`tp` = `v`)       | Nome, nome de urna, partido                                                                                                                                             | Spec, Amostra | Não usado                               |
| Substituído              | `cand[].subs[]`                  | Candidatura substituída                                                                                                                                                 | Spec          | Não usado                               |
| Seções                   | `s.ts`, `s.st`, `s.pst`, `s.snt` | Total, totalizadas, % totalizadas, não totalizadas                                                                                                                      | Spec          | `sections`                              |
| Votos agregados          | `v.tv`, `v.vvc`, `v.vv`          | `tv` = `vb` + `vn` + `vnt` + `van` + `vansj` + `vv`; `vvc` = `vv` + `van` + `vansj`                                                                                     | Spec          | `votes.total`, `contestant`, `valid`    |
| Brancos e nulos          | `v.vb`, `v.tvn`, `v.vn`, `v.vnt` | `pvb` e `ptvn` sobre `tv`                                                                                                                                               | Spec          | Não usado                               |
| Sem candidato            | `v.vscv`                         | Se > 0, demais contagens zeradas exceto `tv`                                                                                                                            | Spec          | Não tratado                             |
| Comparecimento           | `e.c`, `e.a`, `e.te`             | Comparecimento e abstenção sobre eleitores das seções instaladas                                                                                                        | Spec          | Não usado                               |

Percentuais: arredondamento meio para cima; `0` e `100` sem casas decimais nos campos `…n`.

## Ainda sem amostra ou sem documento

| Informação                                    | Bloqueio                                            |
| --------------------------------------------- | --------------------------------------------------- |
| Resultado com votos (EA20 do 2º turno)        | Eleição em 25/10/2026 (ET-01-T07)                   |
| Acompanhamento (EA14/EA15)                    | Caminho conhecido pela spec; nenhuma consulta feita |
| Assinatura                                    | Manual JWS não fornecido (ET-01-T09, DP-06)         |
| Instruções de download, Resolução 23.751/2026 | Não fornecidas                                      |
