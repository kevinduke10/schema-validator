/**
 * Valid schema and configuration types
 * Add new types here as needed
 */
export const VALID_TYPES = ['signal', 'post-processor'] as const;

/**
 * Type for schema and configuration types
 */
export type SchemaType = typeof VALID_TYPES[number];

/**
 * Check if a type is valid
 */
export function isValidType(type: string): type is SchemaType {
  return VALID_TYPES.includes(type as SchemaType);
}

