#!/usr/bin/env bash
# Backup do Postgres do FlowCRM com upload off-site cifrado pro Google Drive.
#
# Estratégia:
#   1. pg_dump dentro do container postgres (autenticação peer, sem senha em env)
#   2. gzip -9 + gpg --symmetric (AES-256, passphrase do env)
#   3. rclone copy → gdrive:flowcrm-backups/
#   4. Retention 90 dias no Drive
#   5. Healthcheck ping ao final (opt-in via HEALTHCHECK_URL)
#
# Variáveis (carregadas de /etc/flowcrm-backup.env via cron):
#   POSTGRES_CONTAINER_PATTERN (default: flowcrm_flowcrm-db)
#   POSTGRES_USER              (default: postgres)
#   POSTGRES_DB                (default: flowcrm)
#   GPG_PASSPHRASE             (obrigatório)
#   RCLONE_REMOTE              (default: gdrive:flowcrm-backups)
#   RETAIN_DAYS                (default: 90)
#   HEALTHCHECK_URL            (opcional — Healthchecks.io / UptimeRobot)
#   FREE_SPACE_MIN_GB          (default: 2 — aborta se Drive abaixo disso)
#
# Exit codes:
#   0  sucesso
#   1  erro genérico / config inválida
#   2  container postgres não encontrado
#   3  pg_dump falhou
#   4  upload falhou
#   5  Drive sem espaço suficiente
set -euo pipefail

# ---------- Config ----------
POSTGRES_CONTAINER_PATTERN="${POSTGRES_CONTAINER_PATTERN:-flowcrm_flowcrm-db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-flowcrm}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:flowcrm-backups}"
RETAIN_DAYS="${RETAIN_DAYS:-90}"
FREE_SPACE_MIN_GB="${FREE_SPACE_MIN_GB:-2}"
TS="$(date -u +%Y%m%d_%H%M%S)"
TMPDIR="$(mktemp -d)"
LOCAL_FILE="${TMPDIR}/flowcrm_${TS}.sql.gz.gpg"
trap 'rm -rf "$TMPDIR"' EXIT

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { log "ERROR: $*"; [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS --retry 2 --max-time 10 "${HEALTHCHECK_URL}/fail" -d "$*" >/dev/null 2>&1 || true; exit "${2:-1}"; }

# ---------- Validate config ----------
[ -z "${GPG_PASSPHRASE:-}" ] && fail "GPG_PASSPHRASE não definida (cheque /etc/flowcrm-backup.env)" 1

# ---------- Locate postgres container ----------
log "procurando container postgres (pattern=${POSTGRES_CONTAINER_PATTERN})"
CONTAINER="$(docker ps --filter "name=${POSTGRES_CONTAINER_PATTERN}" --format '{{.Names}}' | head -n1)"
[ -z "$CONTAINER" ] && fail "Nenhum container encontrado com pattern ${POSTGRES_CONTAINER_PATTERN}" 2
log "container: ${CONTAINER}"

# ---------- Pre-flight: free space on Drive ----------
log "verificando espaço livre em ${RCLONE_REMOTE}"
FREE_BYTES="$(rclone about "${RCLONE_REMOTE%%:*}:" --json 2>/dev/null | grep -o '"free":[0-9]*' | head -1 | cut -d: -f2 || true)"
if [ -n "${FREE_BYTES:-}" ] && [ "${FREE_BYTES}" -gt 0 ] 2>/dev/null; then
  FREE_GB=$((FREE_BYTES / 1024 / 1024 / 1024))
  log "espaço livre: ${FREE_GB} GB"
  [ "$FREE_GB" -lt "$FREE_SPACE_MIN_GB" ] && fail "Drive com apenas ${FREE_GB} GB livres (mínimo ${FREE_SPACE_MIN_GB} GB)" 5
else
  log "espaço livre: indisponível (rclone about não retornou free — backend não suporta ou Drive pessoal sem quota explícita; prosseguindo)"
fi

# ---------- Dump + compress + encrypt ----------
# Passphrase via arquivo temporário (não via flag): evita exposição em `ps`,
# logs e quirks de interpolação shell com caracteres especiais.
PASSFILE="${TMPDIR}/passphrase"
umask 077
printf '%s' "$GPG_PASSPHRASE" > "$PASSFILE"

log "iniciando pg_dump → gzip → gpg (arquivo: ${LOCAL_FILE})"
docker exec "$CONTAINER" pg_dump --no-owner --no-acl -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --compress-algo none \
        --passphrase-file "$PASSFILE" --output "$LOCAL_FILE" \
  || fail "pg_dump | gzip | gpg pipeline falhou" 3

SIZE_BYTES=$(wc -c < "$LOCAL_FILE")
# Sanity check: arquivo cifrado de banco real precisa ser > 1KB.
# Banco vazio cifrado dá ~200B; qualquer schema básico > 1KB. Se vier abaixo
# disso, é falha silenciosa do pg_dump (auth, banco errado, etc).
[ "$SIZE_BYTES" -lt 1024 ] && fail "Arquivo cifrado tem apenas ${SIZE_BYTES} bytes — pg_dump provavelmente falhou silenciosamente" 3
SIZE_KB=$(( SIZE_BYTES / 1024 ))
log "arquivo cifrado: ${SIZE_KB} KB"

# ---------- Upload ----------
log "uploading → ${RCLONE_REMOTE}/"
rclone copy "$LOCAL_FILE" "$RCLONE_REMOTE/" --no-traverse \
  || fail "rclone upload falhou" 4

# ---------- Retention ----------
log "limpando backups com mais de ${RETAIN_DAYS} dias em ${RCLONE_REMOTE}"
rclone delete "$RCLONE_REMOTE/" --min-age "${RETAIN_DAYS}d" --include 'flowcrm_*.sql.gz.gpg' \
  || log "WARN: limpeza de retention falhou (não-fatal)"

# ---------- Healthcheck ----------
if [ -n "${HEALTHCHECK_URL:-}" ]; then
  curl -fsS --retry 2 --max-time 10 "$HEALTHCHECK_URL" >/dev/null 2>&1 || log "WARN: healthcheck ping falhou"
fi

log "backup completo: $(basename "$LOCAL_FILE") (${SIZE_KB} KB)"
