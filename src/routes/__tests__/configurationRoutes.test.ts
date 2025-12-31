import { Configuration } from '../../types';

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
jest.mock('../../services/configurationService');

import request from 'supertest';
import express, { Express } from 'express';
import configurationRoutes from '../configurationRoutes';
import { ConfigurationService } from '../../services/configurationService';

describe('Configuration Routes', () => {
  let app: Express;

  const mockConfiguration: Configuration = {
    id: 'config-id-1',
    schemaId: 'test-schema-id',
    type: 'signal',
    name: 'Test Config',
    data: { name: 'John Doe', age: 30 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/configurations', configurationRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/configurations', () => {
    it('should return all configurations', async () => {
      (ConfigurationService.getAllConfigurations as jest.Mock).mockResolvedValue([
        mockConfiguration,
      ]);

      const response = await request(app).get('/api/configurations');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: mockConfiguration.id,
        schemaId: mockConfiguration.schemaId,
        name: mockConfiguration.name,
        data: mockConfiguration.data,
      });
    });

    it('should filter by schemaId when query param is provided', async () => {
      (ConfigurationService.getConfigurationsBySchemaId as jest.Mock).mockResolvedValue([
        mockConfiguration,
      ]);

      const response = await request(app).get('/api/configurations?schemaId=test-schema-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: mockConfiguration.id,
        schemaId: mockConfiguration.schemaId,
        name: mockConfiguration.name,
        data: mockConfiguration.data,
      });
      expect(ConfigurationService.getConfigurationsBySchemaId).toHaveBeenCalledWith(
        'test-schema-id'
      );
    });
  });

  describe('GET /api/configurations/:id', () => {
    it('should return configuration by ID', async () => {
      (ConfigurationService.getConfigurationById as jest.Mock).mockResolvedValue(mockConfiguration);

      const response = await request(app).get('/api/configurations/config-id-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockConfiguration.id,
        schemaId: mockConfiguration.schemaId,
        name: mockConfiguration.name,
        data: mockConfiguration.data,
      });
    });

    it('should return 404 if configuration not found', async () => {
      (ConfigurationService.getConfigurationById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/configurations/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Configuration not found');
    });
  });

  describe('POST /api/configurations', () => {
    it('should create a new configuration', async () => {
      (ConfigurationService.createConfiguration as jest.Mock).mockResolvedValue(mockConfiguration);

      const response = await request(app)
        .post('/api/configurations')
              .send({
                schemaId: 'test-schema-id',
                type: 'signal',
                name: 'Test Config',
                data: { name: 'John Doe', age: 30 },
              });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockConfiguration.id,
        schemaId: mockConfiguration.schemaId,
        name: mockConfiguration.name,
        data: mockConfiguration.data,
      });
    });

    it('should return 400 if schemaId is missing', async () => {
      const response = await request(app)
        .post('/api/configurations')
        .send({
          name: 'Test Config',
          data: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('SchemaId, type, name, and data are required');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/configurations')
        .send({
          schemaId: 'test-schema-id',
          type: 'signal',
          data: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('SchemaId, type, name, and data are required');
    });

    it('should return 400 if data is missing', async () => {
      const response = await request(app)
        .post('/api/configurations')
        .send({
          schemaId: 'test-schema-id',
          type: 'signal',
          name: 'Test Config',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('SchemaId, type, name, and data are required');
    });

    it('should return 400 on validation error', async () => {
      (ConfigurationService.createConfiguration as jest.Mock).mockRejectedValue(
        new Error('Configuration data does not conform to schema')
      );

      const response = await request(app)
        .post('/api/configurations')
        .send({
          schemaId: 'test-schema-id',
          type: 'signal',
          name: 'Test Config',
          data: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Configuration data does not conform to schema');
    });
  });

  describe('PUT /api/configurations/:id', () => {
    it('should update a configuration', async () => {
      const updated = { ...mockConfiguration, name: 'Updated Name' };
      (ConfigurationService.updateConfiguration as jest.Mock).mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/configurations/config-id-1')
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: updated.id,
        name: updated.name,
        schemaId: updated.schemaId,
        data: updated.data,
      });
    });

    it('should return 404 if configuration not found', async () => {
      (ConfigurationService.updateConfiguration as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/api/configurations/non-existent')
        .send({
          name: 'New Name',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Configuration not found');
    });

    it('should return 400 on validation error', async () => {
      (ConfigurationService.updateConfiguration as jest.Mock).mockRejectedValue(
        new Error('Configuration data does not conform to schema')
      );

      const response = await request(app)
        .put('/api/configurations/config-id-1')
        .send({
          data: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Configuration data does not conform to schema');
    });
  });

  describe('DELETE /api/configurations/:id', () => {
    it('should delete a configuration', async () => {
      (ConfigurationService.deleteConfiguration as jest.Mock).mockResolvedValue(true);

      const response = await request(app).delete('/api/configurations/config-id-1');

      expect(response.status).toBe(204);
    });

    it('should return 404 if configuration not found', async () => {
      (ConfigurationService.deleteConfiguration as jest.Mock).mockResolvedValue(false);

      const response = await request(app).delete('/api/configurations/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Configuration not found');
    });
  });

  describe('POST /api/configurations/:id/validate', () => {
    it('should validate a configuration', async () => {
      (ConfigurationService.validateConfiguration as jest.Mock).mockResolvedValue({
        valid: true,
      });

      const response = await request(app).post('/api/configurations/config-id-1/validate');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should return validation errors if invalid', async () => {
      (ConfigurationService.validateConfiguration as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['root: must have required property \'name\''],
      });

      const response = await request(app).post('/api/configurations/config-id-1/validate');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 if configuration not found', async () => {
      (ConfigurationService.validateConfiguration as jest.Mock).mockRejectedValue(
        new Error('Configuration with id config-id-1 not found')
      );

      const response = await request(app).post('/api/configurations/config-id-1/validate');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Configuration with id config-id-1 not found');
    });
  });
});

