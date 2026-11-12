#!/usr/bin/env bash
#
# deploy.sh — render the production templates using values from local
# `env`, copy them (plus the parent profiles/ directory) into a temp tree,
# show how it differs from what's on the server, then rsync it across, pull
# the latest images and restart docker compose.
#
# Usage: ./deploy.sh [--diff | --pull] [[user@]host:/path/to/deploy/dir]
#   --diff  show what would change on the server, then exit
#   --pull  only pull the latest images and restart; leave files alone
# The target defaults to the production server.

set -euo pipefail

DEFAULT_TARGET="vm.nyingarn.net:/srv/docker"

usage() {
  echo "usage: $0 [--diff | --pull] [[user@]host:/path]   (default $DEFAULT_TARGET)" >&2
  exit 1
}

MODE=deploy
case "${1:-}" in
  --diff) MODE="diff"; shift ;;
  --pull) MODE="pull"; shift ;;
esac
[[ $# -le 1 ]] || usage
TARGET="${1:-$DEFAULT_TARGET}"
[[ "$TARGET" == *:* ]] || usage
HOST="${TARGET%%:*}"
REMOTE_PATH="${TARGET#*:}"

# The `uploads` bucket is just a directory under the gateway root. It's created
# here rather than tracked as a .gitkeep because every file under s3-data/uploads
# is served as an S3 object, and a stray .gitkeep would become one.
restart_services() {
  # shellcheck disable=SC2029
  ssh "$HOST" "cd '$REMOTE_PATH' && mkdir -p s3-data/uploads && docker compose pull && docker compose up -d && docker compose ps"
}

if [[ "$MODE" == pull ]]; then
  restart_services
  exit 0
fi

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
  AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
  SESSION_SECRET
)

# Substituted if set, but allowed to be empty — rabbit falls back to guest.
OPTIONAL_VARS=(RABBIT_USER RABBIT_PASS)

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
ALLOWLIST="$(printf '$%s ' "${REQUIRED_VARS[@]}" "${OPTIONAL_VARS[@]}")"

# Files to render. Anything else is copied verbatim.
TEMPLATES=(
  .env
  workspace/nginx.conf
  repository/nginx.conf
)

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
TMP="$WORK/local"
SERVER="$WORK/server"
mkdir -p "$TMP" "$SERVER"

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

# Fetch the server's copies of the files we're about to push and diff them.
# Files that exist only on the server aren't shown; nothing here removes them.
(cd "$TMP" && find . -type f -printf '%P\n') > "$WORK/files"
rsync -a --ignore-missing-args --files-from="$WORK/files" "$TARGET/" "$SERVER/"

echo
echo "Changes to files on $HOST (server → local):"
if (cd "$WORK" && git -c core.fileMode=false --no-pager diff --no-index --no-prefix --color=auto --stat server local) \
  && echo "  none"; then
  CHANGED=false
else
  CHANGED=true
  (cd "$WORK" && git -c core.fileMode=false diff --no-index --no-prefix --color=auto server local) || true
fi

if [[ "$MODE" == diff ]]; then
  exit 0
fi

echo
if $CHANGED; then
  prompt="Push these changes, pull the latest images and restart? [y/N] "
else
  prompt="Pull the latest images and restart? [y/N] "
fi
read -r -p "$prompt" answer < /dev/tty
if [[ "$answer" != [yY] ]]; then
  echo "Aborted."
  exit 1
fi

# Push the rendered tree. Non-destructive — no --delete, so live databases /
# uploads / certificates are never touched, and config files removed from the
# repo will linger on the server until cleaned up manually. Ownership and
# directory times are left alone; the remote account doesn't own the deploy
# directory and can't set them on it.
if $CHANGED; then
  rsync -avz --no-owner --no-group --omit-dir-times "$TMP/" "$TARGET/"
fi

restart_services
