# Schema Validator

A full-stack application for managing JSON schemas and validating configuration objects. The project consists of:
- **Server**: Node.js Express API built with TypeScript
- **UI**: Vue.js frontend with Vite and Vuex

## Features

- **CRUD operations for JSON Schemas**: Create, read, update, and delete JSON schemas that conform to cross-language JSON Schema standards
- **Configuration Management**: Create configuration objects that must conform to their associated JSON schemas
- **Validation**: Automatic validation of configuration objects against their schemas
- **Schema Versioning**: Automatic versioning with ability to set any version as active
- **Type System**: Support for typed schemas and configurations (signal, post-processor, and extensible)
- **Preconfigured Data**: Load schemas and configurations from ConfigMap on startup (Kubernetes)
- **MongoDB Integration**: Persistent storage with a clean abstraction layer
- **TypeScript**: Full type safety throughout the application
- **AJV**: Uses AJV (Another JSON Schema Validator) for fast and reliable schema validation
- **Repository Pattern**: Clean separation of concerns with database abstraction

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Docker and Docker Compose (for local MongoDB) OR MongoDB (local installation or MongoDB Atlas account)

## Installation

1. Install root dependencies:
```bash
npm install
```

2. Install server dependencies:
```bash
cd server && npm install
```

3. Install UI dependencies:
```bash
cd ui && npm install
```

2. Set up MongoDB using Docker Compose (recommended for local development):
   ```bash
   # Start MongoDB and Mongo Express containers
   docker compose up -d
   
   # Check if containers are running
   docker compose ps
   
   # View MongoDB logs
   docker compose logs -f mongodb
   
   # View Mongo Express logs
   docker compose logs -f mongo-express
   
   # Stop containers
   docker compose down
   
   # Stop and remove volumes (clean slate)
   docker compose down -v
   ```

   **Mongo Express Web UI**: After starting the containers, access the MongoDB web interface at:
   - URL: http://localhost:8081
   - Username: `admin`
   - Password: `admin`
   
   You can browse databases, collections, and documents through the web interface.

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - For Docker Compose MongoDB (default - no authentication):
     ```
     MONGODB_URI=mongodb://localhost:27017
     MONGODB_DB_NAME=schema-validator
     PORT=3000
     ```
   - For MongoDB with authentication (if you enable it in docker-compose.yml):
     ```
     MONGODB_URI=mongodb://admin:password@localhost:27017
     MONGODB_DB_NAME=schema-validator
     PORT=3000
     ```
   - For MongoDB Atlas:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
     MONGODB_DB_NAME=schema-validator
     PORT=3000
     ```

4. Build the application:
```bash
# Build both server and UI
npm run build

# Or build individually
npm run build:server  # Build server only
npm run build:ui      # Build UI only
```

## Testing

The project includes comprehensive unit tests using Jest.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- `server/src/services/__tests__/` - Service layer unit tests
- `server/src/routes/__tests__/` - API route integration tests

Tests use mocks for database operations and external dependencies, ensuring fast and isolated test execution.

## Running the Application

### Development Mode

**Server (with auto-reload):**
```bash
npm run dev:server
# or
cd server && npm run dev
```

**UI (with hot module replacement):**
```bash
npm run dev:ui
# or
cd ui && npm run dev
```

The server will start on `http://localhost:3000` and the UI will start on `http://localhost:5173` (Vite default port).

### Production Mode
```bash
# Build both
npm run build

# Start server
npm start
# or
cd server && npm start
```

The UI build output will be in `ui/dist/` and can be served by any static file server or the Express server.

## API Testing

The project includes sample HTTP request files for easy API testing in the `http-examples/` folder:

- `http-examples/schemas.http` - Sample requests for schema CRUD operations and versioning
- `http-examples/configurations.http` - Sample requests for configuration CRUD operations

These files can be used with REST Client extensions in VS Code/Cursor or similar tools. Simply update the variables at the top of each file with your actual schema/configuration IDs.

## API Endpoints

### Schemas

#### GET /api/schemas
Get all schemas

**Response:**
```json
[
  {
    "id": "schema_123",
    "name": "User Schema",
    "description": "Schema for user objects",
    "schema": { ... },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/schemas/:id
Get a specific schema by ID

#### POST /api/schemas
Create a new schema

**Request Body:**
```json
{
  "name": "User Schema",
  "description": "Schema for user objects",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "number" },
      "email": { "type": "string", "format": "email" }
    },
    "required": ["name", "email"]
  }
}
```

#### PUT /api/schemas/:id
Update a schema

**Request Body:**
```json
{
  "name": "Updated Schema Name",
  "schema": { ... }
}
```

#### DELETE /api/schemas/:id
Delete a schema

#### POST /api/schemas/:id/validate
Validate data against a schema

**Request Body:**
```json
{
  "data": {
    "name": "John Doe",
    "age": 30,
    "email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "valid": true
}
```
or
```json
{
  "valid": false,
  "errors": ["root: must have required property 'email'"]
}
```

### Configurations

#### GET /api/configurations
Get all configurations (optionally filter by `?schemaId=xxx`)

#### GET /api/configurations/:id
Get a specific configuration by ID

#### POST /api/configurations
Create a new configuration (automatically validates against schema)

**Request Body:**
```json
{
  "schemaId": "schema_123",
  "name": "User Config",
  "data": {
    "name": "John Doe",
    "age": 30,
    "email": "john@example.com"
  }
}
```

#### PUT /api/configurations/:id
Update a configuration (validates on update)

#### DELETE /api/configurations/:id
Delete a configuration

#### POST /api/configurations/:id/validate
Re-validate a configuration against its schema

## Example Usage

### 1. Create a Schema
```bash
curl -X POST http://localhost:3000/api/schemas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Schema",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "price": { "type": "number", "minimum": 0 },
        "inStock": { "type": "boolean" }
      },
      "required": ["name", "price"]
    }
  }'
