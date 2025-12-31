import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { Schema } from '../types';
import { SchemaRepository } from '../database/repositories/schemaRepository';

// In-memory cache for compiled validators (for performance)
const validators: Map<string, ValidateFunction> = new Map();

// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Lazy getter for repository instance (initialized after DB connection)
const getSchemaRepository = () => SchemaRepository.getInstance();

export class SchemaService {
  /**
   * Generate a unique schemaId
   */
  private static generateSchemaId(): string {
    return `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new schema (version 1, active by default)
   */
  static async createSchema(schemaData: Omit<Schema, 'id' | 'schemaId' | 'version' | 'active' | 'createdAt' | 'updatedAt'>): Promise<Schema> {
    return this.createSchemaWithVersion(schemaData, 1, true);
  }

  /**
   * Create a schema with a specific version and active status
   * Used for preloading schemas with specific versions
   */
  static async createSchemaWithVersion(
    schemaData: Omit<Schema, 'id' | 'schemaId' | 'version' | 'active' | 'createdAt' | 'updatedAt'>,
    version: number,
    active: boolean = false,
    schemaId?: string
  ): Promise<Schema> {
    // Validate the schema itself
    const isValidSchema = ajv.validateSchema(schemaData.schema);
    if (!isValidSchema) {
      throw new Error(`Invalid JSON Schema: ${ajv.errorsText(ajv.errors)}`);
    }

    // Use provided schemaId or generate a new one
    const finalSchemaId = schemaId || this.generateSchemaId();

    // Check if schema with this schemaId and version already exists
    const existing = await getSchemaRepository().findBySchemaIdAndVersion(finalSchemaId, version);
    if (existing) {
      throw new Error(`Schema with schemaId ${finalSchemaId} and version ${version} already exists`);
    }

    const schemaWithVersion = {
      ...schemaData,
      schemaId: finalSchemaId,
      version,
      active,
    };

    // If this version should be active, deactivate all other versions first
    if (active) {
      await getSchemaRepository().setAllInactiveBySchemaId(finalSchemaId);
    }

    // Save to database
    const schema = await getSchemaRepository().create(schemaWithVersion);

    // Compile and cache the validator for performance
    try {
      const validate = ajv.compile(schemaData.schema);
      validators.set(schema.id, validate);
    } catch (error: any) {
      // If compilation fails, still save the schema but log the error
      console.warn(`Failed to compile schema ${schema.id}: ${error.message}`);
    }

    return schema;
  }

  /**
   * Get all schemas (all versions)
   */
  static async getAllSchemas(): Promise<Schema[]> {
    return await getSchemaRepository().findAll();
  }

  /**
   * Get all active schemas
   */
  static async getActiveSchemas(type?: string): Promise<Schema[]> {
    const filter: any = { active: true };
    if (type) {
      filter.type = type;
    }
    return await getSchemaRepository().findMany(filter);
  }

  /**
   * Get schema by document ID
   */
  static async getSchemaById(id: string): Promise<Schema | null> {
    const schema = await getSchemaRepository().findById(id);
    
    // If schema found and validator not cached, compile and cache it
    if (schema && !validators.has(id)) {
      try {
        const validate = ajv.compile(schema.schema);
        validators.set(id, validate);
      } catch (error: any) {
        console.warn(`Failed to compile schema ${id}: ${error.message}`);
      }
    }
    
    return schema;
  }

  /**
   * Get active schema by schemaId
   */
  static async getActiveSchemaBySchemaId(schemaId: string): Promise<Schema | null> {
    const schema = await getSchemaRepository().findActiveBySchemaId(schemaId);
    
    if (schema && !validators.has(schema.id)) {
      try {
        const validate = ajv.compile(schema.schema);
        validators.set(schema.id, validate);
      } catch (error: any) {
        console.warn(`Failed to compile schema ${schema.id}: ${error.message}`);
      }
    }
    
    return schema;
  }

  /**
   * Get schema by schemaId and version
   */
  static async getSchemaBySchemaIdAndVersion(schemaId: string, version: number): Promise<Schema | null> {
    const schema = await getSchemaRepository().findBySchemaIdAndVersion(schemaId, version);
    
    if (schema && !validators.has(schema.id)) {
      try {
        const validate = ajv.compile(schema.schema);
        validators.set(schema.id, validate);
      } catch (error: any) {
        console.warn(`Failed to compile schema ${schema.id}: ${error.message}`);
      }
    }
    
    return schema;
  }

  /**
   * Get all versions of a schema by schemaId
   */
  static async getAllVersionsBySchemaId(schemaId: string): Promise<Schema[]> {
    return await getSchemaRepository().findAllVersionsBySchemaId(schemaId);
  }

  /**
   * Update a schema by schemaId (creates a new version)
   */
  static async updateSchemaBySchemaId(schemaId: string, updates: Partial<Omit<Schema, 'id' | 'schemaId' | 'version' | 'active' | 'createdAt' | 'updatedAt'>>): Promise<Schema> {
    // Get the existing schema to preserve fields
    const existing = await getSchemaRepository().findActiveBySchemaId(schemaId);
    if (!existing) {
      throw new Error(`Schema with schemaId ${schemaId} not found`);
    }

    // If schema is being updated, validate it
    const newSchema = updates.schema || existing.schema;
    const isValidSchema = ajv.validateSchema(newSchema);
    if (!isValidSchema) {
      throw new Error(`Invalid JSON Schema: ${ajv.errorsText(ajv.errors)}`);
    }

    // Get next version number
    const nextVersion = await getSchemaRepository().getNextVersion(schemaId);

    // Create new version with updates
    const newVersionData = {
      name: updates.name ?? existing.name,
      type: updates.type ?? existing.type,
      description: updates.description ?? existing.description,
      schema: newSchema,
      schemaId,
      version: nextVersion,
      active: true, // New version is active by default
    };

    // Set all existing versions as inactive
    await getSchemaRepository().setAllInactiveBySchemaId(schemaId);

    // Create the new version
    const newVersion = await getSchemaRepository().create(newVersionData);

    // Compile and cache the validator
    try {
      const validate = ajv.compile(newVersion.schema);
      validators.set(newVersion.id, validate);
    } catch (error: any) {
      throw new Error(`Failed to compile schema: ${error.message}`);
    }

    return newVersion;
  }

  /**
   * Set a specific version as active
   */
  static async setActiveVersion(schemaId: string, version: number): Promise<Schema | null> {
    const schema = await getSchemaRepository().setVersionActive(schemaId, version);
    
    if (schema) {
      // Compile and cache the validator for the newly active version
      try {
        const validate = ajv.compile(schema.schema);
        validators.set(schema.id, validate);
      } catch (error: any) {
        console.warn(`Failed to compile schema ${schema.id}: ${error.message}`);
      }
    }
    
    return schema;
  }

  /**
   * Delete a schema by document ID
   */
  static async deleteSchema(id: string): Promise<boolean> {
    const schema = await getSchemaRepository().findById(id);
    const deleted = await getSchemaRepository().delete(id);
    if (deleted && schema) {
      validators.delete(id);
    }
    return deleted;
  }

  /**
   * Delete all versions of a schema by schemaId
   */
  static async deleteAllVersionsBySchemaId(schemaId: string): Promise<number> {
    // Get all versions to clear validators
    const versions = await getSchemaRepository().findAllVersionsBySchemaId(schemaId);
    const deletedCount = await getSchemaRepository().deleteAllVersionsBySchemaId(schemaId);
    
    // Clear validators for all deleted versions
    versions.forEach(version => {
      validators.delete(version.id);
    });
    
    return deletedCount;
  }

  /**
   * Validate data against a schema (uses active version by schemaId)
   */
  static async validateData(schemaId: string, data: any): Promise<{ valid: boolean; errors?: string[] }> {
    // Get active schema by schemaId
    const schema = await getSchemaRepository().findActiveBySchemaId(schemaId);
    if (!schema) {
      throw new Error(`Active schema with schemaId ${schemaId} not found`);
    }

    // Get or compile validator
    let validator = validators.get(schema.id);
    
    if (!validator) {
      try {
        validator = ajv.compile(schema.schema);
        validators.set(schema.id, validator);
      } catch (error: any) {
        throw new Error(`Failed to compile schema: ${error.message}`);
      }
    }

    const valid = validator(data);
    if (!valid) {
      const errors = validator.errors?.map((err: any) => 
        `${err.instancePath || 'root'}: ${err.message}`
      ) || [];
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Validate data against a specific schema version
   */
  static async validateDataByVersion(schemaId: string, version: number, data: any): Promise<{ valid: boolean; errors?: string[] }> {
    const schema = await getSchemaRepository().findBySchemaIdAndVersion(schemaId, version);
    if (!schema) {
      throw new Error(`Schema with schemaId ${schemaId} version ${version} not found`);
    }

    // Get or compile validator
    let validator = validators.get(schema.id);
    
    if (!validator) {
      try {
        validator = ajv.compile(schema.schema);
        validators.set(schema.id, validator);
      } catch (error: any) {
        throw new Error(`Failed to compile schema: ${error.message}`);
      }
    }

    const valid = validator(data);
    if (!valid) {
      const errors = validator.errors?.map((err: any) => 
        `${err.instancePath || 'root'}: ${err.message}`
      ) || [];
      return { valid: false, errors };
    }

    return { valid: true };
  }
}

