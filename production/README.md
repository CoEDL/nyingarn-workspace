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
| `postgres-data/`, `traefik/letsencrypt/` | yes (just `.gitkeep`) | Bind-mount targets. Rsync is non-destructive, so existing data on the server (databases, uploads, Let's Encrypt certs) is never touched. |
| `s3-data/`, `elastic/data/` | no | Bind-mount targets created on the server. `s3-data/uploads` is created by `deploy.sh` — see [Object storage](#object-storage). |
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

## Object storage

The `s3` service is [versitygw](https://github.com/versity/versitygw), an S3 gateway
over a plain filesystem. Object keys map directly to paths, so a manuscript image
lands on disk as a real file under `s3-data/uploads/` and can be read, checksummed
or recovered without the gateway. That's the reason it was chosen over SeaweedFS:
if the gateway goes away, the archive is still an ordinary directory tree.

Operational notes:

- **Buckets are directories.** `uploads` is `s3-data/uploads`. Anything else placed
  directly in `s3-data/` would also be served as a bucket, so keep it to the one
  directory. If the internal IAM or versioning features are ever enabled, mount
  their directories *outside* the gateway root for the same reason.
- **Extended attributes are required.** Object metadata is stored in xattrs and
  the gateway validates support at startup. The bind mount from the host keeps
  this working; serving `s3-data` from a filesystem without user xattrs would not.
- **ext4 is a deliberate choice.** Completing a multipart upload merges the parts
  with `copy_file_range()`, which is a metadata-only reflink on XFS and Btrfs but a
  real byte copy on ext4. Uploads under 5 MB never take the multipart path at all,
  and at our file sizes the extra copy costs a fraction of a second — far less than
  the image processing that follows. Revisit only if very large files arrive.
- **Aborted uploads leave parts behind** under `s3-data/uploads/.sgwtmp/multipart/`.
  Abandoned browser uploads accumulate here; prune it if it grows.
- **Snapshots are the backup.** Because metadata lives in xattrs on the same inodes
  as the data, a block-level snapshot is inherently self-consistent — there is no
  separate metadata database that could be captured out of step with the objects.

## Loading Describo data packs

The data-pack loader is part of the `workspace-api` image — no separate script is needed in this directory. Run it on the server when you need to (re)load:

```bash
docker compose exec workspace-api npm run load:datapacks
```

## Variables reference

See `env.example` for the full list. Two values must be JSON array literals:

- `ADMINISTRATORS='["alice@example.com","bob@example.com"]'`
- `SMTP_REPLY_TO='["nyingarn-project@unimelb.edu.au"]'`

These get substituted directly (without surrounding quotes) into `configuration.json`, so they must be valid JSON. **Wrap them in single quotes** in `env` — that prevents bash from stripping the embedded double quotes when the deploy script sources the file.
