# Nyingarn Workspace — Production Deploy

This directory holds the Docker Compose configuration for the production
deployment, plus a deploy script that renders templated config files using
secrets from a local `env` file and rsyncs the result to the production
server.

## File layout

| File | Tracked? | Purpose |
|---|---|---|
| `docker-compose.yml` | yes | Service definitions (uses `${VAR}` interpolation resolved at runtime by Docker Compose). |
| `.env` | yes (template) | Committed template with `${VAR}` placeholders. The deploy script renders it using values from `env`, and the rendered file lands on the server next to `docker-compose.yml` so Docker Compose auto-loads it. |
| `env.example` | yes | Schema for operators — shows all required variables with placeholder values. Copy this to `env` to start. |
| `env` | **no** (gitignored) | Operator-local secrets. Read by `deploy.sh` to render templates. **Never commit this file.** |
| `configuration/configuration.json` | yes (template) | API + UI configuration with `${VAR}` placeholders. |
| `workspace/nginx.conf` | yes (template) | Workspace UI nginx config. |
| `repository/nginx.conf` | yes (template) | Repository UI nginx config. |
| `traefik/traefik.yml` | yes | Traefik config. |
| `elastic/entrypoint.sh` | yes | Elastic startup script that installs the phonetic search plugin. |
| `postgres-data/`, `s3-data/`, `elastic/data/`, `traefik/letsencrypt/` | yes (just `.gitkeep`) | Bind-mount targets. Rsync is non-destructive, so existing data on the server (databases, uploads, Let's Encrypt certs) is never touched. |
| `deploy.sh` | yes | Renders templates and rsyncs to the server. Not shipped to the server. |

A few files are pulled from the parent directory at deploy time so we don't duplicate them:

- `../profiles/` → `profiles/` — RO-Crate profiles, shared with the `api` service.
- `../configuration/error-definitions.json` → `configuration/error-definitions.json` — error mapping, shared with the `tasks` service. Its `${cause.X}` markers are runtime placeholders, not deploy-time templates.

## First-time setup

```bash
cp env.example env
# Edit `env` and fill in real values for every variable.
```

`env` is gitignored — only your machine has it.

## Deploying

```bash
./deploy.sh user@host:/path/to/deploy/dir
```

The script will:

1. Source `env` and validate that every required variable is non-empty.
2. Build a temp tree containing the rendered templates plus everything else from `production/` (and `../profiles/`).
3. Rsync the temp tree to `user@host:/path` non-destructively (no `--delete`) so live databases, uploads, and certificates are never touched.
4. SSH to the host and run `docker compose up -d` from the deploy path.

## Loading Describo data packs

The data-pack loader is part of the `workspace-api` image — no separate script is needed in this directory. Run it on the server when you need to (re)load:

```bash
docker compose exec workspace-api npm run load:datapacks
```

## Variables reference

See `env.example` for the full list. Two values must be JSON array literals:

- `ADMINISTRATORS='["alice@example.com","bob@example.com"]'`
- `SES_REPLY_TO='["nyingarn-project@unimelb.edu.au"]'`

These get substituted directly (without surrounding quotes) into `configuration.json`, so they must be valid JSON. **Wrap them in single quotes** in `env` — that prevents bash from stripping the embedded double quotes when the deploy script sources the file.
