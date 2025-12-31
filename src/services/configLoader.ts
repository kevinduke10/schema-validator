import * as fs from 'fs';
import * as path from 'path';
import { SchemaService } from './schemaService';
import { ConfigurationService } from './configurationService';
import { Schema, Configuration, SchemaType } from '../types';

interface PreconfiguredSchema {
  name: string;
  type: SchemaType;
  description?: string;
  schema: any;
}

interface PreconfiguredConfiguration {
  schemaName: string; // Reference to schema by name
  type: SchemaType;
  name: string;
  data: any;
}

/**
 * Load and initialize preconfigured schemas and configurations from mounted ConfigMap
 */
export class ConfigLoader {
  private static readonly CONFIG_DIR = process.env.CONFIG_DIR || '/etc/app-config';
  private static readonly SCHEMAS_FILE = 'schemas.json';
  private static readonly CONFIGURATIONS_FILE = 'configurations.json';

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

      // Load schemas first
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
   */
  private static async loadSchemas(): Promise<void> {
    const schemasPath = path.join(this.CONFIG_DIR, this.SCHEMAS_FILE);

    if (!fs.existsSync(schemasPath)) {
      console.log(`Schemas file ${schemasPath} does not exist. Skipping schema load.`);
      return;
    }

    const fileContent = fs.readFileSync(schemasPath, 'utf-8');
    const preconfiguredSchemas: PreconfiguredSchema[] = JSON.parse(fileContent);

    if (!Array.isArray(preconfiguredSchemas)) {
      throw new Error('Schemas file must contain an array of schema objects');
    }

    console.log(`Loading ${preconfiguredSchemas.length} preconfigured schemas...`);

    for (const schemaData of preconfiguredSchemas) {
      try {
        // Check if schema already exists by name and type
        const existingSchemas = await SchemaService.getAllSchemas();
        const existing = existingSchemas.find(
          s => s.name === schemaData.name && s.type === schemaData.type
        );

        if (existing) {
          console.log(`Schema '${schemaData.name}' (type: ${schemaData.type}) already exists. Skipping.`);
          continue;
        }

        // Create the schema
        const schema = await SchemaService.createSchema({
          name: schemaData.name,
          type: schemaData.type,
          description: schemaData.description,
          schema: schemaData.schema,
        });

        console.log(`Created schema '${schema.name}' (type: ${schema.type}, schemaId: ${schema.schemaId})`);
      } catch (error: any) {
        console.error(`Failed to load schema '${schemaData.name}': ${error.message}`);
        // Continue with other schemas even if one fails
      }
    }
  }

  /**
   * Load configurations from ConfigMap
   */
  private static async loadConfigurations(): Promise<void> {
    const configsPath = path.join(this.CONFIG_DIR, this.CONFIGURATIONS_FILE);

    if (!fs.existsSync(configsPath)) {
      console.log(`Configurations file ${configsPath} does not exist. Skipping configuration load.`);
      return;
    }

    const fileContent = fs.readFileSync(configsPath, 'utf-8');
    const preconfiguredConfigs: PreconfiguredConfiguration[] = JSON.parse(fileContent);

    if (!Array.isArray(preconfiguredConfigs)) {
      throw new Error('Configurations file must contain an array of configuration objects');
    }

    console.log(`Loading ${preconfiguredConfigs.length} preconfigured configurations...`);

    for (const configData of preconfiguredConfigs) {
      try {
        // Find the schema by name and type
        const allSchemas = await SchemaService.getAllSchemas();
        const schema = allSchemas.find(
          s => s.name === configData.schemaName && s.type === configData.type && s.active
        );

        if (!schema) {
          console.error(
            `Schema '${configData.schemaName}' (type: ${configData.type}) not found. Skipping configuration '${configData.name}'.`
          );
          continue;
        }

        // Check if configuration already exists by name and schemaId
        const existingConfigs = await ConfigurationService.getAllConfigurations();
        const existing = existingConfigs.find(
          c => c.name === configData.name && c.schemaId === schema.schemaId
        );

        if (existing) {
          console.log(`Configuration '${configData.name}' already exists. Skipping.`);
          continue;
        }

        // Create the configuration
        const configuration = await ConfigurationService.createConfiguration({
          schemaId: schema.schemaId,
          type: configData.type,
          name: configData.name,
          data: configData.data,
        });

        console.log(`Created configuration '${configuration.name}' (id: ${configuration.id})`);
      } catch (error: any) {
        console.error(`Failed to load configuration '${configData.name}': ${error.message}`);
        // Continue with other configurations even if one fails
      }
    }
  }
}

