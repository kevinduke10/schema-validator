import { Configuration } from '../types';
import { SchemaService } from './schemaService';
import { SchemaRepository } from '../database/repositories/schemaRepository';
import { ConfigurationRepository } from '../database/repositories/configurationRepository';
import { NotificationService } from './notificationService';

// Lazy getter for repository instance (initialized after DB connection)
const getConfigurationRepository = () => ConfigurationRepository.getInstance();
const getSchemaRepository = () => SchemaRepository.getInstance();

export class ConfigurationService {
  /**
   * Create a new configuration object (validates against active schema version)
   */
  static async createConfiguration(configData: Omit<Configuration, 'id' | 'createdAt' | 'updatedAt'>): Promise<Configuration> {
    // configData.schemaId now contains the schema's unique id (not schemaId that groups versions)
    const schemaId = configData.schemaId;
    
    // Find the schema by its unique id
    const schema = await getSchemaRepository().findById(schemaId);
    if (!schema) {
      throw new Error(`Schema with id ${schemaId} not found`);
    }

    // Check for duplicate name (case-insensitive) with same schema id
    const existingByName = await getConfigurationRepository().findByNameAndSchemaId(configData.name, schemaId);
    if (existingByName) {
      throw new Error(`Configuration with name '${configData.name}' for schema '${schema.name}' already exists`);
    }

    // Validate that configuration type matches schema type
    if (configData.type !== schema.type) {
      throw new Error(`Configuration type '${configData.type}' does not match schema type '${schema.type}'`);
    }

    // Validate data against the specific schema version
    const validation = await SchemaService.validateDataByVersion(schema.schemaId, schema.version, configData.data);
    if (!validation.valid) {
      throw new Error(`Configuration data does not conform to schema: ${validation.errors?.join(', ')}`);
    }

    // Save to database (schemaId field stores the schema's unique id)
    const configuration = await getConfigurationRepository().create(configData);
    
    // Publish notification
    await NotificationService.notifyConfigurationCreated(configuration);
    
    return configuration;
  }

  /**
   * Get all configurations
   */
  static async getAllConfigurations(): Promise<Configuration[]> {
    return await getConfigurationRepository().findAll();
  }

  /**
   * Get configurations by schema ID (schema's unique id, not schemaId that groups versions)
   */
  static async getConfigurationsBySchemaId(schemaId: string): Promise<Configuration[]> {
    return await getConfigurationRepository().findBySchemaId(schemaId);
  }

  /**
   * Get configurations by schema's schemaId (the id that groups versions together)
   */
  static async getConfigurationsBySchemaSchemaId(schemaSchemaId: string): Promise<Configuration[]> {
    // Find all schemas with this schemaId
    const schemas = await SchemaService.getAllVersionsBySchemaId(schemaSchemaId);
    const schemaIds = schemas.map(s => s.id);
    // Find all configurations that reference any of these schema ids
    const allConfigs = await getConfigurationRepository().findAll();
    return allConfigs.filter(config => schemaIds.includes(config.schemaId));
  }

  /**
   * Get configurations by type
   */
  static async getConfigurationsByType(type: string): Promise<Configuration[]> {
    return await getConfigurationRepository().findByType(type);
  }

  /**
   * Get configurations by schema ID and type
   */
  static async getConfigurationsBySchemaIdAndType(schemaId: string, type: string): Promise<Configuration[]> {
    return await getConfigurationRepository().findBySchemaIdAndType(schemaId, type);
  }

  /**
   * Get configuration by ID
   */
  static async getConfigurationById(id: string): Promise<Configuration | null> {
    return await getConfigurationRepository().findById(id);
  }

  /**
   * Update a configuration
   */
  static async updateConfiguration(id: string, updates: Partial<Omit<Configuration, 'id' | 'createdAt'>>): Promise<Configuration | null> {
    const existing = await getConfigurationRepository().findById(id);
    if (!existing) {
      return null;
    }

    // Validate that name matches if provided (name cannot be updated)
    if (updates.name !== undefined && updates.name !== existing.name) {
      throw new Error('Configuration name cannot be updated. Name is used for uniqueness checks.');
    }

    // Validate that type matches if provided (type cannot be updated)
    if (updates.type !== undefined && updates.type !== existing.type) {
      throw new Error('Configuration type cannot be updated. Type is used for uniqueness checks.');
    }

    // Get the schema to validate against (existing.schemaId contains the schema's unique id)
    let validationSchema = await getSchemaRepository().findById(existing.schemaId);
    if (!validationSchema) {
      throw new Error(`Schema with id ${existing.schemaId} not found`);
    }

    // If schemaId is being updated, validate the new schema exists
    // updates.schemaId now contains the new schema's unique id
    if (updates.schemaId !== undefined && updates.schemaId !== existing.schemaId) {
      const newSchema = await getSchemaRepository().findById(updates.schemaId);
      if (!newSchema) {
        throw new Error(`Schema with id ${updates.schemaId} not found`);
      }
      
      // Validate that configuration type matches the new schema type
      if (existing.type !== newSchema.type) {
        throw new Error(`Configuration type '${existing.type}' does not match new schema type '${newSchema.type}'`);
      }
      
      validationSchema = newSchema;
    }

    // If data is being updated, validate against the schema
    if (updates.data !== undefined) {
      const validation = await SchemaService.validateDataByVersion(
        validationSchema.schemaId, 
        validationSchema.version, 
        updates.data
      );
      if (!validation.valid) {
        throw new Error(`Configuration data does not conform to schema: ${validation.errors?.join(', ')}`);
      }
    } else if (updates.schemaId !== undefined && updates.schemaId !== existing.schemaId) {
      // If only schemaId is being updated, validate existing data against new schema
      const validation = await SchemaService.validateDataByVersion(
        validationSchema.schemaId,
        validationSchema.version,
        existing.data
      );
      if (!validation.valid) {
        throw new Error(`Configuration data does not conform to new schema: ${validation.errors?.join(', ')}`);
      }
    }

    const updated = await getConfigurationRepository().update(id, updates);
    
    // Publish notification if update was successful
    if (updated) {
      await NotificationService.notifyConfigurationUpdated(updated);
    }
    
    return updated;
  }

  /**
   * Delete a configuration
   */
  static async deleteConfiguration(id: string): Promise<boolean> {
    const deleted = await getConfigurationRepository().delete(id);
    
    // Publish notification if deletion was successful
    if (deleted) {
      await NotificationService.notifyConfigurationDeleted(id);
    }
    
    return deleted;
  }

  /**
   * Delete all configurations
   * Returns count of deleted configurations
   */
  static async deleteAllConfigurations(): Promise<number> {
    const allConfigs = await this.getAllConfigurations();
    let deleted = 0;

    for (const config of allConfigs) {
      const result = await getConfigurationRepository().delete(config.id);
      if (result) {
        deleted++;
        // Publish notification for each deleted configuration
        await NotificationService.notifyConfigurationDeleted(config.id);
      }
    }

    return deleted;
  }

  /**
   * Validate a configuration object against its schema
   */
  static async validateConfiguration(id: string): Promise<{ valid: boolean; errors?: string[] }> {
    const configuration = await getConfigurationRepository().findById(id);
    if (!configuration) {
      throw new Error(`Configuration with id ${id} not found`);
    }

    return await SchemaService.validateData(configuration.schemaId, configuration.data);
  }
}

