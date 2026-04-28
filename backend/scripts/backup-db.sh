#!/usr/bin/env sh
# Backup do Postgres do FlowCRM. Saída local + opcional upload S3.
#
# Variáveis (todas via env):
#   DATABASE_URL       (obrigatório)  ex: postgresql://user:pass@host:5432/db
#   BACKUP_DIR         (default ./backups)
#   BACKUP_RETAIN_DAYS (default 7)
#   AWS_S3_BUCKET      (opcional — habilita upload)
#   AWS_S3_PREFIX      (default flowcrm/backups)
#
# Requisitos: pg_dump, gzip, (opcional) aws-cli
set -eu

DATABASE_URL="${DATABASE_URL:?DATABASE_URL é obrigatório}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"
TS="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/flowcrm_${TS}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] dumping → ${FILE}"
pg_dump --no-owner --no-acl "$DATABASE_URL" | gzip -9 > "$FILE"
SIZE=$(wc -c < "$FILE")
echo "[backup] dump done (${SIZE} bytes)"

# Verifica integridade do gzip antes de promover.
gzip -t "$FILE"

if [ -n "${AWS_S3_BUCKET:-}" ]; then
  PREFIX="${AWS_S3_PREFIX:-flowcrm/backups}"
  echo "[backup] uploading → s3://${AWS_S3_BUCKET}/${PREFIX}/$(basename "$FILE")"
  aws s3 cp "$FILE" "s3://${AWS_S3_BUCKET}/${PREFIX}/" --no-progress
fi

# Limpa backups locais antigos.
find "$BACKUP_DIR" -name "flowcrm_*.sql.gz" -type f -mtime +"$RETAIN_DAYS" -delete 2>/dev/null || true

echo "[backup] complete"
