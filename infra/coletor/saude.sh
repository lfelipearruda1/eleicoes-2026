#!/usr/bin/env bash
set -euo pipefail

readonly MANIFEST_URL="${MANIFEST_URL:-https://dados.eleicaobrasil2026.com.br/oficial-presidente-br-2t/manifest.json}"
readonly MAX_AGE_SECONDS=180

report_failure() {
  curl -fsS --max-time 10 --retry 3 -o /dev/null --data-raw "$1" "${HEALTHCHECK_URL}/fail"
  echo "falha: $1" >&2
  exit 1
}

manifest=$(curl -fsS --max-time 15 "$MANIFEST_URL") ||
  report_failure "manifesto de produção inacessível em ${MANIFEST_URL}"
checked_at=$(jq -r '.checkedAt // .current.publishedAt' <<<"$manifest") ||
  report_failure "manifesto de produção ilegível"
age=$(($(date +%s) - $(date -d "$checked_at" +%s)))

if ((age > MAX_AGE_SECONDS)); then
  report_failure "dados de produção sem atualização há ${age}s (última verificação ${checked_at})"
fi

curl -fsS --max-time 10 --retry 3 -o /dev/null --data-raw "dados atualizados há ${age}s" "$HEALTHCHECK_URL"
echo "ok: dados atualizados há ${age}s"
