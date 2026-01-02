import * as fs from 'fs';
import * as path from 'path';
import { SchemaService } from './schemaService';
import { ConfigurationService } from './configurationService';
import { SchemaRepository } from '../database/repositories/schemaRepository';
import { ConfigurationRepository } from '../database/repositories/configurationRepository';
import { Schema, Configuration, SchemaType } from '../types';

// Lazy getters for repositories
const getSchemaRepository = () => SchemaRepository.getInstance();
const getConfigurationRepository = () => ConfigurationRepository.getInstance();

interface PreconfiguredSchema {
  name: string;
  type: SchemaType;
  description?: string;
  schema: any;
  version?: number; // Optional: specify version number (defaults to 1)
  active?: boolean; // Optional: whether this version should be active (defaults to true for version 1, false otherwise)
  schemaId?: string; // Optional: specify schemaId to group versions together
}

interface PreconfiguredConfiguration {
  schemaName: string; // Reference to schema by name
  type: SchemaType;
  name: string;
  data: any;
  schemaVersion?: number; // Optional: specify which schema version to validate against (defaults to active version)
}

/**
 * Load and initialize preconfigured schemas and configurations from mounted ConfigMap
 * Supports two formats:
 * 1. Single JSON files: schemas.json and configurations.json (array format)
 * 2. Folder structure: schemas/ and configurations/ directories with individual .json files
 */
export class ConfigLoader {
  private static readonly CONFIG_DIR = process.env.CONFIG_DIR || '/etc/app-config';
  private static readonly SCHEMAS_FILE = 'schemas.json';
  private static readonly CONFIGURATIONS_FILE = 'configurations.json';
  private static readonly SCHEMAS_DIR = 'schemas';
  private static readonly CONFIGURATIONS_DIR = 'configurations';

  /**
   * Initialize schemas and configurations from ConfigMap
   */
  static async initialize(): Promise<void> {
    try {
      // Check if config directory exists
      if (!fs.existsSync(this.CONFIG_DIR)) {
        console.log(`Config directory ${this.CONFIG_DIR} does not exist. Skipping preconfigured data load.`);
        return;
      }

      // Load schemas first (supports both file and folder formats)
      await this.loadSchemas();

      // Then load configurations (they depend on schemas)
      await this.loadConfigurations();

      console.log('Successfully loaded preconfigured schemas and configurations');
    } catch (error: any) {
      console.error('Error loading preconfigured data:', error.message);
      // Don't throw - allow app to start even if config loading fails
    }
  }

  /**
   * Load schemas from ConfigMap
   * Supports:
   * 1. Single JSON file: schemas.json
   * 2. Flat folder: schemas/*.json
   * 3. Type-based nested folders: schemas/signal/*.json, schemas/post-processor/*.json
   */
  private static async loadSchemas(): Promise<void> {
    const schemasFile = path.join(this.CONFIG_DIR, this.SCHEMAS_FILE);
    const schemasDir = path.join(this.CONFIG_DIR, this.SCHEMAS_DIR);

    let schemaFiles: string[] = [];

    // Check for type-based nested folder structure first (preferred)
    if (fs.existsSync(schemasDir) && fs.statSync(schemasDir).isDirectory()) {
      const typeDirs = fs.readdirSync(schemasDir, { withFileTypes: true });
      
      // Check if we have type-based subdirectories
      const hasTypeDirs = typeDirs.some(dirent => dirent.isDirectory());
      
      if (hasTypeDirs) {
        console.log(`Loading schemas from type-based directories: ${schemasDir}`);
        // Load from type-based subdirectories (signal/, post-processor/, etc.)
        for (const dirent of typeDirs) {
          if (dirent.isDirectory()) {
            const typeDir = path.join(schemasDir, dirent.name);
            const files = fs.readdirSync(typeDir);
            const typeFiles = files
              .filter(file => file.endsWith('.json'))
              .map(file => path.join(typeDir, file));
            schemaFiles.push(...typeFiles);
          }
        }
      } else {
        // Fall back to flat folder structure
        console.log(`Loading schemas from flat directory: ${schemasDir}`);
        const files = fs.readdirSync(schemasDir);
        schemaFiles = files
          .filter(file => file.endsWith('.json'))
          .map(file => path.join(schemasDir, file));
      }
    }
    // Fall back to single JSON file
    else if (fs.existsSync(schemasFile)) {
      console.log(`Loading schemas from file: ${schemasFile}`);
      schemaFiles = [schemasFile];
    } else {
      console.log(`No schemas found (checked ${schemasFile} and ${schemasDir}). Skipping schema load.`);
      return;
    }

    const allSchemas: PreconfiguredSchema[] = [];

    // Load all schema files
    for (const filePath of schemaFiles) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);

