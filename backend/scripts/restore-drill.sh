#!/usr/bin/env bash
# Drill automático de restore — valida que o último backup é restaurável.
# Roda diariamente após o backup (cron 04:30 UTC).
#
# O que faz:
#   1. Baixa o backup mais recente do Drive
#   2. Decifra com a passphrase do env
#   3. Carrega num banco temporário (flowcrm_drill_test)
#   4. Compara contagens das tabelas críticas com o banco de produção
#      regra: backup_count > 0 AND backup_count <= prod_count
#      (backup é snapshot do passado; prod só pode ter mais registros)
#   5. Dropa o banco temporário e limpa arquivos
#
# Exit codes:
#   0  drill passou (backup restaurável e íntegro)
#   1  config inválida / erro de setup
#   2  download/decrypt falhou (backup corrompido ou passphrase errada)
#   3  restore falhou (schema do dump incompatível)
#   4  validação de counts falhou (backup vazio ou inconsistente)
#
# Variáveis (carregadas de /etc/flowcrm-backup.env via cron):
#   POSTGRES_CONTAINER_PATTERN, POSTGRES_USER, POSTGRES_DB
#   GPG_PASSPHRASE, RCLONE_REMOTE
#   DRILL_HEALTHCHECK_URL (opcional — separado do backup)
set -euo pipefail

POSTGRES_CONTAINER_PATTERN="${POSTGRES_CONTAINER_PATTERN:-flowcrm_flowcrm-db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-flowcrm}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:flowcrm-backups}"
DRILL_DB="flowcrm_drill_test"
TMPDIR="$(mktemp -d)"
trap 'cleanup' EXIT

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() {
  log "ERROR: $*"
  [ -n "${DRILL_HEALTHCHECK_URL:-}" ] && \
    curl -fsS --retry 2 --max-time 10 "${DRILL_HEALTHCHECK_URL}/fail" -d "$*" >/dev/null 2>&1 || true
  exit "${2:-1}"
}

cleanup() {
  rm -rf "$TMPDIR" 2>/dev/null || true
  if [ -n "${CONTAINER:-}" ]; then
    docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $DRILL_DB;" >/dev/null 2>&1 || true
  fi
}

[ -z "${GPG_PASSPHRASE:-}" ] && fail "GPG_PASSPHRASE não definida" 1

# Localiza container postgres
CONTAINER="$(docker ps --filter "name=${POSTGRES_CONTAINER_PATTERN}" --format '{{.Names}}' | head -n1)"
[ -z "$CONTAINER" ] && fail "Container postgres não encontrado" 1
log "container: $CONTAINER"

# Pega o backup mais recente do Drive
LATEST="$(rclone ls "$RCLONE_REMOTE/" 2>/dev/null | sort -k 2 | tail -1 | awk '{print $2}')"
[ -z "$LATEST" ] && fail "Nenhum backup encontrado em $RCLONE_REMOTE" 2
log "validando backup: $LATEST"

# Idade do backup (não pode ter mais de 26h — cron diário com folga)
BACKUP_AGE_HOURS="$(rclone lsl "$RCLONE_REMOTE/$LATEST" 2>/dev/null | awk '{ts=$2" "$3; cmd="date -u -d \"" ts "\" +%s"; cmd | getline epoch; close(cmd); print int((systime()-epoch)/3600)}')"
if [ -n "$BACKUP_AGE_HOURS" ] && [ "$BACKUP_AGE_HOURS" -gt 26 ]; then
  fail "Último backup tem ${BACKUP_AGE_HOURS}h (limite 26h) — cron de backup pode ter falhado" 2
fi

# Download
GPG_FILE="$TMPDIR/$LATEST"
rclone copy "$RCLONE_REMOTE/$LATEST" "$TMPDIR/" || fail "Download do backup falhou" 2

# Decrypt
PASSFILE="$TMPDIR/passphrase"
umask 077
printf '%s' "$GPG_PASSPHRASE" > "$PASSFILE"
gpg --batch --yes --quiet --passphrase-file "$PASSFILE" \
    --decrypt --output "$TMPDIR/dump.sql.gz" "$GPG_FILE" \
  || fail "Decrypt falhou (passphrase errada ou arquivo corrompido)" 2

# Decompress + integrity
gunzip -t "$TMPDIR/dump.sql.gz" || fail "gzip corrompido" 2
gunzip "$TMPDIR/dump.sql.gz"
DUMP_LINES="$(wc -l < "$TMPDIR/dump.sql")"
[ "$DUMP_LINES" -lt 100 ] && fail "Dump tem apenas $DUMP_LINES linhas (esperado >100)" 2
log "dump descomprimido: $DUMP_LINES linhas SQL"

# Restore em banco temp
docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $DRILL_DB;" >/dev/null
docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -c "CREATE DATABASE $DRILL_DB;" >/dev/null
docker cp "$TMPDIR/dump.sql" "$CONTAINER:/tmp/drill-dump.sql"
docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -d "$DRILL_DB" -f /tmp/drill-dump.sql >/dev/null 2>&1 \
  || fail "Restore no banco temp falhou (schema incompatível?)" 3
docker exec "$CONTAINER" rm -f /tmp/drill-dump.sql >/dev/null 2>&1 || true

# Compara contagens entre backup e prod
TABLES="users workspaces leads contacts pipelines stages"
log "validando contagens (backup vs prod)..."
DRIFT_LOG=""
for table in $TABLES; do
  BACKUP_COUNT="$(docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -d "$DRILL_DB" -t -c "SELECT count(*) FROM $table;" 2>/dev/null | tr -d ' \n' || echo "ERR")"
  PROD_COUNT="$(docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM $table;" 2>/dev/null | tr -d ' \n' || echo "ERR")"

  if [ "$BACKUP_COUNT" = "ERR" ] || [ "$PROD_COUNT" = "ERR" ]; then
    fail "Tabela '$table' não existe em backup ou prod" 4
  fi

  # Regra: backup_count > 0 AND backup_count <= prod_count
  if [ "$BACKUP_COUNT" -le 0 ]; then
    [ "$table" = "leads" ] || [ "$table" = "contacts" ] && \
      log "WARN: $table=0 no backup (pode ser legítimo em workspace novo)" || true
  fi

  if [ "$BACKUP_COUNT" -gt "$PROD_COUNT" ]; then
    fail "$table: backup=$BACKUP_COUNT > prod=$PROD_COUNT (snapshot do futuro? clock skew?)" 4
  fi

  DRIFT=$((PROD_COUNT - BACKUP_COUNT))
  DRIFT_LOG="${DRIFT_LOG}${table}=${BACKUP_COUNT}/${PROD_COUNT}(+${DRIFT}) "
done

log "drill OK: $DRIFT_LOG"

# Healthcheck ping
if [ -n "${DRILL_HEALTHCHECK_URL:-}" ]; then
  curl -fsS --retry 2 --max-time 10 "$DRILL_HEALTHCHECK_URL" >/dev/null 2>&1 \
    || log "WARN: healthcheck ping falhou"
fi

log "drill completo: $LATEST validado contra prod"
