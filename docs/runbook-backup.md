# Runbook — Backup & Restore do Banco

Backup diário do Postgres do FlowCRM com upload off-site cifrado pro Google Drive.

## Arquitetura

```
[VPS Hostinger]                              [Google Drive]
    cron 03:00 BRT                          marlonreistreinovip@gmail.com
        │                                   (2TB, 2FA ativado)
        ▼
    backup-db.sh
        │
        ├─ docker exec postgres → pg_dump
        ├─ gzip -9
        ├─ gpg --symmetric AES256 (passphrase do env)
        └─ rclone copy → gdrive:flowcrm-backups/
                            │
                            └─ retention 90 dias (auto)
```

**RPO**: máximo 24h (backup diário). **RTO**: ~10min (download + decrypt + restore).

## Setup inicial (já feito; documentado pra reprodutibilidade)

### Pré-requisitos na VPS (Ubuntu 24.04)
```bash
apt update && apt install -y rclone postgresql-client gpg cron
systemctl enable --now cron
```

### Configuração do rclone com Google Drive
```bash
rclone config
# n) New remote
# name: gdrive
# Storage: drive
# scope: 1 (full access)
# Use auto config: n  ← importante (VPS é headless)
# config_token: <gerar no PC com `rclone authorize "drive" "<token>"`>
# Configure as Shared Drive: n
# Keep this remote: y
```

Verificar: `rclone lsd gdrive:` deve listar `flowcrm-backups`.

### Arquivo de env na VPS

`/etc/flowcrm-backup.env` (modo `600`, root-only):

```env
POSTGRES_CONTAINER_PATTERN=flowcrm_flowcrm-db
POSTGRES_USER=postgres
POSTGRES_DB=flowcrm
RCLONE_REMOTE=gdrive:flowcrm-backups
RETAIN_DAYS=90
FREE_SPACE_MIN_GB=2
GPG_PASSPHRASE=<passphrase-32-chars-do-gerenciador-de-senhas>
# HEALTHCHECK_URL=https://hc-ping.com/<uuid>  # opcional, ativar na Fase 3 Bloco B
```

```bash
chmod 600 /etc/flowcrm-backup.env
chown root:root /etc/flowcrm-backup.env
```

### Cron (root)

```bash
crontab -e
```

Adicionar:

```cron
# Backup FlowCRM — diário 03:00 BRT (06:00 UTC)
0 6 * * * set -a; . /etc/flowcrm-backup.env; set +a; /opt/flowcrm/backup-db.sh >> /var/log/flowcrm-backup.log 2>&1
```

### Cópia do script

O script vive em `backend/scripts/backup-db.sh` no repo. Copiar pra VPS:

```bash
mkdir -p /opt/flowcrm
cp /caminho/do/repo/backend/scripts/backup-db.sh /opt/flowcrm/
chmod +x /opt/flowcrm/backup-db.sh
```

> Quando o repo é atualizado, refazer o `cp`. Não usamos symlink pro repo porque CI/CD do EasyPanel pode mexer no diretório.

## Verificar que está funcionando

### Backup manual (smoke test)
```bash
set -a; . /etc/flowcrm-backup.env; set +a
/opt/flowcrm/backup-db.sh
```

Saída esperada (último log):
```
[YYYY-MM-DDTHH:MM:SSZ] backup completo: flowcrm_YYYYMMDD_HHMMSS.sql.gz.gpg (NN MB)
```

### Listar backups no Drive
```bash
rclone ls gdrive:flowcrm-backups/
```

### Tail dos logs do cron
```bash
tail -f /var/log/flowcrm-backup.log
```

## Restore (procedimento de emergência)

### 1. Identificar o backup desejado
```bash
rclone ls gdrive:flowcrm-backups/ | sort -k 2
# escolher arquivo (mais recente fica no final)
FILE="flowcrm_20260428_060000.sql.gz.gpg"
```

