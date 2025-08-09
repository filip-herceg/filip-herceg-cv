# Architecture

## Overview
A containerized Next.js 14 (App Router) application served via Node.js (standalone output) and deployed to Kubernetes with optional Helm chart. CI builds, lints, and pushes a container image to GHCR; CD performs a Helm upgrade.

## Layers
- UI: Next.js App Router pages/components (Tailwind + shadcn/ui + Framer Motion)
- API Routes: /api/healthz, /api/contact, /api/rum
- Styling: Tailwind CSS + design tokens (CSS vars) + shadcn primitives
- Runtime: Node 20 Alpine (Docker multi-stage)
- Deployment: K8s manifests (raw) and Helm chart for customization

## Data / State
No persistent backend in this scaffold. Contact endpoint is a stub; future integration could use an email provider or queue.

## Key Decisions
| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Framework | Next.js 14 App Router | Server components + partial static generation |
| UI Kit | shadcn/ui | Accessible, composable primitives |
| Animations | Framer Motion | Declarative animation API |
| Container | Standalone build | Smaller image & minimal runtime deps |
| Config Mgmt | ConfigMap/Secret | 12-factor alignment |
| Scaling | HPA CPU-based | Simple initial elasticity |

## Diagram (Logical)
```
User -> Ingress -> Service -> Pod (Next.js) -> (API Routes)
                                |-> /api/healthz
                                |-> /api/contact (stub)
                                |-> /api/rum (web vitals)
```

## Extensibility
- Add persistence (e.g., Postgres) by creating a managed service and injecting DSN via Secret.
- Add caching (Redis) for dynamic content.
- Introduce queue (e.g., SQS / Service Bus) for async contact processing.
