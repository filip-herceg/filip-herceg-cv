## Filip Herceg – Portfolio

![Coverage](https://raw.githubusercontent.com/filip-herceg/filip-herceg-cv/badges/badges/coverage.svg)
<!-- Alternative dynamic badge via Shields: https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/filip-herceg/filip-herceg-cv/badges/badges/coverage.json -->

Production-grade personal portfolio built with:

- Next.js 15 App Router (standalone output)
- TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- Docker (multi-stage, small runtime)
- Kubernetes manifests & Helm chart
- GitHub Actions CI (lint, typecheck, build, Lighthouse) & CD (Helm deploy)

### Local Development

```bash
npm ci
npm run dev
```

Visit http://localhost:3000

E2E quick run (build → start → tests → shutdown):

```bash
npm run e2e:orchestrate
```
This script builds the app, starts it on 127.0.0.1 with relaxed CSP for tests (E2E=1), waits for readiness, runs Playwright tests (including optional visual diffs), then shuts the server down.

### Build & Run Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t filip-cv:dev .
docker run -p 3000:3000 filip-cv:dev
```

### Kubernetes (raw manifests)

```bash
kubectl apply -f k8s/base/
```

### Helm

```bash
helm upgrade --install web ./helm \
	--namespace portfolio --create-namespace \
	--set image.repository=ghcr.io/OWNER/filip-herceg-cv \
	--set image.tag=latest \
	--set ingress.host=yourdomain.tld
	# Enable metrics endpoint on port 9464
	--set metrics.enabled=true
```

### CV Feature & API

Routes:

- `GET /cv` – Vollständige CV Ansicht
- `GET /cv?mode=short` – Interaktiver Short-Builder (Skills/Projects auswählen, Permalink kopieren, Print öffnen)
- `GET /cv/print` – Print-optimierte Ansicht (verwendet gleiche Layout-Engine); nutzt Query-Params `skills`, `projects`
- `GET /api/cv/pdf?skills=...&projects=...` – Serverseitiges A4-PDF (Chromium + puppeteer-core), Metadaten via pdf-lib

Permalink-Parameter:
- `skills` – Komma-separierte Skill-IDs
- `projects` – Komma-separierte Project-IDs
- `mode=short` – aktiviert den Builder (für `/cv`), für `/cv/print` nicht nötig

Beispiel:
```
http://localhost:3000/cv?mode=short&skills=ts,react,node&projects=obs-platform,edge-cdn
```

PDF Download (curl):
```bash
curl -L "http://localhost:3000/api/cv/pdf?skills=ts,react&projects=obs-platform" -o cv.pdf
```

Visual diff harness for print fidelity:
- Set `EXPORT_PRINT_DIFF=1` and run Playwright tests to generate/compare print snapshots.
- First run creates baselines; review and commit if intentional.

Deterministic loader fallback:
- CV pages use a robust loader that seeds from DB when available, else falls back to bundled defaults so /cv works without a database in CI/E2E.

### Export Configs (Admin)

An admin UI at `/admin/exports` provides CRUD for named PDF export presets (sections ordering, filters, density, color mode, paper size).

Workflow:
1. Create a config (name + sections builder) and save.
2. Generate PDF via API using stored config id:
	 ```bash
	 curl -X POST -H 'Content-Type: application/json' \
		 -d '{"configId":"<id-from-list>"}' \
		 http://localhost:3000/api/export/generate > cv.pdf
	 ```
3. On concurrent edits the server returns 409; UI refetches to resolve.

Docs: see `docs/export-system.md` for full details.

Quick Export:
- The UI stores the last exported config id in `last_export_config` cookie (30d) and surfaces a "Quick Export Last" button for rapid regeneration.

Tag Filtering:
- Each section entry supports a `tags` array (up to 8) enabling fine-grained inclusion. Filtering applies as:
	- Projects/Experiences: match by `stack` items (case-insensitive)
	- Skills/Education: match by `tags` arrays (case-insensitive)
	- Behavior: if any tags are set for a section, only matching items are included before `limit` is applied.

Environment Variablen (siehe `.env.example`):
- `BASE_URL` – Basis-URL für absolute PDF-Render-Links (Fallback: Host Header)
- `CHROMIUM_PATH` – Expliziter Pfad zur Chromium/Chrome Binary. Wenn nicht gefunden: Response 501.

Troubleshooting PDF:
- 501: Chromium nicht gefunden → Binary installieren oder `CHROMIUM_PATH` setzen.
- 504/timeout: Seite benötigt länger (Netzwerk / Fonts) → Timeout erhöhen oder Ressourcen optimieren.
- Leeres PDF / fehlende Styles: sicherstellen, dass `print.css` geladen wird (Route `/cv/print`).
- Container: Installiere minimal `chromium` Paket (z.B. Debian/Ubuntu: `apt-get update && apt-get install -y chromium`) oder nutze ein Base-Image mit Chrome.

### API Endpoints (Core)

- `GET /api/healthz` – liveness
- `POST /api/contact` – contact form (stub)

### CI/CD

Workflows in `.github/workflows`:

- `ci.yml`: lint, typecheck, build, Lighthouse, Docker build+push (main)
- `cd.yml`: Helm deploy on push to main

Coverage badge JSON artifact produced in CI (job build-test). You can publish it via Shields endpoint (e.g. shields.io/endpoint) or commit a rendered SVG in a follow-up action.

An automated job now generates and publishes a static SVG badge to the `badges` branch (`badges/coverage.svg`). Reference it with the raw.githubusercontent.com URL as shown at the top of this README.

Canary validation with an ephemeral kind cluster (`canary-kind` job) installs the Helm chart using the built image digest prior to production CD.

Automated releases: Conventional commits merged to `main` trigger a semantic-release job (after canary + supply chain checks). It updates `CHANGELOG.md`, bumps the version in `package.json`, creates a GitHub Release, and retags the container image with both `X.Y.Z` and `vX.Y.Z`.

Commit types mapped:
 - feat: minor bump (or major if BREAKING CHANGE footer)
 - fix: patch bump
 - chore/docs/test/refactor/style/perf: no release unless BREAKING
 - BREAKING CHANGE: major bump

Use `[skip ci]` in trivial docs-only commits if desired; release commit already includes it automatically.

### Metrics & Observability

Helm values:

```yaml
metrics:
	enabled: true      # exposes /metrics on the service (port 9464)
	port: 9464
```

Prometheus scrape annotations are added automatically to the Service when `metrics.enabled` is true. Provide an exporter or integrate instrumentation to serve metrics at `/metrics`.

If you run Prometheus Operator, enable a ServiceMonitor:

```yaml
metrics:
	enabled: true
	serviceMonitor:
		enabled: true
		interval: 30s
		scrapeTimeout: 10s
		labels:
			release: prometheus-stack
```

Rollback strategy: CD workflow records the previous Helm revision and automatically rolls back if the deployment or smoke check fails, then surfaces recent events and pod descriptions for diagnosis.

Grafana dashboard: enable an embedded dashboard ConfigMap:

```yaml
metrics:
	enabled: true
	grafanaDashboard:
		enabled: true
		folder: Applications
```

Label `grafana_dashboard=1` is added; many Grafana sidecar importers watch for this automatically. Dashboard panels expect standard Node.js / prom-client metrics.
Additional panel added: CV aggregate loads by source (`cv_aggregate_loads_total{source}`) distinguishing `empty` onboarding placeholder vs real `db` content. After initial admin population, `empty` series should approach zero.

Required repository secrets:

- `K8S_SERVER` – API server URL
- `K8S_TOKEN` – Service account token
- `INGRESS_HOST` – Domain used in Ingress/Helm

#### Local CI Dry Run

You can execute most CI jobs locally with [`act`](https://github.com/nektos/act):

```bash
brew install act # or see project docs
act pull_request -j build-test
act pull_request -j static-analysis
```

Notes:
- Some security jobs (CodeQL, gitleaks, trivy) may require `--container-architecture linux/amd64` or will be skipped without proper tokens.
- Lighthouse / pa11y tasks need an open port; act runs in a container so ensure it exposes 3000.
- Helm / kubeconform require network access to fetch schemas; add `--bind` flags if needed.


### Customization

- Edit hero & projects: `src/app/(site)/page.tsx`
- About content: `src/app/(site)/about/page.tsx`
- Projects list: `src/app/(site)/projects/page.tsx`
- Contact form: `src/app/(site)/contact/page.tsx` & API handler `src/app/api/contact/route.ts`
- Header nav: `src/components/layout/site-header.tsx`

### TODO / Ideas

- Integrate email delivery (Resend / SMTP) in `api/contact`.
- Add SEO enhancements (sitemap.xml, robots.txt, OG image).
- Add analytics / web vitals RUM endpoint.
- Additional CV improvements: theming switch, multi-language CV data, caching for PDF renders.

### Dynamic CV Persistence (In Progress)

Phase 2 introduces a database-backed, per-instance editable CV. Current state (now PostgreSQL-ready):

- Prisma + SQLite dev datasource (`DATABASE_URL=file:./dev.db`)
- Seed script to import existing static JSON once: `npm run prisma:migrate:dev && npm run db:seed:cv`
- Service layer (`src/lib/cv/service.ts`) attempts DB aggregate then falls back to static JSON until data seeded.

Upcoming slices (see `docs/cv-persistence-i18n-plan.md`): admin auth, CRUD UI, localization workflow, removal of static fallback.

Environment additions:
```
DATABASE_URL=file:./dev.db
ADMIN_PASSWORD_HASH= # bcrypt hash for bootstrap
```

#### Storage & Caching Environment Variables

Optional knobs for the new pluggable CV storage layer and distributed caching:

| Variable | Purpose | Default |
|----------|---------|---------|
| `CV_STORAGE` | Storage backend: `db` (Prisma), `memory` (ephemeral), `redis` (cache over DB), `s3` (object-store cache over DB) | `db` |
| `CV_AUTO_SEED` | If `false`, prevents persistent DB seeding; serves in-memory seed only | `true` |
| `REDIS_URL` | Redis connection URL when using `CV_STORAGE=redis` | `redis://localhost:6379` |
| `S3_BUCKET` | Bucket name for `CV_STORAGE=s3` (read/write JSON aggregates) | _(unset)_ |
| `S3_PREFIX` | Key prefix inside bucket for S3 backend | `cv` |
| `AWS_REGION` | Region for S3 client (falls back to AWS_DEFAULT_REGION) | `us-east-1` |
| `CV_REDIS_TTL` | Seconds to keep aggregate in Redis | `300` |
| `REAL_REDIS_URL` | (Tests) Provide to enable integration test against a real Redis instance | _(unset)_ |

Metrics: `cv_aggregate_loads_total{source="db|empty|redis|s3"}`, `cv_cache_hits_total{backend}`, `cv_cache_misses_total{backend}`, `cv_storage_backend{backend}` (gauge=1 for active backend).

#### PDF Cache Backends

Server-side PDF generation (`/api/cv/pdf`) now supports a pluggable cache to avoid regenerating identical selections. Backends:

| Backend | Activate | Characteristics | Notes |
|---------|----------|-----------------|-------|
| Memory  | (default) | LRU (size + TTL), process-local only | Fastest; resets on deploy. |
| Redis   | `PDF_CACHE_BACKEND=redis` + `REDIS_URL` | Distributed, TTL via Redis EX | Use for multi-pod horizontal scale. |
| S3      | `PDF_CACHE_BACKEND=s3` + `S3_BUCKET` (+ optional `S3_ENDPOINT`) | Durable object store; base64 payload blobs | Good for cold-start retention; eventual consistency fine. |

Additional environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `PDF_CACHE_BACKEND` | `memory` | Select backend (`memory|redis|s3`) | `memory` |
| `PDF_CACHE_MAX_ENTRIES` | Max in-memory entries (memory backend) | `50` |
| `PDF_CACHE_TTL_MS` | TTL milliseconds (memory & redis TTL base) | `300000` |
| `S3_PDF_PREFIX` | Key prefix for S3 PDF cache objects | `pdf-cache` |
| `S3_ENDPOINT` | Optional custom/Localstack endpoint (forces path-style) | _(unset)_ |

Metrics exposed:

| Metric | Meaning |
|--------|---------|
| `pdf_requests_total{result}` | PDF request outcomes (success, error, timeout, unsupported) |
| `pdf_cache_hits_total` | Cache hits (any backend) |
| `pdf_cache_misses_total` | Cache misses |
| `pdf_cache_entries` | Current in-memory entry count (memory backend only) |

Invalidation (manual):
 - Redis: `redis-cli --raw KEYS 'pdf:*:v1' | xargs -r redis-cli DEL`
 - S3: remove objects under `${S3_PDF_PREFIX}/` or set lifecycle expiration.
 - Memory: restart pod or use a future admin endpoint (TODO) calling `pdfCache.invalidate('*')`.

Future enhancements planned: latency histograms per backend, compression toggle (S3), conditional ETag revalidation, admin flush endpoint.


PostgreSQL switch:
1. Set env: `DATABASE_URL=postgresql://user:pass@host:5432/filipcv?schema=public` (optionally `DATABASE_SHADOW_URL=` for migrate dev)
2. Update `prisma/schema.prisma` provider to `postgresql` (already done if you see Json columns).
3. Run migrations: `npx prisma migrate deploy` (prod) or `migrate dev` (local).
4. (If migrating existing SQLite data) run one-off script:
```
LEGACY_SQLITE_URL="file:./dev.db" DATABASE_URL="postgresql://user:pass@host:5432/filipcv?schema=public" \\
	node scripts/migrate-sqlite-to-postgres.mjs
```
5. Remove / ignore old SQLite file once verified.

JSON columns now use native Postgres JSONB (via Prisma Json) for: skills.tagsJson, project highlights/stack/links, experience achievements/stack/tags, education highlights, design JSON blobs, etc.

NOTE: Until the CV pages & API routes are migrated to the service layer they still reference static exports (migration underway).

---

MIT License.
