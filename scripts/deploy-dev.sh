#!/usr/bin/env bash
# Deploy an unmerged feature branch into the SAME Pi app, using its existing settings and .env.local.
# Switch back to production with ./scripts/deploy.sh (which always deploys origin/main).
set -euo pipefail

if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [branch] (default: feat/animated-clocks-flapboard)" >&2
  exit 2
fi

BRANCH="${1:-feat/animated-clocks-flapboard}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

echo "Deploying origin/$BRANCH in the existing installation on port 3000."
echo "This temporarily replaces the production build; .env.local and saved settings are retained."
exec "$SCRIPT_DIR/deploy.sh" --branch "$BRANCH"
