set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WORK_DIR/gomoku-game"

kill_port_if_listening() {
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
      echo "Port ${DEPLOY_RUN_PORT} is free."
      return
    fi
    echo "Port ${DEPLOY_RUN_PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${DEPLOY_RUN_PORT} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${DEPLOY_RUN_PORT} cleared."
    fi
}

start_game_server() {
    echo "Starting game server on port 8080..."
    node -r ts-node/register src/server/index.ts &
    GAME_SERVER_PID=$!
    echo "Game server started with PID: ${GAME_SERVER_PID}"
}

start_web_server() {
    echo "Starting web server on port ${DEPLOY_RUN_PORT}..."
    npm run start -- --port ${DEPLOY_RUN_PORT} &
    WEB_SERVER_PID=$!
    echo "Web server started with PID: ${WEB_SERVER_PID}"
}

cleanup() {
    echo "Cleaning up..."
    if [[ -n "${GAME_SERVER_PID:-}" ]]; then
        kill ${GAME_SERVER_PID} 2>/dev/null || true
        echo "Game server stopped"
    fi
    if [[ -n "${WEB_SERVER_PID:-}" ]]; then
        kill ${WEB_SERVER_PID} 2>/dev/null || true
        echo "Web server stopped"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Clearing port ${DEPLOY_RUN_PORT} before start."
kill_port_if_listening

echo "Starting servers for gomoku game..."
start_game_server
sleep 2
start_web_server

echo "Both servers started successfully!"
echo "Game server: ws://localhost:8080"
echo "Web server: http://localhost:${DEPLOY_RUN_PORT}"

# Wait for both processes
wait