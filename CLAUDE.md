# Nyingarn Workspace

A multi-service application for digitising and publishing Australian Indigenous language manuscripts. Not a Node workspaces monorepo — each service is independently managed.

## Quick Start

```bash
docker compose up
```

Dev runs with no setup. To use Textract OCR, put `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in a git-ignored `.env` (see `.env.example`). Log in as `admin@example.com` and read the code in Mailpit.

- Workspace UI: http://localhost:9000
- Repository UI: http://localhost:9001
- API: http://localhost:9000/api/ (proxied by nginx, not published directly)
- MinIO console: http://localhost:10001
- RabbitMQ management: http://localhost:15672
- Mailpit (catches all outgoing email in dev): http://localhost:8025

Only the browser-facing ports above are published on the host. Elasticsearch, MinIO S3, RabbitMQ AMQP, SMTP and the xml-processor are reachable from other containers by service name only. Local credentials can be overridden through a git-ignored `.env` file; see `.env.example`.

## Architecture

```
nginx (edge)
├── :9000 → ui (workspace frontend)
├── :9001 → ui-repository (repository frontend)
└── /api/ → api (Fastify backend)
              ├── PostgreSQL (db)
              ├── Elasticsearch (search + phonetic plugin)
              ├── MinIO/S3 (object storage)
              ├── RabbitMQ → tasks (async worker)
              └── xml-processor (Tomcat/XProc TEI pipeline)
```

### Services

| Service | Tech | Port | Purpose |
|---|---|---|---|
| **api** | Fastify 4, Sequelize 6, Babel | 8080 | REST API, auth, TUS uploads, WebSocket |
| **ui** | Vue 3, Element Plus, Vite 5, Tailwind | via nginx:9000 | Workspace frontend (digitisation) |
| **ui-repository** | Vue 3, Element Plus, Vite 5, Mapbox GL | via nginx:9001 | Public repository frontend |
| **tasks** | foo-foo-mq, Sharp, AWS Textract | — | Async workers (image processing, OCR, TEI assembly) |
| **xml-processor** | Tomcat 9, XProc, XSLT | 8888 | TEI/XML transformation pipeline |
| **db** | PostgreSQL 18 | 5432 | Primary database (db: `nyingarn`, user: `root`) |
| **elastic** | Elasticsearch 8.16 | 9200 | Full-text + phonetic search |
| **minio** | MinIO | 10000 | S3-compatible object storage |
| **rabbit** | RabbitMQ 3 | 5672 | Message broker |
| **mail** | Mailpit | 1025 (SMTP), 8025 (UI) | Development SMTP sink |

## Key Patterns

- **Language:** JavaScript with Babel transpilation (`babel-node`), ESM (`"type": "module"`). Not TypeScript.
- **Configuration:** Committed JSON per environment — `configuration/dev.json`, `configuration/test.json`, and `production/configuration/prod.json` (symlinked as `configuration/prod.json`) — mounted at `/srv/configuration/`. `NYINGARN_ENV` (`dev`, `test`, `prod`) picks the file; `npm test` sets `test`. The JSON holds no secrets: `loadConfiguration()` in `api/src/common/configuration.js` fills them in from env vars (`SESSION_SECRET`, `S3_*`, `AWS_*`, `RABBIT_*`, `SMTP_*`) and fails at startup if a required one is missing. Database settings are read from `DB_*` env vars directly.
- **RO-Crate:** Metadata standard used throughout. Profiles in `profiles/`. Libraries: `ro-crate`, `@coedl/nocfl-js`, `@describo/data-packs`.
- **Auth:** Email login links only (one-time code emailed to existing users, or to anyone listed in `api.administrators`). JWT sessions via `jose`.
- **Uploads:** TUS resumable upload protocol via `@paradisec-platform/fastify-tus-s3-plugin` (API) and Uppy (UI).
- **Real-time:** Socket.IO for WebSocket communication between API and UIs.
- **Email:** Nodemailer over SMTP (`api/src/common/email.js`), configured under `api.smtp`. MJML templates in `api/src/common/email-templates/` are compiled at startup. Dev mail lands in Mailpit.
- **Shared code:** The tasks service mounts and imports directly from `/srv/api/src/` (Sequelize models, common utilities).
- **State management:** Vuex 4 in both frontends.

## Per-Service Commands

All run inside Docker containers (or `docker compose exec <service>`):

| Command | api | tasks | ui | ui-repository |
|---|---|---|---|---|
| `npm run develop` | Start dev server | Start worker | Start Vite dev | Start Vite dev |
| `npm test` | Jest | Jest | — | — |
| `npm run build` | — | — | Vite build | Vite build |

API also has `npm run load:datapacks` to load Describo data packs.

The root `package.json` only holds wrapper scripts around `docker compose` (`pnpm up`, `pnpm logs api`, `pnpm test`, `pnpm psql`, `pnpm seed`, ...); it has no dependencies.

### Seed data

```bash
pnpm seed [--email you@example.com]
```

Creates items from `tasks/src/test-data/` (TEI, DigiVol and images) in `SeedCollection`, runs them through the normal processing tasks, fills in missing crate metadata, assembles the TEI, indexes everything into the workspace search, and publishes most items to the repository (Bates35 restricted to the seeding user; `msword_example` and `SeedImages` stay workspace-only). Owner defaults to the first `api.administrators` entry. Safe to re-run: only resources without processed output are reprocessed. Needs `rabbit-worker1` running and data packs loaded.

## Database

Sequelize models in `api/src/models/`: `collection`, `item`, `item_user`, `log`, `repoitem`, `session`, `task`, `user`, `user_otp`.

## API Routes

Route modules in `api/src/routes/`: `admin`, `auth`, `base`, `collection`, `data`, `describo`, `item`, `logs`, `publish`, `repository`, `search`, `user`.

## Versioning & Release

```bash
# Bump version across all services and push tag
./version-and-push.sh [minor | patch]
```

This script runs `npm version` in api/, tasks/, ui/, ui-repository/, commits, tags, and pushes. The tag push triggers `.github/workflows/release.yml` which builds and publishes Docker images to `ghcr.io/coedl/`.

## Testing

```bash
docker compose exec api npm test
docker compose exec rabbit-worker1 npm test
```

Tests use Jest 29 with `babel-jest`. Run with `--runInBand` (serial execution).

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `CoEDL/nyingarn-workspace` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
