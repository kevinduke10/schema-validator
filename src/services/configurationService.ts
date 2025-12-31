import { Configuration } from '../types';
import { SchemaService } from './schemaService';
import { ConfigurationRepository } from '../database/repositories/configurationRepository';
import { NotificationService } from './notificationService';

// Lazy getter for repository instance (initialized after DB connection)
const getConfigurationRepository = () => ConfigurationRepository.getInstance();

export class ConfigurationService {
  /**
   * Create a new configuration object (validates against active schema version)
   */
  static async createConfiguration(configData: Omit<Configuration, 'id' | 'createdAt' | 'updatedAt'>): Promise<Configuration> {
    // Check for duplicate name (case-insensitive) with same schemaId
    const existingByName = await getConfigurationRepository().findByNameAndSchemaId(configData.name, configData.schemaId);
    if (existingByName) {
      throw new Error(`Configuration with name '${configData.name}' for schema '${configData.schemaId}' already exists`);
    }

    // Validate that the active schema exists
    const schema = await SchemaService.getActiveSchemaBySchemaId(configData.schemaId);
    if (!schema) {
      throw new Error(`Active schema with schemaId ${configData.schemaId} not found`);
    }

    // Validate that configuration type matches schema type
    if (configData.type !== schema.type) {
      throw new Error(`Configuration type '${configData.type}' does not match schema type '${schema.type}'`);
    }

    // Validate data against the active schema
    const validation = await SchemaService.validateData(configData.schemaId, configData.data);
    if (!validation.valid) {
      throw new Error(`Configuration data does not conform to schema: ${validation.errors?.join(', ')}`);
    }

    // Save to database
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
   * Get configurations by schema ID
   */
  static async getConfigurationsBySchemaId(schemaId: string): Promise<Configuration[]> {
    return await getConfigurationRepository().findBySchemaId(schemaId);
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
  static async updateConfiguration(id: string, updates: Partial<Omit<Configuration, 'id' | 'createdAt' | 'schemaId'>>): Promise<Configuration | null> {
    // Prevent name updates - name is used for uniqueness checks
    if (updates.name !== undefined) {
      throw new Error('Configuration name cannot be updated. Name is used for uniqueness checks.');
    }

    const existing = await getConfigurationRepository().findById(id);
    if (!existing) {
      return null;
    }

    // If type is being updated, validate it matches the schema type
    if (updates.type !== undefined) {
      const schema = await SchemaService.getActiveSchemaBySchemaId(existing.schemaId);
      if (schema && updates.type !== schema.type) {
        throw new Error(`Configuration type '${updates.type}' does not match schema type '${schema.type}'`);
      }
    }

    // If data is being updated, validate against schema
    if (updates.data !== undefined) {
      const validation = await SchemaService.validateData(existing.schemaId, updates.data);
      if (!validation.valid) {
        throw new Error(`Configuration data does not conform to schema: ${validation.errors?.join(', ')}`);
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

