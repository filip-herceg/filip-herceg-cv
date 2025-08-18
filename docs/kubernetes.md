# Kubernetes & Helm Deployment

## Options

1. Raw manifests under `k8s/base`
2. Helm chart under `helm/`

Prefer Helm for parametrization.

## Core Resources

- Namespace
- Deployment (standalone Node container)
- Service (ClusterIP)
- Ingress (nginx + optional cert-manager annotations)
- HPA (CPU utilization target)
- ConfigMap / Secret (placeholders)

## Helm Values (excerpt)

```yaml
image:
  repository: ghcr.io/OWNER/REPO
  tag: latest
  pullPolicy: IfNotPresent
ingress:
  enabled: true
  host: yourdomain.tld
resources:
  requests:
    cpu: 50m
    memory: 128Mi
  limits:
    cpu: 250m
    memory: 512Mi
hpa:
  enabled: true
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
```

## Deploy (Helm)

```bash
helm upgrade --install portfolio ./helm \
  --namespace portfolio --create-namespace \
  -f helm/values.yaml
```

## Secrets

Create secret before deploy:

```bash
kubectl create secret generic portfolio-env -n portfolio \
  --from-literal=CONTACT_API_TOKEN=changeme
```

(Reference name must match deployment envFrom.)

## Ingress TLS

Add cert-manager annotations in `helm/templates/ingress.yaml` and supply a ClusterIssuer.

## Scaling

- Horizontal: HPA (CPU based)
- Vertical: Adjust requests/limits in values

## Rollback

```bash
helm history portfolio -n portfolio
helm rollback portfolio <REVISION> -n portfolio
```
