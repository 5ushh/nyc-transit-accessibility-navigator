#!/bin/bash
cd "$(dirname "$0")"
trap 'kill $(jobs -p) 2>/dev/null' EXIT
(cd backend && uvicorn app:app --port 8000) &
(cd frontend && python3 -m http.server 5500) &
sleep 2
open "http://localhost:5500/index.html"
wait
