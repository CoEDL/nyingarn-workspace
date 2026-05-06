#!/usr/bin/env bash
#
# deploy.sh — render the production config files using values from local
# `env`, copy them (plus the parent profiles/ directory) into a temp tree,
# rsync to the production server, and restart docker compose.
#
# Usage: ./deploy.sh user@host:/path/to/deploy/dir

set -euo pipefail

TARGET="${1:?usage: $0 user@host:/path/to/deploy/dir}"

cd "$(dirname "$0")"

if [[ ! -f env ]]; then
  echo "ERROR: ./env not found. Copy env.example to env and fill it in." >&2
  exit 1
fi

# Source the operator-local secrets so they're available to envsubst.
set -a
# shellcheck disable=SC1091
source ./env
set +a

REQUIRED_VARS=(
  DOMAIN ACME_EMAIL DB_PASSWORD
  S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY
  AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION
  MAPBOX_TOKEN SESSION_SECRET
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
  AAF_CLIENT_ID AAF_CLIENT_SECRET
  ADMINISTRATORS SES_SOURCE_EMAIL SES_REPLY_TO
)

missing=()
for v in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    missing+=("$v")
  fi
done
if (( ${#missing[@]} > 0 )); then
  echo "ERROR: the following variables are empty in ./env:" >&2
  printf '  %s\n' "${missing[@]}" >&2
  exit 1
fi

# envsubst's allowlist must be a single string like "$DOMAIN $ACME_EMAIL ..."
ALLOWLIST="$(printf '$%s ' "${REQUIRED_VARS[@]}")"

# Files to render. Anything else is copied verbatim.
TEMPLATES=(
  .env
  configuration/configuration.json
  workspace/nginx.conf
  repository/nginx.conf
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Copy the production tree into the temp dir, leaving operator-only files behind.
rsync -a \
  --exclude='env' \
  --exclude='env.example' \
  --exclude='deploy.sh' \
  --exclude='README.md' \
  --exclude='.gitignore' \
  ./ "$TMP/"

# Profiles live at the parent level (../profiles/) so a single source of truth
# is shared with the api/ service.
if [[ ! -d ../profiles ]]; then
  echo "ERROR: ../profiles not found (expected at $(realpath ../profiles 2>/dev/null || echo ../profiles))" >&2
  exit 1
fi
rsync -a ../profiles/ "$TMP/profiles/"

# error-definitions.json lives at ../configuration/ — single source of truth
# shared with the tasks/ service.
if [[ ! -f ../configuration/error-definitions.json ]]; then
  echo "ERROR: ../configuration/error-definitions.json not found" >&2
  exit 1
fi
mkdir -p "$TMP/configuration"
cp ../configuration/error-definitions.json "$TMP/configuration/error-definitions.json"

# Render each template, replacing only the allowlisted variables.
for tmpl in "${TEMPLATES[@]}"; do
  out="$TMP/$tmpl"
  mkdir -p "$(dirname "$out")"
  envsubst "$ALLOWLIST" < "$tmpl" > "$out"
done

# Push the rendered tree. Non-destructive — no --delete, so live databases /
# uploads / certificates are never touched, and config files removed from the
# repo will linger on the server until cleaned up manually.
rsync -avz "$TMP/" "$TARGET/"

HOST="${TARGET%%:*}"
REMOTE_PATH="${TARGET#*:}"
ssh "$HOST" "cd '$REMOTE_PATH' && docker compose up -d"
