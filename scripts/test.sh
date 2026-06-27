#!/usr/bin/env bash
set -euo pipefail

export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://usagemeter:usagemeter@localhost:55432/usagemeter?schema=test}"

docker compose up -d postgres redis
npm run db:generate
npm test
