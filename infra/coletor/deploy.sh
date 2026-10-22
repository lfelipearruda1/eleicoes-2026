#!/usr/bin/env bash
set -euo pipefail

readonly INSTALL_DIR=/opt/coletor
readonly BUNDLE="$INSTALL_DIR/collector.mjs"
readonly PREVIOUS_BUNDLE="$INSTALL_DIR/collector.previous.mjs"
readonly VERSION_FILE="$INSTALL_DIR/VERSION"
readonly SERVICE=coletor-watch.service
readonly MAX_BUNDLE_BYTES=20000000
readonly CYCLE_TIMEOUT_SECONDS=180

read -r action commit extra <<<"${SSH_ORIGINAL_COMMAND:-}"

fail() {
  echo "erro: $*" >&2
  exit 1
}

report_status() {
  echo "versao=$(cat "$VERSION_FILE" 2>/dev/null || echo desconhecida)"
  echo "servico=$(systemctl is-active "$SERVICE" || true)"
  journalctl -u "$SERVICE" -o cat --no-pager -n 200 | grep '"event":"cycle_end"' | tail -n 1 || true
}

wait_for_completed_cycle() {
  local since=$1
  local deadline=$((SECONDS + CYCLE_TIMEOUT_SECONDS))
  while ((SECONDS < deadline)); do
    if ! systemctl is-active --quiet "$SERVICE"; then
      sleep 2
      continue
    fi
    if journalctl -u "$SERVICE" -o cat --no-pager --since "$since" |
      grep '"event":"cycle_end"' | grep -q '"status":"completed"'; then
      return 0
    fi
    sleep 3
  done
  return 1
}

restart_and_wait() {
  systemctl restart "$SERVICE"
  wait_for_completed_cycle "$(date '+%Y-%m-%d %H:%M:%S')"
}

case "$action" in
  status)
    report_status
    exit 0
    ;;
  deploy) ;;
  *) fail "comando não permitido" ;;
esac

[[ -z "${extra:-}" ]] || fail "argumentos a mais"
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || fail "commit inválido"

incoming=$(mktemp "$INSTALL_DIR/.incoming-XXXXXX.mjs")
trap 'rm -f "$incoming"' EXIT
head -c "$((MAX_BUNDLE_BYTES + 1))" >"$incoming"
size=$(stat -c %s "$incoming")
((size > 0 && size <= MAX_BUNDLE_BYTES)) || fail "pacote vazio ou grande demais ($size bytes)"
chmod 644 "$incoming"
runuser -u coletor -- /usr/local/bin/node "$incoming" --help | head -n 1 | grep -q '^Uso: collector' ||
  fail "pacote não executa"

previous_version=$(cat "$VERSION_FILE" 2>/dev/null || echo desconhecida)
cp -p "$BUNDLE" "$PREVIOUS_BUNDLE"
mv "$incoming" "$BUNDLE"
echo "$commit" >"$VERSION_FILE"
echo "instalado $commit (anterior: $previous_version); aguardando um ciclo completo"

if restart_and_wait; then
  echo "ok: ciclo completo com $commit"
  report_status
  exit 0
fi

echo "falhou: nenhum ciclo completo em ${CYCLE_TIMEOUT_SECONDS}s; voltando para $previous_version" >&2
journalctl -u "$SERVICE" -o cat --no-pager -n 20 >&2 || true
cp -p "$PREVIOUS_BUNDLE" "$BUNDLE"
echo "$previous_version" >"$VERSION_FILE"
if restart_and_wait; then
  echo "versão anterior restaurada e completando ciclos" >&2
else
  echo "ATENÇÃO: a versão anterior também não completou ciclo" >&2
fi
report_status >&2
exit 1
