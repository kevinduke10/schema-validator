// JSON Schema type - accepts any valid JSON Schema object
export type JSONSchema = Record<string, any>;

// Schema and Configuration types - re-export from constants
import type { SchemaType } from '../constants/types';
export type { SchemaType };

export interface Schema {
  id: string;
  schemaId: string; // Groups all versions of the same schema together
  version: number;
  active: boolean;
  enabled?: boolean; // Whether this schema is enabled (visible in configuration dropdowns), defaults to true
  type: SchemaType;
  name: string;
  description?: string;
  schema: JSONSchema;
  createdAt: Date;
  updatedAt: Date;
}

export interface Configuration {
  id: string;
  configId: string; // Groups all versions of the same configuration together
  version: number;
  active: boolean;
  schemaId: string; // Stores the schema's unique id (not schemaId that groups versions) - identifies specific schema version
  type: SchemaType;
  name: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchemaRequest {
  name: string;
  type: SchemaType;
  description?: string;
  schema: JSONSchema;
}

export interface UpdateSchemaRequest {
  name?: string;
  type?: SchemaType;
  description?: string;
  schema?: JSONSchema;
}

export interface SetActiveVersionRequest {
  version: number;
}

export interface CreateConfigurationRequest {
  schemaId: string;
  type: SchemaType;
  name: string;
  data: any;
}

export interface UpdateConfigurationRequest {
  name?: string;
  type?: SchemaType;
  schemaId?: string;
  schemaVersion?: number; // Optional: specify which version of the schema to validate against
  data?: any;
}

