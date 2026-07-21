#!/usr/bin/env bash
set -euo pipefail
launcher_dir="$(cd "$(dirname "$0")" && pwd)"
project_dir="$launcher_dir"
if [[ "${NODE_ENV:-}" == test && -n "${RUNTIME_PROJECT_SOURCE:-}" && -d "${RUNTIME_PROJECT_SOURCE}" ]]; then
  project_dir="$(cd "$RUNTIME_PROJECT_SOURCE" && pwd)"
fi
cd "$project_dir"
env_file="$launcher_dir/.env"
[[ -f "$env_file" ]] || { echo "Missing .env; copy .env.example and configure it." >&2; exit 1; }
[[ -d backend/node_modules && -d frontend/node_modules ]] || { echo "Dependencies missing; run scripts/bootstrap.sh." >&2; exit 1; }
set -a; . "$env_file"; set +a
if [[ "${NODE_ENV:-}" == test ]]; then
  export CLINICAL_ID_HMAC_SECRET="${CLINICAL_ID_HMAC_SECRET:-runtime-clinical-identifier-hmac-secret}"
fi
export CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:${FRONTEND_PORT:-3000}}"
export REACT_APP_API_URL="${REACT_APP_API_URL:-http://127.0.0.1:${BACKEND_PORT:-4000}/api}"
backend_pid=''; frontend_pid=''
cleanup(){ [[ -n "$backend_pid" ]] && kill "$backend_pid" 2>/dev/null || true; [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd backend && npm start) & backend_pid=$!
(cd frontend && BROWSER=none HOST="${FRONTEND_HOST:-127.0.0.1}" PORT="${FRONTEND_PORT:-3000}" npm start) & frontend_pid=$!
wait "$backend_pid" "$frontend_pid"
