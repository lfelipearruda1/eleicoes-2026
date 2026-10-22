#!/usr/bin/env bash
set -euo pipefail

readonly DESTINATION="r2:${R2_BUCKET}"
readonly JSON_TYPE='Content-Type: application/json; charset=utf-8'
readonly SNAPSHOT_CACHE='Cache-Control: public, max-age=31536000, immutable'
readonly MANIFEST_CACHE='Cache-Control: public, max-age=10'
readonly RECENT_SNAPSHOTS_AGE=3h
readonly PAUSE_SECONDS=10

upload_snapshots() {
  rclone copy "$PUBLICATIONS_DIR" "$DESTINATION" --no-traverse -q \
    --include '/*/snapshots/*.json' \
    --header-upload "$JSON_TYPE" --header-upload "$SNAPSHOT_CACHE" "$@"
}

upload_manifests() {
  rclone copy "$PUBLICATIONS_DIR" "$DESTINATION" --no-traverse -q \
    --include '/*/manifest.json' \
    --header-upload "$JSON_TYPE" --header-upload "$MANIFEST_CACHE"
}

mkdir -p "$PUBLICATIONS_DIR" 2>/dev/null || test -d "$PUBLICATIONS_DIR"
upload_snapshots
upload_manifests
echo "sync inicial concluído em ${R2_BUCKET}"

while true; do
  sleep "$PAUSE_SECONDS"
  if upload_snapshots --max-age "$RECENT_SNAPSHOTS_AGE"; then
    upload_manifests || echo "falha ao enviar manifestos" >&2
  else
    echo "falha ao enviar snapshots; manifestos mantidos" >&2
  fi
done
