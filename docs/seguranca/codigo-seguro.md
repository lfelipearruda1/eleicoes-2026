# Código seguro

[Voltar à segurança](README.md) · [Padrões comuns](../padroes/README.md)

Controles de implementação. A topologia, o WAF e o roteiro de incidente continuam em [README.md](README.md). Quase tudo abaixo está planejado: não há coleta, bucket nem workflow para inspecionar. “Planejado” não significa que o controle já proteja.

Identificadores SEC- são deste projeto. Não são requisitos da OWASP. A página do ASVS consultada em 14 de outubro de 2026 nomeia a versão 5.0.0 como a estável mais recente e também apresenta “Latest Version 5.0.0 (Bleeding Edge)”. Este guia não copia identificadores de requisito e não declara certificação nem conformidade integral. O ASVS é um catálogo para verificação futura, não um carimbo.

A página do projeto OWASP API Security Top 10 foi consultada na mesma data. O texto obtido apresenta o projeto e não a lista numerada de riscos. Nenhum identificador dessa lista é reproduzido aqui. A página do Web Security Testing Guide não foi aberta nesta sessão.

WAF não substitui código seguro. Teste unitário não demonstra proteção contra negação de serviço.

## Matriz

| Risco | Controle | Aplicação | Teste ou evidência | Estado |
| --- | --- | --- | --- | --- |
| Dado externo malformado vira estado interno | Validar estrutura, semântica, limite e campos permitidos na fronteira | Coletor, pacote de validação, web e API futura | Teste de entrada ausente, inválida, excessiva e com campo extra | Planejado. Zod instalado, sem schema |
| Corpo grande esgota memória antes da validação | Limite de tamanho antes do parse custoso | Coletor e API futura | Teste com corpo acima do teto, em servidor local | Planejado. O número do teto está pendente |
| Campo bruto repassado ao público | Copiar só o que o contrato nomeia | Coletor | Revisão do normalizador e teste de campo inesperado | Planejado |
| Prototype pollution em mistura de objetos | Não fazer merge recursivo de JSON não confiável em objeto de protótipo comum | Coletor e API futura | Teste com chave `__proto__` ou `constructor` em fixture | Planejado |
| URL arbitrária ou redirect aberto | Allowlist de esquema, host, porta e caminho; não seguir redirect fora dela | Coletor | Teste com destino local controlado e redirect não permitido | Planejado |
| Path traversal na chave ou no diretório local | Chave gerada pelo coletor, sem segmento `..` vindo de fora | Publicação | Teste de caminho que tenta sair do diretório | Planejado |
| XSS por texto do snapshot | Renderizar como texto; não usar HTML bruto | Web | Teste de marcação apresentada como texto | Planejado. A tela ainda não mostra dado externo |
| Segredo no bundle | Credencial fora de `VITE_*` e do código | Web | Busca no código e, na publicação, no artefato de build | Parcial. Não há `VITE_` nem segredo no código atual; o build de publicação não foi auditado nesta etapa |
| Credencial no Git | `.gitignore` ignora `.env` e `.env.*`, com exceção de `.env.example` | Repositório | Leitura do `.gitignore` | Implementado como ignore. Não há cofre de CI porque não há workflow |
| Log com token ou corpo completo | Redação e log estruturado do mínimo necessário | Coletor e CI futuro | Teste ou revisão de amostra de log | Planejado |
| Erro publicado como apuração | Não gravar falha no lugar do resultado; manifesto só muda com o conjunto válido | Coletor | Teste de falha de publicação | Planejado |
| Cache público de resposta privada | Bucket público só com o que o visitante pode ler; ambientes separados nas chaves | R2 e CDN | Homologação e inventário de objetos | Planejado. Não há bucket |
| SQL injection, se houver banco | Parâmetro vinculado; ORM não é defesa automática | Adapter futuro | Teste em banco real isolado | Condicional. Sem banco |
| Acesso indevido, se houver API autenticada | Autorização no objeto e na operação; sem atribuição em massa de campos | API futura | Teste HTTP da rota com o guard realmente ligado | Condicional. Sem API e sem login de visitante |
| Dependência vulnerável | Versão pinada e avaliação deliberada | Repositório | Auditoria quando o workflow existir | Planejado. O lockfile existe; a auditoria automática não |
| Workflow vaza segredo de fork | Permissão mínima e segredo fora de contribuição não confiável | GitHub Actions | Revisão do workflow | Planejado. A pasta só tem `.gitkeep` |