### 2. Download + decrypt
```bash
cd /tmp
rclone copy "gdrive:flowcrm-backups/$FILE" .

# Extrai passphrase pra arquivo (mais robusto que --passphrase, evita
# problemas com caracteres especiais e exposição em `ps`).
grep "GPG_PASSPHRASE=" /etc/flowcrm-backup.env | cut -d= -f2- > /tmp/pass.txt
chmod 600 /tmp/pass.txt

gpg --batch --yes --decrypt \
    --passphrase-file /tmp/pass.txt \
    --output "flowcrm.sql.gz" \
    "$FILE"
gunzip flowcrm.sql.gz
rm -f /tmp/pass.txt
# resultado: /tmp/flowcrm.sql
```

### 3. Restore num banco novo (recomendado: nunca direto em prod)

#### 3a. Criar banco temporário no container postgres
```bash
CONTAINER=$(docker ps --filter 'name=flowcrm_flowcrm-db' --format '{{.Names}}' | head -1)
docker exec -it "$CONTAINER" psql -U postgres -c "CREATE DATABASE flowcrm_restore;"
```

#### 3b. Carregar o dump
```bash
docker cp /tmp/flowcrm.sql "$CONTAINER:/tmp/flowcrm.sql"
docker exec -it "$CONTAINER" psql -U postgres -d flowcrm_restore -f /tmp/flowcrm.sql
```

#### 3c. Validar
```bash
docker exec -it "$CONTAINER" psql -U postgres -d flowcrm_restore -c "
  SELECT
    (SELECT COUNT(*) FROM users)       AS users,
    (SELECT COUNT(*) FROM workspaces)  AS workspaces,
    (SELECT COUNT(*) FROM leads)       AS leads,
    (SELECT COUNT(*) FROM contacts)    AS contacts;
"
```

#### 3d. Promover (só após validação)

**Pausar a aplicação** primeiro pra evitar writes durante o swap:
```bash
# EasyPanel → flowcrm-backend → Stop
# ou:
docker stop $(docker ps --filter 'name=flowcrm_flowcrm-backend' --format '{{.Names}}')
```

Renomear bancos:
```bash
docker exec -it "$CONTAINER" psql -U postgres -c "
  ALTER DATABASE flowcrm RENAME TO flowcrm_old_$(date +%Y%m%d);
  ALTER DATABASE flowcrm_restore RENAME TO flowcrm;
"
```

Subir backend:
```bash
# EasyPanel → flowcrm-backend → Start
```

Após 1-2 dias confirmando que está estável, dropar o `flowcrm_old_*`.

## Restore drill

**Backup que nunca foi restaurado é placebo.** Por isso temos drill em 2 camadas:

| Camada | Frequência | O que valida |
|---|---|---|
| **Automático** (`restore-drill.sh`) | diário 04:30 UTC | que o backup é decifrável, restaurável e tem contagens consistentes |
| **Manual** (humano) | semestral | inspeção visual de dados (JSONB, blobs, edge cases) que SQL não pega |

### Drill log

| Data | Backup testado | Tipo | Resultado |
|---|---|---|---|
| 2026-04-28 | flowcrm_20260428_031910.sql.gz.gpg | manual | ✅ users=7, workspaces=6, leads=55, contacts=35 |

> Drills automáticos diários NÃO entram nessa tabela (o cron loga em `/var/log/flowcrm-drill.log` e pinga healthcheck). Só entradas manuais.

### Drill automático (setup)

Script `backend/scripts/restore-drill.sh` no repo. Copiar pra VPS:
```bash
cp /caminho/do/repo/backend/scripts/restore-drill.sh /opt/flowcrm/
chmod +x /opt/flowcrm/restore-drill.sh
touch /var/log/flowcrm-drill.log && chmod 640 /var/log/flowcrm-drill.log
```

Cron entry (root):
```cron
# Drill automático — diário 04:30 UTC (1h30min após o backup das 06:00 UTC =03:00 BRT;
# sim, o drill roda ANTES do backup do dia seguinte por design — testa o backup de hoje)
30 4 * * * set -a; . /etc/flowcrm-backup.env; set +a; /opt/flowcrm/restore-drill.sh >> /var/log/flowcrm-drill.log 2>&1
```

O que o drill valida:
- Backup mais recente tem ≤26h (cron de backup não falhou silenciosamente)
- Decifragem com a passphrase atual funciona
- gzip íntegro, dump SQL ≥100 linhas
- Restore em banco temporário (`flowcrm_drill_test`) funciona sem erro
- Tabelas críticas existem: `users`, `workspaces`, `leads`, `contacts`, `pipelines`, `stages`
- Contagens do backup ≤ contagens de prod (sanity temporal)

