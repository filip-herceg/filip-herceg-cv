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

### API Endpoints

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

---

MIT License.