        // Handle both single object and array formats
        if (Array.isArray(parsed)) {
          allSchemas.push(...parsed);
        } else if (parsed.name && parsed.schema) {
          // Single schema object
          allSchemas.push(parsed);
        } else {
          console.warn(`File ${filePath} does not contain a valid schema or array of schemas. Skipping.`);
        }
      } catch (error: any) {
        console.error(`Failed to parse schema file ${filePath}: ${error.message}`);
        // Continue with other files
      }
    }

    if (allSchemas.length === 0) {
      console.log('No valid schemas found to load.');
      return;
    }

    console.log(`Loading ${allSchemas.length} preconfigured schemas...`);

    for (const schemaData of allSchemas) {
      try {
        // Validate required fields
        if (!schemaData.name || !schemaData.type || !schemaData.schema) {
          console.error(`Schema missing required fields (name, type, or schema). Skipping.`);
          continue;
        }

        const version = schemaData.version ?? 1;
        const active = schemaData.active ?? (version === 1); // Default: version 1 is active, others are not

        // If schemaId is provided, check if this version already exists
        if (schemaData.schemaId) {
          const existing = await SchemaService.getSchemaBySchemaIdAndVersion(schemaData.schemaId, version);
          if (existing) {
            console.log(`Schema '${schemaData.name}' (schemaId: ${schemaData.schemaId}, version: ${version}) already exists. Skipping.`);
            continue;
          }
        } else {
          // If no schemaId provided, check if schema with same name/type exists (case-insensitive)
          // If it exists, use its schemaId; otherwise create new
          const existing = await getSchemaRepository().findByNameAndType(schemaData.name, schemaData.type);

          if (existing) {
            // Schema exists, check if this version already exists
            const existingVersion = await SchemaService.getSchemaBySchemaIdAndVersion(existing.schemaId, version);
            if (existingVersion) {
              console.log(`Schema '${schemaData.name}' (schemaId: ${existing.schemaId}, version: ${version}) already exists. Skipping.`);
              continue;
            }
            // Use existing schemaId for new version
            schemaData.schemaId = existing.schemaId;
          }
        }

        // Create the schema with specified version
        const schema = await SchemaService.createSchemaWithVersion(
          {
            name: schemaData.name,
            type: schemaData.type,
            description: schemaData.description,
            schema: schemaData.schema,
          },
          version,
          active,
          schemaData.schemaId,
          true // enabled defaults to true
        );

        console.log(`Created schema '${schema.name}' (type: ${schema.type}, schemaId: ${schema.schemaId}, version: ${schema.version}, active: ${schema.active})`);
      } catch (error: any) {
        console.error(`Failed to load schema '${schemaData.name}': ${error.message}`);
        // Continue with other schemas even if one fails
      }
    }
  }

  /**
   * Load configurations from ConfigMap
   * Supports:
   * 1. Single JSON file: configurations.json
   * 2. Flat folder: configurations/*.json
   * 3. Type-based nested folders: configurations/signal/*.json, configurations/post-processor/*.json
   */
  private static async loadConfigurations(): Promise<void> {
    const configsFile = path.join(this.CONFIG_DIR, this.CONFIGURATIONS_FILE);
    const configsDir = path.join(this.CONFIG_DIR, this.CONFIGURATIONS_DIR);

    let configFiles: string[] = [];

    // Check for type-based nested folder structure first (preferred)
    if (fs.existsSync(configsDir) && fs.statSync(configsDir).isDirectory()) {
      const typeDirs = fs.readdirSync(configsDir, { withFileTypes: true });
      
      // Check if we have type-based subdirectories
      const hasTypeDirs = typeDirs.some(dirent => dirent.isDirectory());
      
      if (hasTypeDirs) {
        console.log(`Loading configurations from type-based directories: ${configsDir}`);
        // Load from type-based subdirectories (signal/, post-processor/, etc.)
        for (const dirent of typeDirs) {
          if (dirent.isDirectory()) {
            const typeDir = path.join(configsDir, dirent.name);
            const files = fs.readdirSync(typeDir);
            const typeFiles = files
              .filter(file => file.endsWith('.json'))
              .map(file => path.join(typeDir, file));
            configFiles.push(...typeFiles);
          }
        }
      } else {
        // Fall back to flat folder structure
        console.log(`Loading configurations from flat directory: ${configsDir}`);
        const files = fs.readdirSync(configsDir);
        configFiles = files
          .filter(file => file.endsWith('.json'))
          .map(file => path.join(configsDir, file));
      }
    }
    // Fall back to single JSON file
    else if (fs.existsSync(configsFile)) {
      console.log(`Loading configurations from file: ${configsFile}`);
      configFiles = [configsFile];
    } else {
      console.log(`No configurations found (checked ${configsFile} and ${configsDir}). Skipping configuration load.`);
      return;
    }

    const allConfigs: PreconfiguredConfiguration[] = [];

    // Load all configuration files
    for (const filePath of configFiles) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);

        // Handle both single object and array formats
        if (Array.isArray(parsed)) {
          allConfigs.push(...parsed);
        } else if (parsed.schemaName && parsed.name && parsed.data) {
          // Single configuration object
          allConfigs.push(parsed);
        } else {
          console.warn(`File ${filePath} does not contain a valid configuration or array of configurations. Skipping.`);
        }
      } catch (error: any) {
        console.error(`Failed to parse configuration file ${filePath}: ${error.message}`);
        // Continue with other files
      }
    }

    if (allConfigs.length === 0) {
      console.log('No valid configurations found to load.');
      return;
    }

    console.log(`Loading ${allConfigs.length} preconfigured configurations...`);

    for (const configData of allConfigs) {
      try {
        // Validate required fields
        if (!configData.schemaName || !configData.type || !configData.name || !configData.data) {
          console.error(`Configuration missing required fields. Skipping.`);
          continue;
        }

        // Find the schema by name and type
        const allSchemas = await SchemaService.getAllSchemas();
        let schema = allSchemas.find(
          s => s.name === configData.schemaName && s.type === configData.type
        );

        if (!schema) {
          console.error(
            `Schema '${configData.schemaName}' (type: ${configData.type}) not found. Skipping configuration '${configData.name}'.`
          );
          continue;
        }

        // If schemaVersion is specified, find that specific version
        if (configData.schemaVersion !== undefined) {
          const versionSchema = await SchemaService.getSchemaBySchemaIdAndVersion(schema.schemaId, configData.schemaVersion);
          if (!versionSchema) {
            console.error(
              `Schema '${configData.schemaName}' (type: ${configData.type}, version: ${configData.schemaVersion}) not found. Skipping configuration '${configData.name}'.`
            );
            continue;
          }
          schema = versionSchema;
        } else {
          // Use active version if no version specified
          const activeSchema = await SchemaService.getActiveSchemaBySchemaId(schema.schemaId);
          if (!activeSchema) {
            console.error(
              `No active version found for schema '${configData.schemaName}' (type: ${configData.type}). Skipping configuration '${configData.name}'.`
            );
            continue;
          }
          schema = activeSchema;
        }

        // Check if configuration already exists by name and schema id (case-insensitive)
        const existing = await getConfigurationRepository().findByNameAndSchemaId(configData.name, schema.id);

        if (existing) {
          console.log(`Configuration '${configData.name}' already exists. Skipping.`);
          continue;
        }

        // Validate data against the specific schema version
        const validation = configData.schemaVersion !== undefined
          ? await SchemaService.validateDataByVersion(schema.schemaId, configData.schemaVersion, configData.data)
          : await SchemaService.validateData(schema.schemaId, configData.data);

        if (!validation.valid) {
          console.error(
            `Configuration '${configData.name}' data does not conform to schema: ${validation.errors?.join(', ')}. Skipping.`
          );
          continue;
        }

        // Create the configuration (store the schema's unique id, not schemaId)
        const configuration = await getConfigurationRepository().create({
          schemaId: schema.id, // Store the schema's unique id
          type: configData.type,
          name: configData.name,
          data: configData.data,
        });

        const versionInfo = configData.schemaVersion !== undefined ? ` (schema version: ${configData.schemaVersion})` : '';
        console.log(`Created configuration '${configuration.name}' (id: ${configuration.id}${versionInfo})`);
      } catch (error: any) {
        console.error(`Failed to load configuration '${configData.name}': ${error.message}`);
        // Continue with other configurations even if one fails
      }
    }
  }
}