## Entradas e origem

### SEC-001. Validar na fronteira, sem coerção que invente dado

**Nível:** Obrigatório para o código novo.

**Regra:** Validar estrutura, tipo, limite, campo permitido e semântica que já esteja decidida. A resposta do TSE é entrada externa para o processamento. Isso não questiona o TSE como fonte oficial da apuração: questiona falha de transporte, arquivo truncado e dado que o nosso código ainda não sabe interpretar. Limitar volume antes de parsing custoso. O guia do Node.js consultado em 14 de outubro de 2026 trata JSON grande e expressão regular custosa como formas de prender o event loop. Não usar expressão regular complexa sobre entrada sem limite de tamanho.

Não usar coerção que transforme inválido em valor plausível, como número ausente virando zero. Não espalhar campos desconhecidos para o objeto interno nem para o JSON público. Rejeitar a entrada ou ignorar o campo de modo explícito e testado. O cheat sheet de validação de entrada, consultado na mesma data, separa validação de autorização e de codificação de saída, pede limite antes do parse e desaconselha denylist de caracteres como defesa de SQL ou de XSS.

**Onde se aplica:** coletor, `packages/validation`, leitura na web e pipe da API futura.

**Antipadrão:** `Number(value) || 0` num campo de votação.

**Verificação:** casos em [testes/seguranca.md](../testes/seguranca.md).

### SEC-002. Prototype pollution

**Nível:** Obrigatório.

**Regra:** Não usar merge recursivo de objeto não confiável. Não aceitar chave que altere o protótipo. O cheat sheet de prototype pollution, consultado em 14 de outubro de 2026, recomenda `Map` ou `Set` quando o problema for dicionário, e `Object.create(null)` quando um objeto sem protótipo for realmente necessário. Também cita `Object.freeze` em protótipos embutidos como defesa profunda que pode quebrar biblioteca, e a flag `--disable-proto=delete` do Node como defesa profunda, não como correção do merge. Não ligar essa flag no processo sem ensaio. A correção principal é não misturar JSON arbitrário no objeto de configuração.

**Onde se aplica:** configuração, normalização e qualquer `Object.assign` profundo futuro.

**Verificação:** fixture com `__proto__`. Não há esse código hoje.

## SSRF e caminhos

### SEC-003. Destino permitido, não prefixo de texto

**Nível:** Obrigatório no cliente do coletor.

**Regra:** A allowlist restringe origem, esquema, porta e caminho ao que a configuração oficial exigir. O coletor não aceita URL escolhida pelo visitante. Há um caso só: hosts oficiais conhecidos. O cheat sheet de SSRF, consultado em 14 de outubro de 2026, descreve esse caso como allowlist e pede não seguir redirect que fure a validação. Comparar o início da string não enxerga usuário, porta, DNS nem redirect. Resolver o destino e recusar o que sair da lista, inclusive endereços internos e serviço de metadados da nuvem, se um redirect ou uma resolução apontar para lá.

Chave de objeto e caminho local são gerados pelo coletor a partir de identificadores já validados. Rejeitar `..`, separador absoluto e caractere de controle. Teste usa servidor e diretório locais. Não consultar o TSE, o metadado real da AWS nem o R2 de produção para provar isso.

**Verificação:** testes de URL recusada e de caminho que escapa, em [testes/seguranca.md](../testes/seguranca.md).

## Web

### SEC-004. XSS e cabeçalho

**Nível:** Obrigatório na interface. Cabeçalhos são planejados na hospedagem.

**Regra:** Usar o escape do React. Não confiar na validação de entrada como única defesa de XSS: o cheat sheet de XSS diz que framework ajuda e que o escape de saída continua necessário nas lacunas. Política de segurança de conteúdo e os demais cabeçalhos, quando a hospedagem existir, são camada extra. Não estão configurados no repositório. CORS não autentica.

**Onde se aplica:** `apps/web` e a configuração futura de Workers Static Assets e do domínio dos JSON.

**Verificação:** teste de componente para o texto, e revisão de cabeçalho na homologação. O teste de DOM não prova a política do navegador inteiro.

## API futura

### SEC-005. Acesso só onde a operação não for pública

**Nível:** Condicional.

