import { Collection, Filter } from 'mongodb';
import { Configuration } from '../../types';
import { BaseRepository } from './baseRepository';
import { dbConnection } from '../connection';

/**
 * MongoDB document structure (with _id instead of id)
 */
interface ConfigurationDocument extends Omit<Configuration, 'id'> {
  _id?: any;
}

export class ConfigurationRepository extends BaseRepository<Configuration> {
  private static instance: ConfigurationRepository;

  private constructor() {
    const db = dbConnection.getDb();
    super(db.collection('configurations'));
  }

  /**
   * Override toEntity to handle default values for backward compatibility
   */
  protected toEntity(doc: any): Configuration {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    const entity = {
      ...rest,
      id: _id.toString(),
      // Default values for backward compatibility
      configId: rest.configId || rest.id, // Use id as configId if not present (backward compat)
      version: rest.version !== undefined ? rest.version : 1,
      active: rest.active !== undefined ? rest.active : true,
    } as Configuration;
    return entity;
  }

  static getInstance(): ConfigurationRepository {
    if (!ConfigurationRepository.instance) {
      ConfigurationRepository.instance = new ConfigurationRepository();
    }
    return ConfigurationRepository.instance;
  }

  /**
   * Find configurations by schema ID
   */
  async findBySchemaId(schemaId: string): Promise<Configuration[]> {
    return this.findMany({ schemaId });
  }

  /**
   * Find configurations by type
   */
  async findByType(type: string): Promise<Configuration[]> {
    return this.findMany({ type });
  }

  /**
   * Find configurations by schema ID and type
   */
  async findBySchemaIdAndType(schemaId: string, type: string): Promise<Configuration[]> {
    return this.findMany({ schemaId, type });
  }

  /**
   * Find configuration by name and schemaId (case-insensitive name)
   * Returns the active version if available, otherwise null
   */
  async findByNameAndSchemaId(name: string, schemaId: string): Promise<Configuration | null> {
    // First try to find active version
    const active = await this.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      schemaId,
      active: true,
    });
    if (active) return active;
    
    // If no active version, return any version (for backward compatibility)
    return this.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      schemaId,
    });
  }

  /**
   * Find configuration by configId and version
   */
  async findByConfigIdAndVersion(configId: string, version: number): Promise<Configuration | null> {
    return this.findOne({ configId, version });
  }

  /**
   * Find active configuration by configId
   */
  async findActiveByConfigId(configId: string): Promise<Configuration | null> {
    return this.findOne({ configId, active: true });
  }

  /**
   * Find all versions of a configuration by configId
   */
  async findAllVersionsByConfigId(configId: string): Promise<Configuration[]> {
    return this.findMany({ configId }, { sort: { version: -1 } });
  }

  /**
   * Find latest version by configId (highest version number)
   */
  async findLatestByConfigId(configId: string): Promise<Configuration | null> {
    const configs = await this.findMany({ configId }, { sort: { version: -1 }, limit: 1 });
    return configs.length > 0 ? configs[0] : null;
  }

  /**
   * Find configuration by name (case-insensitive) - returns active version
   */
  async findByName(name: string): Promise<Configuration | null> {
    return this.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true,
    });
  }

  /**
   * Set all versions of a configuration as inactive
   */
  async setAllInactiveByConfigId(configId: string): Promise<void> {
    await this.collection.updateMany(
      { configId },
      { $set: { active: false, updatedAt: new Date() } }
    );
  }

  /**
   * Set a specific version as active
   */
  async setVersionActive(configId: string, version: number): Promise<Configuration | null> {
    // First, set all versions of this configuration as inactive
    await this.setAllInactiveByConfigId(configId);
    
    // Then set the specified version as active
    const result = await this.collection.findOneAndUpdate(
      { configId, version },
      { $set: { active: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    return result ? this.toEntity(result) : null;
  }

  /**
   * Get the next version number for a configId
   */
  async getNextVersion(configId: string): Promise<number> {
    const latest = await this.findLatestByConfigId(configId);
    return latest ? latest.version + 1 : 1;
  }

  /**
   * Delete all versions of a configuration by configId
   */
  async deleteAllVersionsByConfigId(configId: string): Promise<number> {
    const result = await this.collection.deleteMany({ configId });
    return result.deletedCount || 0;
  }

  /**
   * Create indexes for better query performance
   */
  async createIndexes(): Promise<void> {
    await this.collection.createIndex({ schemaId: 1 });
    await this.collection.createIndex({ type: 1 });
    await this.collection.createIndex({ name: 1 });
    await this.collection.createIndex({ type: 1, schemaId: 1 });
    await this.collection.createIndex({ configId: 1 });
    await this.collection.createIndex({ configId: 1, version: 1 });
    await this.collection.createIndex({ configId: 1, active: 1 });
    await this.collection.createIndex({ createdAt: -1 });
  }
}

