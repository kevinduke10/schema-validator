import { Router, Request, Response } from 'express';
import { ConfigurationService } from '../services/configurationService';
import { CreateConfigurationRequest, UpdateConfigurationRequest, Configuration } from '../types';
import { VALID_TYPES } from '../constants/types';

const router = Router();

/**
 * GET /api/configurations
 * Get all configurations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const schemaId = req.query.schemaId as string | undefined;
    const type = req.query.type as string | undefined;
    
    let configurations: Configuration[];
    if (schemaId && type) {
      configurations = await ConfigurationService.getConfigurationsBySchemaIdAndType(schemaId, type);
    } else if (schemaId) {
      configurations = await ConfigurationService.getConfigurationsBySchemaId(schemaId);
    } else if (type) {
      configurations = await ConfigurationService.getConfigurationsByType(type);
    } else {
      configurations = await ConfigurationService.getAllConfigurations();
    }
    
    res.json(configurations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/configurations/:id
 * Get configuration by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const configuration = await ConfigurationService.getConfigurationById(req.params.id);
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json(configuration);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/configurations
 * Create a new configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { schemaId, type, name, data } = req.body as CreateConfigurationRequest;

    if (!schemaId || !type || !name || data === undefined) {
      return res.status(400).json({ error: 'SchemaId, type, name, and data are required' });
    }

    // Validate type
    if (!VALID_TYPES.includes(type as any)) {
      return res.status(400).json({ error: `Type must be one of: ${VALID_TYPES.join(', ')}` });
    }

    const newConfiguration = await ConfigurationService.createConfiguration({ schemaId, type, name, data });
    res.status(201).json(newConfiguration);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/configurations/:configId
 * Update a configuration (creates a new version)
 */
router.put('/:configId', async (req: Request, res: Response) => {
  try {
    const { name, type, schemaId, data } = req.body as UpdateConfigurationRequest;
    
    // Get existing active configuration to validate name and type match
    const existing = await ConfigurationService.getActiveConfigurationByConfigId(req.params.configId);
    if (!existing) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Validate that name and type match the existing configuration (if provided)
    if (name !== undefined && name !== existing.name) {
      return res.status(400).json({ error: 'Configuration name cannot be updated. Name is used for uniqueness checks.' });
    }
    if (type !== undefined && type !== existing.type) {
      return res.status(400).json({ error: 'Configuration type cannot be updated. Type is used for uniqueness checks.' });
    }

    const updates: any = {};

    // Note: name and type are validated above but not included in updates
    // They are used for validation/lookup only, not for updating

    // Allow schemaId to be updated (now stores the schema's unique id, not schemaId that groups versions)
    if (schemaId !== undefined) {
      // Validate schemaId format if needed
      if (typeof schemaId !== 'string' || !schemaId.trim()) {
        return res.status(400).json({ error: 'Invalid schemaId' });
      }
      updates.schemaId = schemaId;
    }

    if (data !== undefined) updates.data = data;

    const updated = await ConfigurationService.updateConfigurationByConfigId(req.params.configId, updates);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/configurations/:configId/active
 * Set a specific version as active
 */
router.put('/:configId/active', async (req: Request, res: Response) => {
  try {
    const { version } = req.body as { version: number };
    if (version === undefined || typeof version !== 'number') {
      return res.status(400).json({ error: 'Version number is required' });
    }

    const configuration = await ConfigurationService.setActiveVersion(req.params.configId, version);
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration version not found' });
    }

    res.json(configuration);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/configurations
 * Delete all configurations
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const deletedCount = await ConfigurationService.deleteAllConfigurations();
    res.json({
      message: `Deleted ${deletedCount} configuration(s)`,
      deleted: deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/configurations/:id
 * Delete a configuration
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await ConfigurationService.deleteConfiguration(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/configurations/:id/validate
 * Validate a configuration against its schema
 */
router.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const validation = await ConfigurationService.validateConfiguration(req.params.id);
    res.json(validation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

