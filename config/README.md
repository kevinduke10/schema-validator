# Configuration Files

This directory contains example configuration files for preloading schemas and configurations into the application.

## Directory Structure

The application supports two formats for loading preconfigured data:

### Option 1: Single JSON Files (Array Format)

- `schemas.json.example` - Array of all schemas
- `configurations.json.example` - Array of all configurations

**Use Case**: Good for small numbers of schemas/configurations or when you want everything in one place.

### Option 2: Type-Based Nested Folder Structure (Recommended)

- `schemas/` - Directory containing type-based subdirectories
  - `signal/` - All signal schemas
    - `temperature-signal.json`
    - `pressure-signal.json`
  - `post-processor/` - All post-processor schemas
    - `data-aggregator.json`
- `configurations/` - Directory containing type-based subdirectories
  - `signal/` - All signal configurations
    - `room-temperature.json`
    - `outdoor-temperature.json`
  - `post-processor/` - All post-processor configurations
    - `hourly-aggregator.json`

**Use Case**: Best for managing many schemas/configurations, organized by type, easier to version control, and simpler to update specific items. The application automatically detects and uses this structure.

## File Formats

### Schema File Format

Each schema file should contain either:
- A single schema object, OR
- An array of schema objects

**Schema Object**:
```json
{
  "name": "Schema Name",
  "type": "signal",
  "version": 1,
  "active": true,
  "schemaId": "optional-schema-id",
  "description": "Optional description",
  "schema": {
    "type": "object",
    "properties": { ... },
    "required": [ ... ]
  }
}
```

**Schema Fields**:
- `name` (required): Schema name
- `type` (required): Schema type (signal, post-processor)
- `version` (optional): Version number (defaults to 1)
- `active` (optional): Whether this version is active (defaults to true for version 1, false otherwise)
- `schemaId` (optional): Schema ID to group versions together (auto-generated if not provided)
- `description` (optional): Schema description
- `schema` (required): JSON Schema definition

### Configuration File Format

Each configuration file should contain either:
- A single configuration object, OR
- An array of configuration objects

**Configuration Object**:
```json
{
  "schemaName": "Schema Name",
  "type": "signal",
  "schemaVersion": 1,
  "name": "Configuration Name",
  "data": {
    ...
  }
}
```

**Configuration Fields**:
- `schemaName` (required): Name of the schema this configuration references
- `type` (required): Configuration type (must match schema type)
- `schemaVersion` (optional): Specific schema version to validate against (defaults to active version)
- `name` (required): Configuration name
- `data` (required): Configuration data that must conform to the schema

**Important**: The `schemaName` must match an existing schema's `name` field, and the `type` must match.

## Using with Kubernetes

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

Or manually create the ConfigMap YAML (see `k8s/preconfig-configmap-folder.yaml.example`).

### Creating ConfigMap from Single Files

```bash
# Create ConfigMap from single JSON files
kubectl create configmap schema-validator-preconfig \
  --from-file=config/schemas.json.example \
  --from-file=config/configurations.json.example \
  --dry-run=client -o yaml > k8s/preconfig-configmap.yaml
```

## Best Practices

1. **Use type-based nested folder structure** when you have more than 3-4 schemas/configurations
2. **Organize by type** - Keep signal and post-processor items in their respective subdirectories
3. **Name files descriptively** - use kebab-case (e.g., `temperature-signal.json`)
4. **Keep schemas and configurations separate** - easier to manage and update
5. **Version control** - commit these files to your repository for consistency across environments
6. **Test locally** - Mount the config directory locally to test before deploying

## Directory Structure

The recommended structure is:

```
config/
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

This structure is automatically detected by the application and provides the best organization for managing multiple schemas and configurations by type.

## Local Testing

To test locally, you can mount the config directory:

```bash
# Using Docker
docker run -v $(pwd)/config:/etc/app-config schema-validator:latest

# Using Docker Compose (add to docker-compose.yml)
volumes:
  - ./config:/etc/app-config:ro
```

