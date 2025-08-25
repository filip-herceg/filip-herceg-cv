## Filip Herceg – Portfolio

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

Required repository secrets:

- `K8S_SERVER` – API server URL
- `K8S_TOKEN` – Service account token
- `INGRESS_HOST` – Domain used in Ingress/Helm

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
