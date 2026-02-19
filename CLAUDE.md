# Nyingarn Workspace

A multi-service application for digitising and publishing Australian Indigenous language manuscripts. Not a Node workspaces monorepo — each service is independently managed.

## Quick Start

```bash
# Copy and edit configuration
cp configuration/example-configuration.json configuration/development-configuration.json

# Start everything
docker compose up
```

- Workspace UI: http://localhost:9000
- Repository UI: http://localhost:9001
- API: http://localhost:8080
- MinIO console: http://localhost:10001
- RabbitMQ management: http://localhost:15672
- Elasticsearch: http://localhost:9200

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
| **db** | PostgreSQL 13 | 5432 | Primary database (db: `nyingarn`, user: `root`) |
| **elastic** | Elasticsearch 8.16 | 9200 | Full-text + phonetic search |
| **minio** | MinIO | 10000 | S3-compatible object storage |
| **rabbit** | RabbitMQ 3 | 5672 | Message broker |

## Key Patterns

- **Language:** JavaScript with Babel transpilation (`babel-node`), ESM (`"type": "module"`). Not TypeScript.
- **Configuration:** JSON files in `configuration/`, mounted at `/srv/configuration/` in Docker. Config loaded via `api/src/common/configuration.js`. Never commit real config — use `example-configuration.json` as template.
- **RO-Crate:** Metadata standard used throughout. Profiles in `profiles/`. Libraries: `ro-crate`, `@coedl/nocfl-js`, `@describo/data-packs`.
- **Auth:** OpenID Connect via `openid-client` (Google + AAF providers), JWT sessions via `jose`.
- **Uploads:** TUS resumable upload protocol via `@paradisec-platform/fastify-tus-s3-plugin` (API) and Uppy (UI).
- **Real-time:** Socket.IO for WebSocket communication between API and UIs.
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
