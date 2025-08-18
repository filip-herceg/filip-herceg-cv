# CI/CD Pipeline

## CI (Build & Test)

Workflow: `.github/workflows/ci.yml`
Steps:

1. Checkout
2. Setup Node (cache deps)
3. Install (npm ci)
4. Lint & typecheck
5. Build
6. Lighthouse CI (warn-only thresholds)
7. Docker build & push (main branch)

## Required GitHub Secrets

- `GHCR_USERNAME`
- `GHCR_TOKEN` (write:packages)

## CD (Deploy)

Workflow: `.github/workflows/cd.yml`
Trigger: push to `main` (after CI) or manual dispatch.
Steps:

1. Checkout
2. Setup kubectl + helm
3. Authenticate cluster (env / secrets required)
4. `helm upgrade --install`

### Additional Secrets

- `KUBE_CONFIG` (base64 kubeconfig) or cloud auth env vars

## Image Tagging Strategy

Current: `latest` (improve by using Git SHA)
Enhancement example: add step to set `IMAGE_TAG=${{ github.sha }}` and pass `--set image.tag=$IMAGE_TAG`.

## Lighthouse Thresholds

Configured in `lighthouserc.json` (warn level). CI will not fail but logs regressions.

## Future Enhancements

- Add caching for `.next/cache`
- Add SBOM generation (syft)
- Sign images (cosign)
- Add dependency review gate
