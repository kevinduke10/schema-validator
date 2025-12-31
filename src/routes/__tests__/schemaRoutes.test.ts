import { Schema } from '../../types';

// Mock database connection first
jest.mock('../../database/connection', () => {
  const mockDb = {
    collection: jest.fn(() => ({
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([]),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      })),
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
      findOneAndUpdate: jest.fn().mockResolvedValue(null),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      createIndex: jest.fn().mockResolvedValue(undefined),
    })),
  };

  return {
    dbConnection: {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getDb: jest.fn().mockReturnValue(mockDb),
      isConnected: jest.fn().mockReturnValue(true),
    },
  };
});

// Mock the service
jest.mock('../../services/schemaService');

import request from 'supertest';
import express, { Express } from 'express';
import schemaRoutes from '../schemaRoutes';
import { SchemaService } from '../../services/schemaService';

describe('Schema Routes', () => {
  let app: Express;

  // Helper to create mock schema with serialized dates (as they appear in JSON responses)
  const createMockSchema = (overrides: Partial<Schema> = {}): Schema => {
    const base: Schema = {
      id: 'test-id-1',
      schemaId: 'test-schema-id',
      version: 1,
      active: true,
      type: 'signal',
      name: 'Test Schema',
      description: 'Test Description',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return { ...base, ...overrides };
  };

  const mockSchema = createMockSchema();

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/schemas', schemaRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/schemas', () => {
    it('should return all schemas', async () => {
      (SchemaService.getAllSchemas as jest.Mock).mockResolvedValue([mockSchema]);

      const response = await request(app).get('/api/schemas');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: mockSchema.id,
        schemaId: mockSchema.schemaId,
        version: mockSchema.version,
        active: mockSchema.active,
        name: mockSchema.name,
      });
    });

    it('should return only active schemas when query param is set', async () => {
      (SchemaService.getActiveSchemas as jest.Mock).mockResolvedValue([mockSchema]);

      const response = await request(app).get('/api/schemas?active=true');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: mockSchema.id,
        schemaId: mockSchema.schemaId,
        version: mockSchema.version,
        active: mockSchema.active,
        name: mockSchema.name,
      });
      expect(SchemaService.getActiveSchemas).toHaveBeenCalled();
    });
  });

  describe('GET /api/schemas/:schemaId', () => {
    it('should return active schema by schemaId', async () => {
      (SchemaService.getActiveSchemaBySchemaId as jest.Mock).mockResolvedValue(mockSchema);

      const response = await request(app).get('/api/schemas/test-schema-id');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockSchema.id,
        schemaId: mockSchema.schemaId,
        version: mockSchema.version,
        active: mockSchema.active,
        name: mockSchema.name,
      });
    });

    it('should return 404 if schema not found', async () => {
      (SchemaService.getActiveSchemaBySchemaId as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/schemas/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Active schema not found');
    });
  });

  describe('GET /api/schemas/:schemaId/versions', () => {
    it('should return all versions of a schema', async () => {
      const versions = [mockSchema, createMockSchema({ version: 2, id: 'test-id-2' })];
      (SchemaService.getAllVersionsBySchemaId as jest.Mock).mockResolvedValue(versions);

      const response = await request(app).get('/api/schemas/test-schema-id/versions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({ id: mockSchema.id, version: 1 });
      expect(response.body[1]).toMatchObject({ id: 'test-id-2', version: 2 });
    });
  });

  describe('GET /api/schemas/:schemaId/versions/:version', () => {
    it('should return specific version', async () => {
      (SchemaService.getSchemaBySchemaIdAndVersion as jest.Mock).mockResolvedValue(mockSchema);

      const response = await request(app).get('/api/schemas/test-schema-id/versions/1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockSchema.id,
        schemaId: mockSchema.schemaId,
        version: mockSchema.version,
        active: mockSchema.active,
        name: mockSchema.name,
      });
    });

    it('should return 400 for invalid version number', async () => {
      const response = await request(app).get('/api/schemas/test-schema-id/versions/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid version number');
    });

    it('should return 404 if version not found', async () => {
      (SchemaService.getSchemaBySchemaIdAndVersion as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/schemas/test-schema-id/versions/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Schema version not found');
    });
  });

  describe('POST /api/schemas', () => {
    it('should create a new schema', async () => {
      (SchemaService.createSchema as jest.Mock).mockResolvedValue(mockSchema);

      const response = await request(app)
        .post('/api/schemas')
              .send({
                name: 'Test Schema',
                type: 'signal',
                description: 'Test Description',
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string' } },
                },
              });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockSchema.id,
        schemaId: mockSchema.schemaId,
        version: mockSchema.version,
        active: mockSchema.active,
        name: mockSchema.name,
      });
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/schemas')
        .send({
          schema: { type: 'object' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name, type, and schema are required');
    });

    it('should return 400 if schema is missing', async () => {
      const response = await request(app)
        .post('/api/schemas')
        .send({
          name: 'Test Schema',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name, type, and schema are required');
    });
  });

  describe('PUT /api/schemas/:schemaId', () => {
    it('should update schema and create new version', async () => {
      const newVersion = createMockSchema({ version: 2, id: 'test-id-2' });
      (SchemaService.updateSchemaBySchemaId as jest.Mock).mockResolvedValue(newVersion);

      const response = await request(app)
        .put('/api/schemas/test-schema-id')
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: newVersion.id,
        version: newVersion.version,
      });
    });

    it('should return 400 on validation error', async () => {
      (SchemaService.updateSchemaBySchemaId as jest.Mock).mockRejectedValue(
        new Error('Invalid JSON Schema')
      );

      const response = await request(app)
        .put('/api/schemas/test-schema-id')
        .send({
          schema: { type: 'invalid' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid JSON Schema');
    });
  });

  describe('PUT /api/schemas/:schemaId/active', () => {
    it('should set a version as active', async () => {
      const activatedVersion = createMockSchema({ version: 2, active: true });
      (SchemaService.setActiveVersion as jest.Mock).mockResolvedValue(activatedVersion);

      const response = await request(app)
        .put('/api/schemas/test-schema-id/active')
        .send({ version: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: activatedVersion.id,
        version: activatedVersion.version,
        active: activatedVersion.active,
      });
    });

    it('should return 400 if version is missing', async () => {
      const response = await request(app)
        .put('/api/schemas/test-schema-id/active')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Version number is required');
    });

    it('should return 404 if version not found', async () => {
      (SchemaService.setActiveVersion as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/api/schemas/test-schema-id/active')
        .send({ version: 999 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Schema version not found');
    });
  });

  describe('DELETE /api/schemas/:schemaId', () => {
    it('should delete all versions of a schema', async () => {
      (SchemaService.deleteAllVersionsBySchemaId as jest.Mock).mockResolvedValue(3);

      const response = await request(app).delete('/api/schemas/test-schema-id');

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(3);
    });

    it('should return 404 if schema not found', async () => {
      (SchemaService.deleteAllVersionsBySchemaId as jest.Mock).mockResolvedValue(0);

      const response = await request(app).delete('/api/schemas/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Schema not found');
    });
  });

  describe('POST /api/schemas/:schemaId/validate', () => {
    it('should validate data against active schema', async () => {
      (SchemaService.validateData as jest.Mock).mockResolvedValue({ valid: true });

      const response = await request(app)
        .post('/api/schemas/test-schema-id/validate')
        .send({
          data: { name: 'John Doe' },
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should return validation errors for invalid data', async () => {
      (SchemaService.validateData as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['root: must have required property \'name\''],
      });

      const response = await request(app)
        .post('/api/schemas/test-schema-id/validate')
        .send({
          data: {},
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 if data is missing', async () => {
      const response = await request(app)
        .post('/api/schemas/test-schema-id/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Data is required');
    });
  });

  describe('POST /api/schemas/:schemaId/versions/:version/validate', () => {
    it('should validate data against specific version', async () => {
      (SchemaService.validateDataByVersion as jest.Mock).mockResolvedValue({ valid: true });

      const response = await request(app)
        .post('/api/schemas/test-schema-id/versions/1/validate')
        .send({
          data: { name: 'John Doe' },
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should return 400 for invalid version number', async () => {
      const response = await request(app)
        .post('/api/schemas/test-schema-id/versions/invalid/validate')
        .send({ data: {} });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid version number');
    });
  });
});

