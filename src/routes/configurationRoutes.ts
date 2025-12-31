import { Router, Request, Response } from 'express';
import { ConfigurationService } from '../services/configurationService';
import { CreateConfigurationRequest, UpdateConfigurationRequest } from '../types';
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
 * PUT /api/configurations/:id
 * Update a configuration
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, type, data } = req.body as UpdateConfigurationRequest;
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
    if (data !== undefined) updates.data = data;

    const updated = await ConfigurationService.updateConfiguration(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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

