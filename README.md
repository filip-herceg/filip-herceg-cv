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

---

MIT License.
