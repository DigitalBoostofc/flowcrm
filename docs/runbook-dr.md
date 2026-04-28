# Runbook — Disaster Recovery (DR)

Procedimento pra reerguer o FlowCRM do zero quando a VPS atual morrer (corrupção, deletada por engano, suspensão, incidente regional Hostinger).

**RTO-alvo**: 2h até o app de volta no ar com último backup restaurado.
**RPO**: até 24h (último backup diário do Drive).

## Pré-requisitos antes do desastre

Mantenha **off-VPS**, num gerenciador de senhas + email principal:

- [ ] Acesso à conta Hostinger (login + 2FA codes)
- [ ] Acesso ao EasyPanel (mesmo login Hostinger)
- [ ] Senha root da VPS atual (ou chave SSH)
- [ ] **Passphrase GPG** dos backups (FlowCRM backup GPG passphrase)
- [ ] Acesso à conta Google `marlonreistreinovip@gmail.com` (Drive dos backups + 2FA)
- [ ] Acesso ao GitHub (org `DigitalBoostofc`, repo `flowcrm`)
- [ ] Acesso ao registro do domínio `appexcrm.com` (provedor + 2FA)
- [ ] Acesso ao Cloudflare (DNS + cert)
- [ ] Sentry DSN salvo (ou só re-criar projeto)
- [ ] DSN do Stripe / chaves de produção (se aplicável)

Sem esses, o RTO de 2h fica fictício.

## Cenário 1 — VPS perdida, infraestrutura nova

### Fase 1 — Provisionar (15min)

1. **Hostinger** → criar VPS nova (mesmo plano: 95GB disco, Ubuntu 24.04 LTS)
2. Anotar IP público da nova VPS
3. SSH como root (`ssh root@<novo-ip>`)
4. `apt update && apt upgrade -y`
5. Instalar Docker conforme docs.docker.com (one-liner Ubuntu)
6. Instalar EasyPanel:
   ```bash
   curl -sSL https://get.easypanel.io | sh
   ```

### Fase 2 — Restaurar EasyPanel (15min)

EasyPanel **não tem export/import nativo de projetos**. Reconfigure manualmente seguindo o `docs/runbook-easypanel.md` *(criar se não existir — TODO Fase 3 follow-up)*.

Resumo do que precisa estar lá:
- Projeto `flowcrm`
- Serviço `flowcrm-db` (postgres:17, volume persistente)
- Serviço `flowcrm-redis` (redis:7)
- Serviço `flowcrm-backend` (Dockerfile do repo, env vars completas — copiar do gerenciador de senhas)
- Serviço `flowcrm-frontend` (Dockerfile do repo)
- Domínio `app.appexcrm.com` apontando pro frontend, `/api/*` rewrite pro backend

Subir os 4 serviços. Backend vai falhar no boot (banco vazio).

### Fase 3 — Restaurar banco do último backup (20min)

Na VPS nova:

```bash
# Pré-requisitos
apt install -y rclone postgresql-client gpg

# Configurar rclone (mesmo fluxo do runbook-backup.md)
rclone config
# new remote → drive → scope 1 → use auto config NO → autorizar com marlonreistreinovip@gmail.com → Keep
```

Baixar último backup:

```bash
cd /tmp
LATEST=$(rclone ls gdrive:flowcrm-backups/ | sort -k 2 | tail -1 | awk '{print $2}')
rclone copy "gdrive:flowcrm-backups/$LATEST" .
echo "<COLE-A-PASSPHRASE-DO-GERENCIADOR-DE-SENHAS>" > /tmp/pass.txt
chmod 600 /tmp/pass.txt
gpg --batch --yes --passphrase-file /tmp/pass.txt --decrypt --output /tmp/flowcrm.sql.gz "$LATEST"
gunzip /tmp/flowcrm.sql.gz
rm /tmp/pass.txt
```

Restaurar no postgres:

```bash
CONTAINER=$(docker ps --filter 'name=flowcrm_flowcrm-db' --format '{{.Names}}' | head -1)
docker cp /tmp/flowcrm.sql "$CONTAINER:/tmp/flowcrm.sql"
docker exec "$CONTAINER" psql -U postgres -d flowcrm -f /tmp/flowcrm.sql
docker exec "$CONTAINER" rm /tmp/flowcrm.sql
```

Validar:

```bash
docker exec "$CONTAINER" psql -U postgres -d flowcrm -c "SELECT count(*) AS users FROM users; SELECT count(*) AS workspaces FROM workspaces;"
```

