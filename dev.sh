#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_LOG="$SCRIPT_DIR/.frontend.log"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# Carrega NVM
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Usa sudo para docker se o usuário não estiver no grupo docker ainda
DOCKER="docker"
if ! docker info &>/dev/null 2>&1; then
  DOCKER="sudo docker"
fi

stop() {
  echo "Parando serviços..."
  $DOCKER compose -f "$SCRIPT_DIR/docker-compose.dev.yml" down
  if [ -f "$FRONTEND_PID_FILE" ]; then
    kill "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null && echo "Frontend parado."
    rm -f "$FRONTEND_PID_FILE"
  fi
  exit 0
}

status() {
  echo ""
  echo "=== Docker ==="
  $DOCKER compose -f "$SCRIPT_DIR/docker-compose.dev.yml" ps
  echo ""
  echo "=== Frontend ==="
  if [ -f "$FRONTEND_PID_FILE" ] && kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
    echo "Rodando (PID $(cat "$FRONTEND_PID_FILE")) → http://localhost:5173"
  else
    echo "Parado"
  fi
}

case "${1:-start}" in
  stop)   stop ;;
  status) status; exit 0 ;;
esac

echo "Iniciando FlowCRM (dev)..."

# 1. Sobe backend + db + redis
$DOCKER compose -f "$SCRIPT_DIR/docker-compose.dev.yml" up -d

# 2. Aguarda backend ficar healthy
echo "Aguardando backend ficar pronto..."
for i in $(seq 1 30); do
  if $DOCKER inspect flowcrm-repo-backend-1 2>/dev/null | grep -q '"healthy"'; then
    break
  fi
  sleep 2
done

# 3. Sobe frontend em background como usuário atual (não root)
if [ -f "$FRONTEND_PID_FILE" ] && kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
  echo "Frontend já está rodando (PID $(cat "$FRONTEND_PID_FILE"))."
else
  cd "$SCRIPT_DIR/frontend"
  npm run dev -- --host > "$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  echo "Frontend iniciado (PID $!) → log em .frontend.log"
  cd "$SCRIPT_DIR"
fi

sleep 3
status
echo ""
echo "Pronto! Acesse http://localhost:5173"
echo "Para parar: ./dev.sh stop"
echo "Para ver logs do frontend: tail -f $FRONTEND_LOG"
