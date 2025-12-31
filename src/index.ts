import express, { Request, Response } from 'express';
import cors from 'cors';
import schemaRoutes from './routes/schemaRoutes';
import configurationRoutes from './routes/configurationRoutes';
import { dbConnection } from './database/connection';
import { SchemaRepository } from './database/repositories/schemaRepository';
import { ConfigurationRepository } from './database/repositories/configurationRepository';
import { ConfigLoader } from './services/configLoader';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/schemas', schemaRoutes);
app.use('/api/configurations', configurationRoutes);

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const dbStatus = dbConnection.isConnected() ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    database: dbStatus,
    timestamp: new Date().toISOString() 
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Schema Validator API',
    version: '1.0.0',
    endpoints: {
      schemas: '/api/schemas',
      configurations: '/api/configurations',
      health: '/health',
    },
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await dbConnection.connect();
    
    // Create indexes for better performance
    const schemaRepo = SchemaRepository.getInstance();
    const configRepo = ConfigurationRepository.getInstance();
    await schemaRepo.createIndexes();
    await configRepo.createIndexes();
    
    // Load preconfigured schemas and configurations from ConfigMap
    await ConfigLoader.initialize();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`API endpoints available at:`);
      console.log(`  - Schemas: http://localhost:${PORT}/api/schemas`);
      console.log(`  - Configurations: http://localhost:${PORT}/api/configurations`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await dbConnection.disconnect();
  process.exit(0);
});

startServer();

