# Matriz de dados do TSE

[Voltar a dados](README.md) · [Contrato](contrato.md) · [Evidência ET-01](../planejamento/evidencias/ET-01.md)

Liga cada informação da tela a um arquivo e campo da origem. **Fonte de cada linha:** "Observado" significa visto em amostra oficial guardada em `.local/tse/` (fora do git), sem a especificação, cujos PDFs respondem 403 ao cliente automatizado. "Usuário" significa trecho da especificação EA20 fornecido pelo usuário (ver [contrato.md](contrato.md)). Nenhuma linha vem de conhecimento externo.

Amostras: EA11 `ele-c.json` (19/10/2026, vigente em 20/10); EA20 Brasil presidente `br-c0001-e006258-u.json` (19/10); EA20 SP presidente `sp-c0001-e006258-u.json` e DF governador `df-c0003-e006260-u.json` (20/10). Todas em estado pré-eleição do 2º turno.

## Configuração (EA11)

| Informação             | Campo                                           | Semântica                                                                               | Fonte     | Pendência                                                                       |
| ---------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------- |
| Pleitos                | `pl[].cd`, `pl[].dt`                            | Código do pleito e data                                                                 | Observado | —                                                                               |
| Eleições do pleito     | `pl[].e[].cd`, `nm`, `t`                        | Código da eleição, nome, turno                                                          | Observado | —                                                                               |
| Ligação entre turnos   | `pl[].e[].cdt2`                                 | Código da eleição do 2º turno, no registro do 1º                                        | Observado | —                                                                               |
| Cargos por abrangência | `pl[].e[].abr[].cd`, `abr[].cp[].cd`, `cp[].ds` | UF (ou `br`) e cargos em disputa nela. Fonte da lista de governador no 2º turno (DP-05) | Observado | Reconfirmar em ET-14-T04                                                        |
| Montagem de caminhos   | `arq[].tp`, `arq[].dir`                         | Modelos `<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>` por tipo de arquivo         | Observado | Nome de arquivo (`<uf>-c<cargo:4>-e<eleição:6>-u.json`) confirmado só para EA20 |
| Geração                | `dg`, `hg`, `idg`                               | Data, hora e identificador da geração                                                   | Observado | Fuso e ordenação de `idg` não confirmados                                       |

## Resultado (EA20), por cargo e abrangência

| Informação da tela        | Campo                       | Semântica                                                      | Fonte                              | Pendência                                                   |
| ------------------------- | --------------------------- | -------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| Abrangência               | `tpabr`, `cdabr`            | `br` ou `uf` + sigla minúscula                                 | Observado                          | —                                                           |
| Cargo                     | `carg[].cd`, `nmn`          | 1 Presidente, 3 Governador                                     | Observado                          | —                                                           |
| Candidatura               | `cand[].sqcand`, `n`, `nmu` | Identificador estável, número, nome de urna                    | Observado                          | —                                                           |
| Votos da candidatura      | `cand[].vap`                | Votos apurados                                                 | Usuário                            | —                                                           |
| Percentual da candidatura | `cand[].pvap`               | Sobre votos a votáveis concorrentes (`vvc`), não sobre válidos | Usuário (p. 14)                    | —                                                           |
| Votação liberada          | `dv`                        | `s`/`n`                                                        | Usuário                            | —                                                           |
| Andamento                 | `and`                       | `n`, `a`, `f`                                                  | Usuário; `n` e `f` observados      | `a` só da especificação fornecida                           |
| Indicador final           | `tf`                        | `s`/`n`, distinto de `and`                                     | Usuário                            | Semântica completa                                          |
| Seções                    | `s.ts`, `s.st`, `s.pst`     | Total, totalizadas, percentual                                 | Observado                          | —                                                           |
| Votos agregados           | `v.tv`, `v.vvc`, `v.vv`     | Total, votos a concorrentes, válidos                           | Usuário (`vvc`); demais observados | Brancos, nulos e anulados (`vb`, `vn`, `van`, …) não usados |
| Horário da totalização    | `dt`, `ht`                  | Vazio antes da totalização                                     | Observado                          | Fuso não confirmado; não vira `sourceTime`                  |
| Vagas da agremiação       | `agr[].vag`                 | Só no arquivo de UF de presidente                              | Observado                          | Significado desconhecido; não usado                         |
| Eleito, situação          | `cand[].e`, `cand[].st`     | —                                                              | Observado                          | Não entram no contrato (DP-11)                              |

## Ainda sem amostra

| Informação                 | Arquivo provável | Bloqueio                                     |
| -------------------------- | ---------------- | -------------------------------------------- |
| Acompanhamento Brasil e UF | EA14, EA15       | Caminho não confirmado em documentação (T06) |
| Resultado com votos        | EA20 do 2º turno | Eleição em 25/10/2026 (T07)                  |
| Assinatura                 | JWS              | Manual inacessível (T09, DP-06)              |
