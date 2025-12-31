# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Schema Validator API.

## Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured to access your cluster
- Docker image built and pushed to a container registry

## Files

- `deployment.yaml` - Main deployment and service configuration
- `configmap.yaml` - Non-sensitive configuration
- `secret.yaml.example` - Example secret file (create your own `secret.yaml`)
- `preconfig-configmap.yaml.example` - Example ConfigMap for preconfigured schemas and configurations
- `ingress.yaml` - Optional ingress configuration for external access

## Quick Start

### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t schema-validator:latest .

# Tag for your registry (replace with your registry)
docker tag schema-validator:latest your-registry/schema-validator:latest

# Push to registry
docker push your-registry/schema-validator:latest
```

### 2. Create Secrets

Create a `secret.yaml` file from the example:

```bash
cp k8s/secret.yaml.example k8s/secret.yaml
```

Edit `k8s/secret.yaml` with your MongoDB connection string:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: schema-validator-secrets
type: Opaque
stringData:
  mongodb-uri: "mongodb://your-mongodb-connection-string"
```

### 3. Update Deployment

Edit `deployment.yaml` and update the image reference:

```yaml
image: your-registry/schema-validator:latest
```

### 4. Deploy to Kubernetes

```bash
# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Apply Secret
kubectl apply -f k8s/secret.yaml

# Apply Deployment and Service
kubectl apply -f k8s/deployment.yaml

# Optional: Apply Ingress
kubectl apply -f k8s/ingress.yaml
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -l app=schema-validator

# Check services
kubectl get svc schema-validator-service

# View logs
kubectl logs -l app=schema-validator -f

# Port forward for local testing
kubectl port-forward svc/schema-validator-service 3000:80
```

## Preconfigured Data

The application supports loading preconfigured schemas and configurations from a mounted ConfigMap on startup. This is useful for:

- Initializing default schemas and configurations
- Ensuring required schemas exist in all environments
- Bootstrapping new deployments

### How It Works

1. **ConfigMap Mount**: The ConfigMap is mounted at `/etc/app-config` (configurable via `CONFIG_DIR` env var)
2. **File Format**: 
   - `schemas.json` - Array of schema objects
   - `configurations.json` - Array of configuration objects
3. **Idempotent**: The loader checks if schemas/configurations already exist before creating them
4. **Graceful**: The app starts even if the ConfigMap doesn't exist or files are missing

### File Formats

**schemas.json**:
```json
[
  {
    "name": "Schema Name",
    "type": "signal",
    "description": "Optional description",
    "schema": { ... }
  }
]
```

**configurations.json**:
```json
[
  {
    "schemaName": "Schema Name",
    "type": "signal",
    "name": "Configuration Name",
    "data": { ... }
  }
]
```

**Important Notes**:
- Configurations reference schemas by `schemaName` and `type`
- The schema must exist and be active for the configuration to be created
- Both files are optional - you can have just schemas, just configurations, or both

### Example Files

See `config/schemas.json.example` and `config/configurations.json.example` for complete examples.

## Preconfigured Data

The application supports loading preconfigured schemas and configurations from a mounted ConfigMap on startup. This is useful for:

- Initializing default schemas and configurations
- Ensuring required schemas exist in all environments
- Bootstrapping new deployments

### How It Works

1. **ConfigMap Mount**: The ConfigMap is mounted at `/etc/app-config` (configurable via `CONFIG_DIR` env var)
2. **File Format**: 
   - `schemas.json` - Array of schema objects
   - `configurations.json` - Array of configuration objects
3. **Idempotent**: The loader checks if schemas/configurations already exist before creating them
4. **Graceful**: The app starts even if the ConfigMap doesn't exist or files are missing

### File Formats

**schemas.json**:
```json
[
  {
    "name": "Schema Name",
    "type": "signal",
    "description": "Optional description",
    "schema": { ... }
  }
]
```

**configurations.json**:
```json
[
  {
    "schemaName": "Schema Name",
    "type": "signal",
    "name": "Configuration Name",
    "data": { ... }
  }
]
```

**Important Notes**:
- Configurations reference schemas by `schemaName` and `type`
- The schema must exist and be active for the configuration to be created
- Both files are optional - you can have just schemas, just configurations, or both

### Example Files

See `config/schemas.json.example` and `config/configurations.json.example` for complete examples.

## Configuration

### Environment Variables

- `MONGODB_URI` - MongoDB connection string (from Secret)
- `MONGODB_DB_NAME` - Database name (from ConfigMap)
- `PORT` - Application port (default: 3000)
- `CONFIG_DIR` - Directory where ConfigMap is mounted (default: `/etc/app-config`)

### Resource Limits

Default resource requests and limits are set in `deployment.yaml`. Adjust based on your needs:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Scaling

Scale the deployment:

```bash
kubectl scale deployment schema-validator --replicas=3
```

Or update the `replicas` field in `deployment.yaml`.

## Health Checks

The deployment includes:
- **Liveness Probe**: Restarts the container if unhealthy
- **Readiness Probe**: Removes pod from service endpoints if not ready

Both probes use the `/health` endpoint.

## Ingress

The `ingress.yaml` file is configured for nginx ingress controller. Update the hostname and annotations based on your ingress controller.

## MongoDB in Kubernetes

If deploying MongoDB in the same cluster, you can use a StatefulSet or Helm chart. Update the `mongodb-uri` in your secret to point to the MongoDB service.

Example MongoDB service reference:
```yaml
mongodb-uri: "mongodb://mongodb-service:27017/schema-validator"
```

## Troubleshooting

### Check pod status
```bash
kubectl describe pod <pod-name>
```

### View logs
```bash
kubectl logs <pod-name>
```

### Debug container
```bash
kubectl exec -it <pod-name> -- sh
```

### Check service endpoints
```bash
kubectl get endpoints schema-validator-service
```

