// JSON Schema type - accepts any valid JSON Schema object
export type JSONSchema = Record<string, any>;

// Schema and Configuration types - re-export from constants
export type { SchemaType } from '../constants/types';

export interface Schema {
  id: string;
  schemaId: string; // Groups all versions of the same schema together
  version: number;
  active: boolean;
  type: SchemaType;
  name: string;
  description?: string;
  schema: JSONSchema;
  createdAt: Date;
  updatedAt: Date;
}

export interface Configuration {
  id: string;
  schemaId: string;
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
  data?: any;
}

