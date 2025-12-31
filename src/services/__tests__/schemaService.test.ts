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

// Mock the repository
const mockRepositoryMethods = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findBySchemaIdAndVersion: jest.fn(),
  findActiveBySchemaId: jest.fn(),
  findAllVersionsBySchemaId: jest.fn(),
  findLatestBySchemaId: jest.fn(),
  setAllInactiveBySchemaId: jest.fn(),
  setVersionActive: jest.fn(),
  getNextVersion: jest.fn(),
  deleteAllVersionsBySchemaId: jest.fn(),
};

jest.mock('../../database/repositories/schemaRepository', () => {
  return {
    SchemaRepository: {
      getInstance: jest.fn(() => mockRepositoryMethods),
    },
  };
});

import { SchemaService } from '../schemaService';
import { Schema, JSONSchema } from '../../types';

describe('SchemaService', () => {
  const mockSchema: Schema = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchema', () => {
    it('should create a new schema with version 1 and active=true', async () => {
      const schemaData = {
        name: 'Test Schema',
        type: 'signal',
        description: 'Test Description',
        schema: {
          type: 'object',
          properties: { name: { type: 'string' } },
        } as JSONSchema,
      };

      mockRepositoryMethods.create.mockResolvedValue(mockSchema);

      const result = await SchemaService.createSchema(schemaData);

      expect(result).toBeDefined();
      expect(result.version).toBe(1);
      expect(result.active).toBe(true);
      expect(result.schemaId).toBeDefined();
      expect(mockRepositoryMethods.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: schemaData.name,
          version: 1,
          active: true,
        })
      );
    });

    it('should throw error for invalid JSON schema', async () => {
      const invalidSchemaData = {
        name: 'Test Schema',
        type: 'signal',
        schema: { type: 'invalid-type' } as JSONSchema,
      };

      await expect(SchemaService.createSchema(invalidSchemaData)).rejects.toThrow(
        'Invalid JSON Schema'
      );
    });
  });

  describe('getAllSchemas', () => {
    it('should return all schemas', async () => {
      const schemas = [mockSchema];
      mockRepositoryMethods.findAll.mockResolvedValue(schemas);

      const result = await SchemaService.getAllSchemas();

      expect(result).toEqual(schemas);
      expect(mockRepositoryMethods.findAll).toHaveBeenCalled();
    });
  });

  describe('getActiveSchemas', () => {
    it('should return only active schemas', async () => {
      const activeSchemas = [mockSchema];
      mockRepositoryMethods.findMany.mockResolvedValue(activeSchemas);

      const result = await SchemaService.getActiveSchemas();

      expect(result).toEqual(activeSchemas);
      expect(mockRepositoryMethods.findMany).toHaveBeenCalledWith({ active: true });
    });
  });

  describe('getActiveSchemaBySchemaId', () => {
    it('should return active schema by schemaId', async () => {
      (mockRepositoryMethods.findActiveBySchemaId as jest.Mock).mockResolvedValue(mockSchema);

      const result = await SchemaService.getActiveSchemaBySchemaId('test-schema-id');

      expect(result).toEqual(mockSchema);
      expect(mockRepositoryMethods.findActiveBySchemaId).toHaveBeenCalledWith('test-schema-id');
    });

    it('should return null if schema not found', async () => {
      (mockRepositoryMethods.findActiveBySchemaId as jest.Mock).mockResolvedValue(null);

      const result = await SchemaService.getActiveSchemaBySchemaId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getSchemaBySchemaIdAndVersion', () => {
    it('should return schema by schemaId and version', async () => {
      (mockRepositoryMethods.findBySchemaIdAndVersion as jest.Mock).mockResolvedValue(mockSchema);

      const result = await SchemaService.getSchemaBySchemaIdAndVersion('test-schema-id', 1);

      expect(result).toEqual(mockSchema);
      expect(mockRepositoryMethods.findBySchemaIdAndVersion).toHaveBeenCalledWith('test-schema-id', 1);
    });
  });

  describe('getAllVersionsBySchemaId', () => {
    it('should return all versions of a schema', async () => {
      const versions = [mockSchema, { ...mockSchema, version: 2, id: 'test-id-2' }];
      (mockRepositoryMethods.findAllVersionsBySchemaId as jest.Mock).mockResolvedValue(versions);

      const result = await SchemaService.getAllVersionsBySchemaId('test-schema-id');

      expect(result).toEqual(versions);
      expect(mockRepositoryMethods.findAllVersionsBySchemaId).toHaveBeenCalledWith('test-schema-id');
    });
  });

  describe('updateSchemaBySchemaId', () => {
    it('should create a new version when updating', async () => {
      const existingSchema = mockSchema;
      const newVersion = { ...mockSchema, version: 2, id: 'test-id-2' };

      (mockRepositoryMethods.findActiveBySchemaId as jest.Mock).mockResolvedValue(existingSchema);
      (mockRepositoryMethods.getNextVersion as jest.Mock).mockResolvedValue(2);
      (mockRepositoryMethods.setAllInactiveBySchemaId as jest.Mock).mockResolvedValue(undefined);
      (mockRepositoryMethods.create as jest.Mock).mockResolvedValue(newVersion);

      const updates = {
        name: 'Updated Name',
        schema: {
          type: 'object',
          properties: { name: { type: 'string' }, email: { type: 'string' } },
        } as JSONSchema,
      };

      const result = await SchemaService.updateSchemaBySchemaId('test-schema-id', updates);

      expect(result.version).toBe(2);
      expect(result.active).toBe(true);
      expect(mockRepositoryMethods.setAllInactiveBySchemaId).toHaveBeenCalledWith('test-schema-id');
      expect(mockRepositoryMethods.create).toHaveBeenCalled();
    });

    it('should throw error if schema not found', async () => {
      (mockRepositoryMethods.findActiveBySchemaId as jest.Mock).mockResolvedValue(null);

      await expect(
        SchemaService.updateSchemaBySchemaId('non-existent', { name: 'New Name' })
      ).rejects.toThrow('Schema with schemaId non-existent not found');
    });
  });

  describe('setActiveVersion', () => {
    it('should set a specific version as active', async () => {
      const version2 = { ...mockSchema, version: 2, id: 'test-id-2', active: true };
      (mockRepositoryMethods.setVersionActive as jest.Mock).mockResolvedValue(version2);

      const result = await SchemaService.setActiveVersion('test-schema-id', 2);

      expect(result).not.toBeNull();
      expect(result).toEqual(version2);
      if (result) {
        expect(result.active).toBe(true);
      }
      expect(mockRepositoryMethods.setVersionActive).toHaveBeenCalledWith('test-schema-id', 2);
    });
  });

  describe('validateData', () => {
    it('should validate data against active schema', async () => {
      mockRepositoryMethods.findActiveBySchemaId.mockResolvedValue(mockSchema);

      const validData = { name: 'John Doe' };
      const result = await SchemaService.validateData('test-schema-id', validData);

      expect(result.valid).toBe(true);
    });

    it('should return validation errors for invalid data', async () => {
      // Use a different schema ID to ensure we get a fresh validator (not cached from previous test)
      const invalidSchema = { 
        ...mockSchema, 
        id: 'test-id-invalid-2',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        },
      };
      mockRepositoryMethods.findActiveBySchemaId.mockResolvedValue(invalidSchema);

      const invalidData = {}; // Missing required 'name' field
      const result = await SchemaService.validateData('test-schema-id-2', invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should throw error if active schema not found', async () => {
      (mockRepositoryMethods.findActiveBySchemaId as jest.Mock).mockResolvedValue(null);

      await expect(SchemaService.validateData('non-existent', {})).rejects.toThrow(
        'Active schema with schemaId non-existent not found'
      );
    });
  });

  describe('validateDataByVersion', () => {
    it('should validate data against specific version', async () => {
      (mockRepositoryMethods.findBySchemaIdAndVersion as jest.Mock).mockResolvedValue(mockSchema);

      const validData = { name: 'John Doe' };
      const result = await SchemaService.validateDataByVersion('test-schema-id', 1, validData);

      expect(result.valid).toBe(true);
    });
  });

  describe('deleteSchema', () => {
    it('should delete a schema by document ID', async () => {
      (mockRepositoryMethods.findById as jest.Mock).mockResolvedValue(mockSchema);
      (mockRepositoryMethods.delete as jest.Mock).mockResolvedValue(true);

      const result = await SchemaService.deleteSchema('test-id-1');

      expect(result).toBe(true);
      expect(mockRepositoryMethods.delete).toHaveBeenCalledWith('test-id-1');
    });
  });

  describe('deleteAllVersionsBySchemaId', () => {
    it('should delete all versions of a schema', async () => {
      const versions = [mockSchema, { ...mockSchema, version: 2, id: 'test-id-2' }];
      (mockRepositoryMethods.findAllVersionsBySchemaId as jest.Mock).mockResolvedValue(versions);
      (mockRepositoryMethods.deleteAllVersionsBySchemaId as jest.Mock).mockResolvedValue(2);

      const result = await SchemaService.deleteAllVersionsBySchemaId('test-schema-id');

      expect(result).toBe(2);
      expect(mockRepositoryMethods.deleteAllVersionsBySchemaId).toHaveBeenCalledWith('test-schema-id');
    });
  });
});

