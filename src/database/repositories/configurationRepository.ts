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
   * Create indexes for better query performance
   */
  async createIndexes(): Promise<void> {
    await this.collection.createIndex({ schemaId: 1 });
    await this.collection.createIndex({ type: 1 });
    await this.collection.createIndex({ name: 1 });
    await this.collection.createIndex({ type: 1, schemaId: 1 });
    await this.collection.createIndex({ createdAt: -1 });
  }
}

