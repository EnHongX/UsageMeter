#!/usr/bin/env bash
set -euo pipefail

npm run db:migrate
npm run db:seed
