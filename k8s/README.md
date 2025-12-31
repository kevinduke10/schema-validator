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

#### Option 2: Type-Based Nested Folder Structure (Recommended for Multiple Items)

**Directory Structure**:
```
/etc/app-config/
├── schemas/
│   ├── signal/
│   │   ├── temperature-signal.json
│   │   └── pressure-signal.json
│   └── post-processor/
│       └── data-aggregator.json
└── configurations/
    ├── signal/
    │   ├── room-temperature.json
    │   └── outdoor-temperature.json
    └── post-processor/
        └── hourly-aggregator.json
```

**Individual Schema File** (`schemas/signal/temperature-signal.json`):
```json
{
  "name": "Temperature Signal Schema",
  "type": "signal",
  "version": 1,
  "active": true,
  "schemaId": "optional-schema-id",
  "description": "Schema for temperature signal data",
  "schema": { ... }
}
```

**Schema Version Fields**:
- `version` (optional): Version number (defaults to 1)
- `active` (optional): Whether this version is active (defaults to true for version 1, false otherwise)
- `schemaId` (optional): Schema ID to group versions together (auto-generated if not provided)

**Individual Configuration File** (`configurations/signal/room-temperature.json`):
```json
{
  "schemaName": "Temperature Signal Schema",
  "type": "signal",
  "schemaVersion": 1,
  "name": "Room Temperature Sensor",
  "data": { ... }
}
```

**Configuration Version Fields**:
- `schemaVersion` (optional): Specific schema version to validate against (defaults to active version)

**Important Notes**:
- Configurations reference schemas by `schemaName` and `type`
- If `schemaVersion` is specified in a configuration, it validates against that specific version
- If `schemaVersion` is not specified, the configuration validates against the active schema version
- Schemas can specify `version` and `active` status when preloading
- Multiple versions of the same schema can be preloaded by using the same `schemaId` or `name`+`type`
- Both formats are optional - you can have just schemas, just configurations, or both
- Type-based nested folder structure is preferred when you have many schemas/configurations
- The application automatically detects type-based subdirectories (signal/, post-processor/, etc.)
- Falls back to flat folder structure if no type subdirectories are found
- Each file can contain a single object OR an array of objects

### Example Files

- **Single File Format**: See `config/schemas.json.example` and `config/configurations.json.example`
- **Folder Format**: See `config/schemas/` and `config/configurations/` directories
- **Kubernetes ConfigMap Examples**:
  - `k8s/preconfig-configmap.yaml.example` - Single file format
  - `k8s/preconfig-configmap-folder.yaml.example` - Folder structure format (recommended)

### Creating ConfigMap from Type-Based Folder Structure

If you have a type-based folder structure locally, you can create a ConfigMap from it:

```bash
# Create ConfigMap from config directory (includes type subdirectories)
kubectl create configmap schema-validator-preconfig \
  --from-file=config/schemas \
  --from-file=config/configurations \
  --dry-run=client -o yaml > k8s/preconfig-configmap.yaml
```

This will automatically include all files in the type subdirectories (signal/, post-processor/, etc.).

## Configuration

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

