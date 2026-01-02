import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private static instance: DatabaseConnection;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    if (this.db) {
      return; // Already connected
    }

    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'schema-validator';

    try {
      this.client = new MongoClient(connectionString);
      await this.client.connect();
      this.db = this.client.db(dbName);
      console.log(`Connected to MongoDB: ${dbName}`);
    } catch (error: any) {
      console.error('Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Get the database instance
   */
  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.db !== null;
  }
}

export const dbConnection = DatabaseConnection.getInstance();

