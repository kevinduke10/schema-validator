import * as amqp from 'amqplib';
import { Schema } from '../types';
import { Configuration } from '../types';

/**
 * Notification actions for RabbitMQ messages
 */
export enum NotificationAction {
  SCHEMA_CREATED = 'SCHEMA_CREATED',
  SCHEMA_UPDATED = 'SCHEMA_UPDATED',
  SCHEMA_DELETED = 'SCHEMA_DELETED',
  CONFIGURATION_CREATED = 'CONFIGURATION_CREATED',
  CONFIGURATION_UPDATED = 'CONFIGURATION_UPDATED',
  CONFIGURATION_DELETED = 'CONFIGURATION_DELETED',
}

/**
 * Notification message format
 */
interface NotificationMessage {
  action: NotificationAction;
  data: Schema | Configuration | { schemaId: string; deletedCount?: number } | { id: string };
}

/**
 * RabbitMQ notification service
 * Only active if RABBIT_MQ_NOTIFICATION_URI and RABBIT_MQ_NOTIFICATION_TOPIC are set
 */
export class NotificationService {
  // Using any to work around amqplib type definition issues
  private static connection: any = null;
  private static channel: any = null;
  private static topic: string | null = null;
  private static isInitialized: boolean = false;

  /**
   * Initialize RabbitMQ connection if environment variables are set
   */
  static async initialize(): Promise<void> {
    const uri = process.env.RABBIT_MQ_NOTIFICATION_URI;
    const topic = process.env.RABBIT_MQ_NOTIFICATION_TOPIC;

    if (!uri || !topic) {
      console.log('RabbitMQ notification service not configured (missing RABBIT_MQ_NOTIFICATION_URI or RABBIT_MQ_NOTIFICATION_TOPIC)');
      return;
    }

    try {
      this.topic = topic;
      this.connection = await amqp.connect(uri);
      if (!this.connection) {
        throw new Error('Failed to establish connection');
      }
      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error('Failed to create channel');
      }
      
      // Assert the topic exchange exists (topic exchange for routing)
      await this.channel.assertExchange(topic, 'topic', {
        durable: true,
      });

      this.isInitialized = true;
      console.log(`RabbitMQ notification service initialized. Publishing to topic: ${topic}`);
    } catch (error: any) {
      console.error('Failed to initialize RabbitMQ notification service:', error.message);
      // Don't throw - allow app to start even if RabbitMQ is unavailable
      this.isInitialized = false;
    }
  }

  /**
   * Check if notification service is available
   */
  static isAvailable(): boolean {
    return this.isInitialized && this.channel !== null && this.connection !== null;
  }

  /**
   * Publish a notification message
   */
  static async publish(action: NotificationAction, data: any): Promise<void> {
    if (!this.isAvailable() || !this.topic) {
      return;
    }

    try {
      const message: NotificationMessage = {
        action,
        data,
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      // Publish to topic exchange with routing key based on action
      // e.g., "SCHEMA_CREATED" becomes routing key "schema.created"
      const routingKey = action.toLowerCase().replace(/_/g, '.');
      
      if (this.channel && this.topic) {
        await this.channel.publish(
          this.topic,
          routingKey,
          messageBuffer,
          {
            persistent: true,
            timestamp: Date.now(),
          }
        );
      }

      console.log(`Published notification: ${action}`);
    } catch (error: any) {
      console.error(`Failed to publish notification ${action}:`, error.message);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Publish schema created notification
   */
  static async notifySchemaCreated(schema: Schema): Promise<void> {
    await this.publish(NotificationAction.SCHEMA_CREATED, schema);
  }

  /**
   * Publish schema updated notification
   */
  static async notifySchemaUpdated(schema: Schema): Promise<void> {
    await this.publish(NotificationAction.SCHEMA_UPDATED, schema);
  }

  /**
   * Publish schema deleted notification
   */
  static async notifySchemaDeleted(schemaId: string, deletedCount: number): Promise<void> {
    await this.publish(NotificationAction.SCHEMA_DELETED, {
      schemaId,
      deletedCount,
    });
  }

  /**
   * Publish configuration created notification
   */
  static async notifyConfigurationCreated(configuration: Configuration): Promise<void> {
    await this.publish(NotificationAction.CONFIGURATION_CREATED, configuration);
  }

  /**
   * Publish configuration updated notification
   */
  static async notifyConfigurationUpdated(configuration: Configuration): Promise<void> {
    await this.publish(NotificationAction.CONFIGURATION_UPDATED, configuration);
  }

  /**
   * Publish configuration deleted notification
   */
  static async notifyConfigurationDeleted(id: string): Promise<void> {
    await this.publish(NotificationAction.CONFIGURATION_DELETED, { id });
  }

  /**
   * Disconnect from RabbitMQ
   */
  static async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isInitialized = false;
      console.log('RabbitMQ notification service disconnected');
    } catch (error: any) {
      console.error('Error disconnecting RabbitMQ notification service:', error.message);
    }
  }
}

