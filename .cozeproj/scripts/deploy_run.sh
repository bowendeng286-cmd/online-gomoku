#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

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

start_service() {
    echo "Starting gomoku-game service on port ${DEPLOY_RUN_PORT}..."
    cd "$WORK_DIR/gomoku-game"
    
    # Initialize database first
    echo "Initializing database..."
    timeout 30 npm run start &
    INIT_PID=$!
    
    # Wait a bit for initialization
    sleep 5
    
    # Check if initialization is still running, if so kill it and start normally
    if kill -0 $INIT_PID 2>/dev/null; then
        echo "Stopping initialization process..."
        kill $INIT_PID 2>/dev/null || true
        wait $INIT_PID 2>/dev/null || true
    fi
    
    # Start the production server
    echo "Starting production server..."
    exec npm run start -- --port ${DEPLOY_RUN_PORT}
}

echo "Clearing port ${DEPLOY_RUN_PORT} before start."
kill_port_if_listening
echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service