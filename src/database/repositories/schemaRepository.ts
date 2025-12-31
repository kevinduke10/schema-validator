import { Collection, Filter } from 'mongodb';
import { Schema } from '../../types';
import { BaseRepository } from './baseRepository';
import { dbConnection } from '../connection';

/**
 * MongoDB document structure (with _id instead of id)
 */
interface SchemaDocument extends Omit<Schema, 'id'> {
  _id?: any;
}

export class SchemaRepository extends BaseRepository<Schema> {
  private static instance: SchemaRepository;

  private constructor() {
    const db = dbConnection.getDb();
    super(db.collection('schemas'));
  }

  static getInstance(): SchemaRepository {
    if (!SchemaRepository.instance) {
      SchemaRepository.instance = new SchemaRepository();
    }
    return SchemaRepository.instance;
  }

  /**
   * Find schema by schemaId and version
   */
  async findBySchemaIdAndVersion(schemaId: string, version: number): Promise<Schema | null> {
    return this.findOne({ schemaId, version });
  }

  /**
   * Find active schema by schemaId
   */
  async findActiveBySchemaId(schemaId: string): Promise<Schema | null> {
    return this.findOne({ schemaId, active: true });
  }

  /**
   * Find all versions of a schema by schemaId
   */
  async findAllVersionsBySchemaId(schemaId: string): Promise<Schema[]> {
    return this.findMany({ schemaId }, { sort: { version: -1 } });
  }

  /**
   * Find latest version by schemaId (highest version number)
   */
  async findLatestBySchemaId(schemaId: string): Promise<Schema | null> {
    const schemas = await this.findMany({ schemaId }, { sort: { version: -1 }, limit: 1 });
    return schemas.length > 0 ? schemas[0] : null;
  }

  /**
   * Find schema by name and type (case-insensitive name)
   */
  async findByNameAndType(name: string, type: string): Promise<Schema | null> {
    return this.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
    });
  }

  /**
   * Set all versions of a schema as inactive
   */
  async setAllInactiveBySchemaId(schemaId: string): Promise<void> {
    await this.collection.updateMany(
      { schemaId },
      { $set: { active: false, updatedAt: new Date() } }
    );
  }

  /**
   * Set a specific version as active
   */
  async setVersionActive(schemaId: string, version: number): Promise<Schema | null> {
    // First, set all versions of this schema as inactive
    await this.setAllInactiveBySchemaId(schemaId);
    
    // Then set the specified version as active
    const result = await this.collection.findOneAndUpdate(
      { schemaId, version },
      { $set: { active: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    return result ? this.toEntity(result) : null;
  }

  /**
   * Get the next version number for a schemaId
   */
  async getNextVersion(schemaId: string): Promise<number> {
    const latest = await this.findLatestBySchemaId(schemaId);
    return latest ? latest.version + 1 : 1;
  }

  /**
   * Delete all versions of a schema by schemaId
   */
  async deleteAllVersionsBySchemaId(schemaId: string): Promise<number> {
    const result = await this.collection.deleteMany({ schemaId });
    return result.deletedCount;
  }

  /**
   * Create indexes for better query performance
   */
  async createIndexes(): Promise<void> {
    await this.collection.createIndex({ name: 1 });
    await this.collection.createIndex({ type: 1 });
    await this.collection.createIndex({ schemaId: 1, version: 1 }, { unique: true });
    await this.collection.createIndex({ schemaId: 1, active: 1 });
    await this.collection.createIndex({ type: 1, active: 1 });
    await this.collection.createIndex({ createdAt: -1 });
  }
}

