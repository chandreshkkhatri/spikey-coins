/**
 * MongoDB Database Connection Service
 * Handles connection management and provides database instance
 */

import { MongoClient, Db } from 'mongodb';
import logger from '../utils/logger.js';

class DatabaseConnection {
  private static client: MongoClient | null = null;
  private static db: Db | null = null;
  private static isConnected = false;

  // MongoDB connection configuration
  private static readonly CONNECTION_STRING = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  private static readonly DATABASE_NAME = process.env.DATABASE_NAME || 'spikey_coins';
  private static readonly CONNECTION_OPTIONS = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // Use IPv4, skip trying IPv6
  };

  /**
   * Initialize MongoDB connection
   */
  static async initialize(): Promise<void> {
    if (this.isConnected && this.client && this.db) {
      return;
    }

    try {
      logger.info(`DatabaseConnection: Connecting to MongoDB at ${this.CONNECTION_STRING}`);
      
      this.client = new MongoClient(this.CONNECTION_STRING, this.CONNECTION_OPTIONS);
      await this.client.connect();
      
      this.db = this.client.db(this.DATABASE_NAME);
      this.isConnected = true;
      
      logger.info(`DatabaseConnection: Successfully connected to database '${this.DATABASE_NAME}'`);
      
      // Test connection
      await this.db.admin().ping();
      logger.info('DatabaseConnection: Database ping successful');
      
    } catch (error) {
      logger.error('DatabaseConnection: Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get database instance
   */
  static getDatabase(): Db {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get connection status
   */
  static isConnectionReady(): boolean {
    return this.isConnected && this.client !== null && this.db !== null;
  }

  /**
   * Get connection info
   */
  static getConnectionInfo(): any {
    return {
      isConnected: this.isConnected,
      databaseName: this.DATABASE_NAME,
      connectionString: this.CONNECTION_STRING.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
    };
  }

  /**
   * Close database connection
   */
  static async cleanup(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        logger.info('DatabaseConnection: MongoDB connection closed');
      } catch (error) {
        logger.error('DatabaseConnection: Error closing connection:', error);
      } finally {
        this.client = null;
        this.db = null;
        this.isConnected = false;
      }
    }
  }
}

export default DatabaseConnection;