### Fase 4 — Reabilitar backups e monitoramento (15min)

```bash
# Recriar /etc/flowcrm-backup.env (do gerenciador de senhas + ping URLs do Healthchecks)
nano /etc/flowcrm-backup.env
chmod 600 /etc/flowcrm-backup.env

# Baixar scripts do repo
mkdir -p /opt/flowcrm
curl -fsSL https://raw.githubusercontent.com/DigitalBoostofc/flowcrm/master/backend/scripts/backup-db.sh -o /opt/flowcrm/backup-db.sh
curl -fsSL https://raw.githubusercontent.com/DigitalBoostofc/flowcrm/master/backend/scripts/restore-drill.sh -o /opt/flowcrm/restore-drill.sh
chmod +x /opt/flowcrm/*.sh
touch /var/log/flowcrm-{backup,drill}.log
chmod 640 /var/log/flowcrm-{backup,drill}.log

# Recriar cron
crontab -e
# Adicionar:
# 0 6 * * * set -a; . /etc/flowcrm-backup.env; set +a; /opt/flowcrm/backup-db.sh >> /var/log/flowcrm-backup.log 2>&1
# 30 4 * * * set -a; . /etc/flowcrm-backup.env; set +a; /opt/flowcrm/restore-drill.sh >> /var/log/flowcrm-drill.log 2>&1

# Smoke test imediato
set -a && . /etc/flowcrm-backup.env && set +a && /opt/flowcrm/backup-db.sh
```

### Fase 5 — Apontar DNS pra nova VPS (5min)

1. Cloudflare → DNS → editar A record de `app.appexcrm.com` pro novo IP
2. TTL: pode deixar baixo (1min) durante o cutover, depois normalizar
3. Confirmar que `app.appexcrm.com/api/health/live` responde 200

### Fase 6 — Verificações finais (10min)

- [ ] `https://app.appexcrm.com` carrega o frontend
- [ ] Login funciona
- [ ] UptimeRobot voltou a marcar verde (espera 1 ciclo de 5min)
- [ ] Healthchecks: rodar smoke do backup manualmente, confirma ping verde
- [ ] Sentry: confirmar que `SENTRY_DSN` está no env do backend e events estão chegando

**Total estimado: 80min**. Os 40min restantes do RTO são folga pra problemas inesperados.

## Cenário 2 — VPS viva, mas banco corrompido

Mais leve: pula Fase 1, 2, 5, 6. Só:

1. Pausar backend no EasyPanel
2. Renomear banco atual: `ALTER DATABASE flowcrm RENAME TO flowcrm_corrompido_$(date +%Y%m%d);`
3. Criar banco novo: `CREATE DATABASE flowcrm;`
4. Aplicar Fase 3 (restore do dump)
5. Subir backend
6. Validar no frontend

**Total estimado: 30min**.

## Cenário 3 — Conta Google do Drive perdida

Cenário catastrófico secundário. Sem backups off-site → perde até 24h.

Mitigação preventiva:

1. **Email de recuperação** da conta `marlonreistreinovip@gmail.com` apontando pra `consultoriadigitalboost@gmail.com`
2. **Códigos de backup do 2FA** salvos no gerenciador de senhas
3. Em horizonte 6+ meses (~10 clientes pagantes), migrar pra Backblaze B2 (object lock impede deleção mesmo com credenciais comprometidas)

## Drill de DR

**Recomendação**: rodar drill de DR completo 1x por ano em ambiente isolado (Hostinger trial / VPS de R$5/mês temporária). Cronometra o RTO real, atualiza este runbook.

| Data | Cenário | RTO real | Ajustes feitos |
|---|---|---|---|
| _(nunca executado — agendar primeiro drill antes de fim de 2026)_ | | | |

## Inventário de credenciais (resumo)

| Item | Onde | Quem |
|---|---|---|
| Senha root VPS | gerenciador de senhas | Leonardo Groff |
| Passphrase GPG | gerenciador de senhas | Leonardo Groff |
| 2FA Hostinger | app autenticador + códigos backup no gerenciador | Leonardo Groff |
| 2FA `marlonreistreinovip@gmail.com` | app autenticador + códigos backup no gerenciador | Leonardo Groff |
| Sentry DSN | EasyPanel env + projeto Sentry | Leonardo Groff |
| Healthchecks ping URLs | `/etc/flowcrm-backup.env` na VPS + dashboard Healthchecks | Leonardo Groff |

> Toda vez que adicionar/rotacionar credencial nova, atualizar essa tabela.