Falha → exit code não-zero + log + healthcheck `/fail` ping (se configurado).

### Drill manual (semestral)

Mesmo procedimento da seção "Restore (procedimento de emergência)" acima, **mas restaurando em banco separado** (`flowcrm_manual_drill`), e com inspeção visual:

```sql
-- Sample de dados pra olhar
SELECT id, name, email, role FROM users LIMIT 3;
SELECT id, name, "subscriptionStatus", "trialEndsAt" FROM workspaces;
SELECT id, title, value, status FROM leads ORDER BY "createdAt" DESC LIMIT 5;

-- JSONBs e campos complexos
SELECT id, "widgetConfig" FROM workspaces WHERE "widgetConfig" IS NOT NULL LIMIT 1;
SELECT id, name, "additionalAccessUserIds" FROM leads WHERE jsonb_array_length(COALESCE("additionalAccessUserIds"::jsonb, '[]'::jsonb)) > 0 LIMIT 3;
```

Atualizar a tabela "Drill log" acima com a nova entry após cada drill manual.

### Procedimento de drill (manual ad-hoc)

```bash
# Em qualquer máquina com docker + rclone + gpg + DATABASE_URL apontando pra um pg de teste:
rclone copy "gdrive:flowcrm-backups/$(rclone ls gdrive:flowcrm-backups/ | sort -k 2 | tail -1 | awk '{print $2}')" .
# decrypt → restore → validar counts (passos 2 e 3 acima)
```

Backup que nunca foi restaurado é placebo — drill obrigatório.

## Rotação de credenciais

### GPG passphrase
1. Gerar nova: `openssl rand -base64 32`
2. Salvar no gerenciador de senhas (sobrescrever a antiga em label, manter histórico).
3. Editar `/etc/flowcrm-backup.env` com a nova.
4. **Atenção**: backups antigos continuam cifrados com a passphrase **antiga** — manter ambas no gerenciador até a retention drenar (90 dias).

### Token rclone (Google Drive)
1. Revogar acesso atual: https://myaccount.google.com/permissions → "rclone" → Remove access.
2. Reconfigurar: `rclone config reconnect gdrive:` (mesmo fluxo do setup inicial).

## Limites e alertas

| Limite | Valor | Quando dispara |
|---|---|---|
| Drive total | 2 TB (Google One) | nunca alcança no horizonte previsível |
| Retention | 90 dias | ~5 MB/dia × 90 = ~450 MB |
| Free space mínimo | 2 GB | aborta upload se Drive abaixo disso |
| Healthcheck (futuro) | a definir | alerta se cron não rodar em 26h |

## Troubleshooting

### `Nenhum container encontrado com pattern flowcrm_flowcrm-db`
Verificar se o EasyPanel mudou nome do projeto:
```bash
docker ps --format '{{.Names}}' | grep -i db
```
Atualizar `POSTGRES_CONTAINER_PATTERN` no `/etc/flowcrm-backup.env`.

### `pg_dump | gzip | gpg pipeline falhou`
Causa comum: senha do postgres mudou ou volume corrompido. Testar manualmente:
```bash
docker exec -it $CONTAINER pg_dump -U postgres flowcrm | head -20
```

### `rclone upload falhou`
Causa comum: token expirado. Reconectar:
```bash
rclone config reconnect gdrive:
```

### Drive cheio
Resposta de emergência:
```bash
rclone delete gdrive:flowcrm-backups/ --min-age 30d --include 'flowcrm_*.sql.gz.gpg'
```
Reduz retention temporariamente. Depois ajustar `RETAIN_DAYS` no env.

## Inventário de credenciais

| Item | Onde está | Quem tem acesso |
|---|---|---|
| GPG passphrase | Gerenciador de senhas pessoal | Leonardo Groff |
| Conta Google do Drive | `marlonreistreinovip@gmail.com` (2FA) | Leonardo Groff |
| Postgres password (prod) | EasyPanel → backend → env `DATABASE_URL` | Leonardo Groff |
| Token rclone | `~/.config/rclone/rclone.conf` na VPS | root da VPS |
