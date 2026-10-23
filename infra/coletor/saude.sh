#!/usr/bin/env bash
set -euo pipefail

readonly MANIFEST_URL="${MANIFEST_URL:-https://dados.eleicaobrasil2026.com.br/oficial-presidente-br-2t/manifest.json}"
readonly MAX_AGE_SECONDS=180
readonly PUBLICATIONS_DIR="${PUBLICATIONS_DIR:-/var/lib/coletor/publications}"

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

now=$(date +%s)
stale_channels=()
for manifest_file in "$PUBLICATIONS_DIR"/oficial-*/manifest.json; do
  channel_checked_at=$(jq -r '.checkedAt // empty' "$manifest_file") || continue
  [[ -n "$channel_checked_at" ]] || continue
  if ((now - $(date -d "$channel_checked_at" +%s) > MAX_AGE_SECONDS)); then
    stale_channels+=("$(basename "$(dirname "$manifest_file")")")
  fi
done
if ((${#stale_channels[@]})); then
  report_failure "canais parados há mais de ${MAX_AGE_SECONDS}s: ${stale_channels[*]}"
fi

curl -fsS --max-time 10 --retry 3 -o /dev/null --data-raw "dados atualizados há ${age}s; todos os canais em dia" "$HEALTHCHECK_URL"
echo "ok: dados atualizados há ${age}s; todos os canais em dia"