**Regra:** Leitura pública dos snapshots não ganha login por hábito. A primeira versão não tem conta de visitante. Se a API tiver operação administrativa, autenticação e autorização são daquela operação. Autorização verifica objeto, propriedade e ação, não só “tem um token”. Não aceitar campo de mais no corpo para alterar permissão ou ambiente. Cada operação tem limite de tamanho e de custo.

Se a aplicação passar a confiar em IP, confiar só no proxy conhecido e no cabeçalho que esse proxy define. Cabeçalho de IP enviado pelo cliente direto não é prova. CSRF entra se o modelo usar cookie de sessão no navegador. Sem esse modelo, não se adiciona fluxo de CSRF “por completar o checklist”.

**Verificação:** teste HTTP com o guard ligado na rota. Teste unitário da função do guard, sozinho, não prova que a rota o usa.

## Segredos e logs

### SEC-006. Menor privilégio e redação

**Nível:** Obrigatório.

**Regra:** Credencial por ambiente, fora do código e fora dos testes. Homologação não escreve na produção. O cheat sheet de gestão de segredos, consultado em 14 de outubro de 2026, trata menor privilégio, rotação e redução de acesso humano permanente ao valor. A rotação concreta do R2 e da AWS continua pendente de provisionamento; o requisito de poder revogar fica. Não há procedimento de rotação no repositório.

Log estruturado, sem corpo completo por padrão. Não registrar token, cookie, senha, cabeçalho de autorização nem credencial. O cheat sheet de logging, consultado na mesma data, separa log operacional de trilha de auditoria e trata dado vindo de outra zona de confiança como não confiável. Resposta pública não inclui stack trace interno. A causa fica no log restrito.

**Divergência registrada:** o coletor atual escreve uma frase fixa com `console.log`. Não há segredo nessa frase. O logger futuro não copia o corpo da origem para o mesmo canal.

**Verificação:** revisão de exemplo de log e busca por segredo no diff. Ferramenta de detecção de segredo no CI está planejada, não configurada.

## Cache e snapshots

### SEC-007. Integridade da publicação

**Nível:** Obrigatório no publicador, quando existir.

**Regra:** Não publicar erro como resultado válido. Chave distingue ambiente e versão. Não guardar resposta privada em cache público. Manifesto é o ponteiro mutável; arquivo de versão não é reescrito com outro conteúdo. Guardar identificador da versão e o horário de publicação para rastrear o que está no ar. Credencial e caminho de publicação não aparecem no JSON público. A folga do cache está em [performance.md](../padroes/performance.md).

**Verificação:** teste de falha do manifesto e, na homologação, pedido aos dois ambientes. Ver a matriz de [README.md](README.md).

## Dependências e CI

### SEC-008. Dependência justificada e workflow contido

**Nível:** Obrigatório para dependência nova. Condicional para o workflow, que não existe.

**Regra:** Dependência nova tem uso no código desta tarefa. Versão fica reproduzível pelo lockfile, como as versões atuais já estão. Avaliar vulnerabilidade não é atualizar tudo de uma vez. Script de instalação de pacote entra na revisão. Workflow futuro usa permissão mínima. Segredo de produção não fica disponível para contribuição não confiável. Action, quando adotada, é referência imutável, por commit ou hash, não só por tag móvel. A página que recomendaria o pin não foi a fonte desta frase: é regra do projeto, alinhada ao menor privilégio do cheat sheet de segredos. Verificação de segredo e de dependência são controles complementares, não prova de ausência de vulnerabilidade.

**Verificação:** leitura do diff de `package.json` e, no futuro, do workflow. Scanner sem achado não fecha o assunto.

## Referências

Consultadas em 14 de outubro de 2026:

- OWASP ASVS, página do projeto: <https://owasp.org/www-project-application-security-verification-standard/>
- OWASP API Security, página do projeto: <https://owasp.org/API-Security/>
- Cheat Sheet Series, validação de entrada: <https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html>
- Cheat Sheet Series, SSRF: <https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html>
- Cheat Sheet Series, XSS: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>
- Cheat Sheet Series, SQL injection: <https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html>
- Cheat Sheet Series, Node.js: <https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html>
- Cheat Sheet Series, prototype pollution: <https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html>
- Cheat Sheet Series, logging: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>
- Cheat Sheet Series, gestão de segredos: <https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html>
- Node.js, não bloquear o event loop: <https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop>

Não consultada nesta data: Web Security Testing Guide, <https://owasp.org/www-project-web-security-testing-guide/>.

[Voltar à segurança](README.md)
