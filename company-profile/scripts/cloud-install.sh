#!/usr/bin/env bash
set -euo pipefail
cd /workspace/PurchaseMBG/company-profile
export npm_config_cache=/tmp/ubg-npm
npm ci --no-audit --no-fund
npm test
npm run build
npm run typecheck
cd ../sanity-studio
npm ci --no-audit --no-fund
npm run typecheck
if [[ -n "${SANITY_STUDIO_PROJECT_ID:-}" && -n "${SANITY_STUDIO_DATASET:-}" && -n "${SANITY_STUDIO_SSO_PROVIDER:-}" && -n "${SANITY_STUDIO_PREVIEW_ORIGIN:-}" ]]; then
  npm run build
else
  printf '%s\n' 'Studio build skipped: actual non-secret Studio identifiers/SSO configuration are not set.'
fi
