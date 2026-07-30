#!/bin/bash

# This script runs the entire application: ollama, server, ml service, and client.
# All of them run in parallel; Ctrl+C stops all of them.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pids=()

cleanup() {
    echo "Stopping all services..."
    for pid in "${pids[@]}"; do
        kill "$pid" 2>/dev/null
    done
}
trap cleanup EXIT INT TERM

ollama serve &
pids+=($!)

(cd "$ROOT_DIR/server" && npm run dev) &
pids+=($!)

(cd "$ROOT_DIR/ml" && ./start.sh) &
pids+=($!)

(cd "$ROOT_DIR/client" && npm run dev) &
pids+=($!)

wait
