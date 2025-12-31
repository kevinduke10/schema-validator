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

// Mock the configuration repository
const mockConfigRepositoryMethods = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findBySchemaId: jest.fn(),
};

jest.mock('../../database/repositories/configurationRepository', () => {
  return {
    ConfigurationRepository: {
      getInstance: jest.fn(() => mockConfigRepositoryMethods),
    },
  };
});

// Mock the schema service
const mockSchemaServiceMethods = {
  getActiveSchemaBySchemaId: jest.fn(),
  validateData: jest.fn(),
};

jest.mock('../schemaService', () => {
  return {
    SchemaService: mockSchemaServiceMethods,
  };
});

import { ConfigurationService } from '../configurationService';
import { SchemaService } from '../schemaService';
import { Configuration, Schema } from '../../types';

describe('ConfigurationService', () => {

  const mockSchema: Schema = {
    id: 'schema-doc-id',
    schemaId: 'test-schema-id',
    version: 1,
    active: true,
    type: 'signal',
    name: 'Test Schema',
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
    jest.clearAllMocks();
  });

  describe('createConfiguration', () => {
    it('should create a configuration when data is valid', async () => {
      const configData = {
        schemaId: 'test-schema-id',
        type: 'signal',
        name: 'Test Config',
        data: { name: 'John Doe', age: 30 },
      };

      mockSchemaServiceMethods.getActiveSchemaBySchemaId.mockResolvedValue(mockSchema);
      mockSchemaServiceMethods.validateData.mockResolvedValue({ valid: true });
      mockConfigRepositoryMethods.create.mockResolvedValue(mockConfiguration);

      const result = await ConfigurationService.createConfiguration(configData);

      expect(result).toEqual(mockConfiguration);
      expect(mockSchemaServiceMethods.getActiveSchemaBySchemaId).toHaveBeenCalledWith('test-schema-id');
      expect(mockSchemaServiceMethods.validateData).toHaveBeenCalledWith('test-schema-id', configData.data);
      expect(mockConfigRepositoryMethods.create).toHaveBeenCalledWith(configData);
    });

    it('should throw error if active schema not found', async () => {
      mockSchemaServiceMethods.getActiveSchemaBySchemaId.mockResolvedValue(null);

      await expect(
        ConfigurationService.createConfiguration({
          schemaId: 'non-existent',
          type: 'signal',
          name: 'Test',
          data: {},
        })
      ).rejects.toThrow('Active schema with schemaId non-existent not found');
    });

    it('should throw error if data does not conform to schema', async () => {
      const configData = {
        schemaId: 'test-schema-id',
        type: 'signal',
        name: 'Test Config',
        data: {}, // Missing required 'name' field
      };

      mockSchemaServiceMethods.getActiveSchemaBySchemaId.mockResolvedValue(mockSchema);
      mockSchemaServiceMethods.validateData.mockResolvedValue({
        valid: false,
        errors: ['root: must have required property \'name\''],
      });

      await expect(ConfigurationService.createConfiguration(configData)).rejects.toThrow(
        'Configuration data does not conform to schema'
      );
    });
  });

  describe('getAllConfigurations', () => {
    it('should return all configurations', async () => {
      const configs = [mockConfiguration];
      (mockConfigRepositoryMethods.findAll as jest.Mock).mockResolvedValue(configs);

      const result = await ConfigurationService.getAllConfigurations();

      expect(result).toEqual(configs);
      expect(mockConfigRepositoryMethods.findAll).toHaveBeenCalled();
    });
  });

  describe('getConfigurationsBySchemaId', () => {
    it('should return configurations for a schema', async () => {
      const configs = [mockConfiguration];
      (mockConfigRepositoryMethods.findBySchemaId as jest.Mock).mockResolvedValue(configs);

      const result = await ConfigurationService.getConfigurationsBySchemaId('test-schema-id');

      expect(result).toEqual(configs);
      expect(mockConfigRepositoryMethods.findBySchemaId).toHaveBeenCalledWith('test-schema-id');
    });
  });

  describe('getConfigurationById', () => {
    it('should return configuration by ID', async () => {
      (mockConfigRepositoryMethods.findById as jest.Mock).mockResolvedValue(mockConfiguration);

      const result = await ConfigurationService.getConfigurationById('config-id-1');

      expect(result).toEqual(mockConfiguration);
      expect(mockConfigRepositoryMethods.findById).toHaveBeenCalledWith('config-id-1');
    });

    it('should return null if not found', async () => {
      (mockConfigRepositoryMethods.findById as jest.Mock).mockResolvedValue(null);

      const result = await ConfigurationService.getConfigurationById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration when data is valid', async () => {
      const updatedConfig = { ...mockConfiguration, name: 'Updated Name' };
      (mockConfigRepositoryMethods.findById as jest.Mock).mockResolvedValue(mockConfiguration);
      (mockSchemaServiceMethods.validateData as jest.Mock).mockResolvedValue({ valid: true });
      (mockConfigRepositoryMethods.update as jest.Mock).mockResolvedValue(updatedConfig);

      const result = await ConfigurationService.updateConfiguration('config-id-1', {
        name: 'Updated Name',
      });

      expect(result).toEqual(updatedConfig);
      expect(mockConfigRepositoryMethods.update).toHaveBeenCalled();
    });

    it('should validate data when updating', async () => {
      const newData = { name: 'Jane Doe', age: 25 };
      (mockConfigRepositoryMethods.findById as jest.Mock).mockResolvedValue(mockConfiguration);
      (mockSchemaServiceMethods.validateData as jest.Mock).mockResolvedValue({ valid: true });
      (mockConfigRepositoryMethods.update as jest.Mock).mockResolvedValue({
        ...mockConfiguration,
        data: newData,
      });

      await ConfigurationService.updateConfiguration('config-id-1', { data: newData });

      expect(mockSchemaServiceMethods.validateData).toHaveBeenCalledWith('test-schema-id', newData);
    });

    it('should throw error if data does not conform to schema', async () => {
      (mockConfigRepositoryMethods.findById as jest.Mock).mockResolvedValue(mockConfiguration);
      (mockSchemaServiceMethods.validateData as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['root: must have required property \'name\''],
      });

      await expect(
        ConfigurationService.updateConfiguration('config-id-1', { data: {} })
      ).rejects.toThrow('Configuration data does not conform to schema');
    });

    it('should return null if configuration not found', async () => {
      (mockConfigRepositoryMethods.findById as jest.Mock).mockResolvedValue(null);

      const result = await ConfigurationService.updateConfiguration('non-existent', {
        name: 'New Name',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteConfiguration', () => {
    it('should delete a configuration', async () => {
      (mockConfigRepositoryMethods.delete as jest.Mock).mockResolvedValue(true);

      const result = await ConfigurationService.deleteConfiguration('config-id-1');

      expect(result).toBe(true);
      expect(mockConfigRepositoryMethods.delete).toHaveBeenCalledWith('config-id-1');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate a configuration against its schema', async () => {
      (mockConfigRepositoryMethods.findById as jest.Mock).mockResolvedValue(mockConfiguration);
      (mockSchemaServiceMethods.validateData as jest.Mock).mockResolvedValue({ valid: true });

      const result = await ConfigurationService.validateConfiguration('config-id-1');

      expect(result.valid).toBe(true);
      expect(mockSchemaServiceMethods.validateData).toHaveBeenCalledWith('test-schema-id', mockConfiguration.data);
    });

    it('should throw error if configuration not found', async () => {
      (mockConfigRepositoryMethods.findById as jest.Mock).mockResolvedValue(null);

      await expect(ConfigurationService.validateConfiguration('non-existent')).rejects.toThrow(
        'Configuration with id non-existent not found'
      );
    });
  });
});