```

### 2. Create a Configuration
```bash
curl -X POST http://localhost:3000/api/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "schemaId": "schema_123",
    "name": "Laptop Product",
    "data": {
      "name": "MacBook Pro",
      "price": 1999.99,
      "inStock": true
    }
  }'
```

### 3. Validate Data
```bash
curl -X POST http://localhost:3000/api/schemas/schema_123/validate \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "iPhone",
      "price": 999
    }
  }'
```

## Docker Deployment

### Build Docker Image

```bash
# Build the image
docker build -t schema-validator:latest .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017 \
  -e MONGODB_DB_NAME=schema-validator \
  --name schema-validator \
  schema-validator:latest
```

### Using Docker Compose (with MongoDB)

```bash
# Start both MongoDB and the application
docker compose up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

## Kubernetes Deployment

See the [k8s/README.md](k8s/README.md) for detailed Kubernetes deployment instructions.

Quick deployment:

```bash
# Build and push image
docker build -t your-registry/schema-validator:latest .
docker push your-registry/schema-validator:latest

# Update image in deployment.yaml, then:
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

## Project Structure

```
schema-validator/
├── server/                       # Backend API
│   ├── src/
│   │   ├── index.ts             # Main application entry point
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript type definitions
│   │   ├── database/
│   │   │   ├── connection.ts   # MongoDB connection management
│   │   │   └── repositories/
│   │   │       ├── baseRepository.ts      # Base repository abstraction
│   │   │       ├── schemaRepository.ts    # Schema repository
│   │   │       └── configurationRepository.ts  # Configuration repository
│   │   ├── services/
│   │   │   ├── schemaService.ts    # Schema business logic
│   │   │   ├── configurationService.ts  # Configuration business logic
│   │   │   └── __tests__/          # Service unit tests
│   │   ├── routes/
│   │   │   ├── schemaRoutes.ts     # Schema API routes
│   │   │   ├── configurationRoutes.ts  # Configuration API routes
│   │   │   └── __tests__/          # Route integration tests
│   │   └── __tests__/
│   │       └── setup.ts            # Test setup and configuration
│   ├── dist/                      # Compiled JavaScript (generated)
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── ui/                            # Frontend Vue.js application
│   ├── src/
│   │   ├── main.js               # Vue app entry point
│   │   ├── App.vue               # Root component
│   │   ├── components/           # Vue components
│   │   │   ├── SchemasView.vue
│   │   │   └── ConfigurationsView.vue
│   │   ├── store/                # Vuex store
│   │   │   └── index.js
│   │   └── services/             # API service layer
│   │       └── api.js
│   ├── dist/                     # Built UI (generated)
│   ├── package.json
│   └── vite.config.js
├── k8s/                           # Kubernetes manifests
│   ├── deployment.yaml           # Deployment and Service
│   ├── configmap.yaml            # Configuration
│   ├── secret.yaml.example       # Secret template
│   ├── ingress.yaml              # Ingress configuration
│   └── README.md                 # K8s deployment guide
├── config/                        # Preconfigured schemas and configurations
├── http-examples/                 # HTTP request examples
│   ├── schemas.http              # Sample HTTP requests for schemas
│   └── configurations.http       # Sample HTTP requests for configurations
├── .env                           # Environment variables (create manually)
├── .dockerignore                  # Docker ignore file
├── docker-compose.yml             # Docker Compose configuration
├── Dockerfile                     # Multi-stage Dockerfile for production
├── package.json                   # Root package.json with workspace scripts
├── tsconfig.json                  # Base TypeScript config
├── jest.config.js                 # Root Jest config
└── README.md
```

## Database Architecture

The application uses a clean abstraction layer for database operations:

- **Connection Management**: Singleton pattern for MongoDB connection with automatic reconnection handling
- **Repository Pattern**: Base repository provides common CRUD operations, with specialized repositories for schemas and configurations
- **Type Safety**: Full TypeScript support with proper type conversions between MongoDB documents and application entities
- **Indexes**: Automatic index creation for optimized queries

### Repository Abstraction

The `BaseRepository` class provides:
- `findAll()` - Get all documents
- `findById(id)` - Get document by ID
- `create(data)` - Create new document
- `update(id, updates)` - Update existing document
- `delete(id)` - Delete document
- `findOne(filter)` - Find one document by filter
- `findMany(filter, options)` - Find multiple documents by filter

Specialized repositories extend this base class with domain-specific methods.

## Notes

- All schemas must conform to JSON Schema Draft 7 or later standards
- Configuration objects are automatically validated when created or updated
- The AJV validator supports all standard JSON Schema features including formats, references, and custom keywords
- Compiled validators are cached in memory for performance, while schemas and configurations are persisted in MongoDB
- The application handles graceful shutdown and closes database connections properly

## License

ISC

