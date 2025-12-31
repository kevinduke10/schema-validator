import { Router, Request, Response } from 'express';
import { SchemaService } from '../services/schemaService';
import { CreateSchemaRequest, UpdateSchemaRequest, SetActiveVersionRequest, Schema } from '../types';
import { VALID_TYPES } from '../constants/types';

const router = Router();

/**
 * GET /api/schemas
 * Get all schemas (all versions) or active schemas only
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const type = req.query.type as string | undefined;
    
    let schemas: Schema[];
    if (activeOnly) {
      schemas = await SchemaService.getActiveSchemas(type);
    } else {
      schemas = await SchemaService.getAllSchemas();
      // Filter by type if provided
      if (type) {
        schemas = schemas.filter(s => s.type === type);
      }
    }
    res.json(schemas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schemas/:schemaId
 * Get active schema by schemaId
 */
router.get('/:schemaId', async (req: Request, res: Response) => {
  try {
    const schema = await SchemaService.getActiveSchemaBySchemaId(req.params.schemaId);
    if (!schema) {
      return res.status(404).json({ error: 'Active schema not found' });
    }
    res.json(schema);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schemas/:schemaId/versions
 * Get all versions of a schema
 */
router.get('/:schemaId/versions', async (req: Request, res: Response) => {
  try {
    const versions = await SchemaService.getAllVersionsBySchemaId(req.params.schemaId);
    res.json(versions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schemas/:schemaId/versions/:version
 * Get specific version of a schema
 */
router.get('/:schemaId/versions/:version', async (req: Request, res: Response) => {
  try {
    const version = parseInt(req.params.version, 10);
    if (isNaN(version)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }
    const schema = await SchemaService.getSchemaBySchemaIdAndVersion(req.params.schemaId, version);
    if (!schema) {
      return res.status(404).json({ error: 'Schema version not found' });
    }
    res.json(schema);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schemas
 * Create a new schema
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, description, schema } = req.body as CreateSchemaRequest;

    if (!name || !type || !schema) {
      return res.status(400).json({ error: 'Name, type, and schema are required' });
    }

    // Validate type
    if (!VALID_TYPES.includes(type as any)) {
      return res.status(400).json({ error: `Type must be one of: ${VALID_TYPES.join(', ')}` });
    }

    const newSchema = await SchemaService.createSchema({ name, type, description, schema });
    res.status(201).json(newSchema);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/schemas/:schemaId
 * Update a schema (creates a new version)
 */
router.put('/:schemaId', async (req: Request, res: Response) => {
  try {
    const { name, type, description, schema } = req.body as UpdateSchemaRequest;
    const updates: any = {};

    if (name !== undefined) updates.name = name;
    if (type !== undefined) {
      // Validate type
      const validTypes: string[] = ['signal', 'post-processor'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
      }
      updates.type = type;
    }
    if (description !== undefined) updates.description = description;
    if (schema !== undefined) updates.schema = schema;

    const newVersion = await SchemaService.updateSchemaBySchemaId(req.params.schemaId, updates);
    res.json(newVersion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/schemas/:schemaId/active
 * Set a specific version as active
 */
router.put('/:schemaId/active', async (req: Request, res: Response) => {
  try {
    const { version } = req.body as SetActiveVersionRequest;
    if (version === undefined || typeof version !== 'number') {
      return res.status(400).json({ error: 'Version number is required' });
    }

    const schema = await SchemaService.setActiveVersion(req.params.schemaId, version);
    if (!schema) {
      return res.status(404).json({ error: 'Schema version not found' });
    }

    res.json(schema);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/schemas/:schemaId
 * Delete all versions of a schema by schemaId
 */
router.delete('/:schemaId', async (req: Request, res: Response) => {
  try {
    const deletedCount = await SchemaService.deleteAllVersionsBySchemaId(req.params.schemaId);
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Schema not found' });
    }
    res.json({ message: `Deleted ${deletedCount} version(s) of schema`, deletedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schemas/:schemaId/validate
 * Validate data against active schema version
 */
router.post('/:schemaId/validate', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (data === undefined) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const validation = await SchemaService.validateData(req.params.schemaId, data);
    res.json(validation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/schemas/:schemaId/versions/:version/validate
 * Validate data against a specific schema version
 */
router.post('/:schemaId/versions/:version/validate', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (data === undefined) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const version = parseInt(req.params.version, 10);
    if (isNaN(version)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    const validation = await SchemaService.validateDataByVersion(req.params.schemaId, version, data);
    res.json(validation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

