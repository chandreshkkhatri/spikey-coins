/**
 * CandlestickStorageService
 * Handles persistent storage and retrieval of candlestick data to/from files.
 * Implements file-based storage with daily rotation and metadata tracking.
 */
import fs from "fs/promises";
import path from "path";
import logger from "../utils/logger.js";
import { Candlestick } from "../data/models/Candlestick.js";

interface StorageMetadata {
  lastUpdated: string;
  version: string;
  symbolCount: number;
  totalRecords: number;
  updateFrequencyMinutes: number;
}

interface SymbolCandlestickData {
  symbol: string;
  intervals: Record<string, Candlestick[]>;
  lastUpdated: string;
}

class CandlestickStorageService {
  private static readonly STORAGE_DIR = "coin-data/candlesticks";
  private static readonly CURRENT_DIR = `${this.STORAGE_DIR}/current`;
  private static readonly DAILY_DIR = `${this.STORAGE_DIR}/daily`;
  private static readonly METADATA_FILE = `${this.STORAGE_DIR}/metadata.json`;
  
  /**
   * Initialize storage directories and metadata file
   */
  static async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await fs.mkdir(this.STORAGE_DIR, { recursive: true });
      await fs.mkdir(this.CURRENT_DIR, { recursive: true });
      await fs.mkdir(this.DAILY_DIR, { recursive: true });

      // Initialize metadata if it doesn't exist
      try {
        await fs.access(this.METADATA_FILE);
      } catch {
        const initialMetadata: StorageMetadata = {
          lastUpdated: new Date().toISOString(),
          version: "1.0.0",
          symbolCount: 0,
          totalRecords: 0,
          updateFrequencyMinutes: 15
        };
        await this.saveMetadata(initialMetadata);
        logger.info("CandlestickStorageService: Initialized metadata file");
      }

      logger.info("CandlestickStorageService: Initialized successfully");
    } catch (error) {
      logger.error("CandlestickStorageService: Failed to initialize", error);
      throw error;
    }
  }

  /**
   * Save candlestick data for a symbol to persistent storage
   */
  static async saveCandlestickData(
    symbol: string,
    intervalData: Record<string, Candlestick[]>
  ): Promise<void> {
    try {
      const symbolData: SymbolCandlestickData = {
        symbol: symbol.toLowerCase(),
        intervals: intervalData,
        lastUpdated: new Date().toISOString()
      };

      const filePath = path.join(this.CURRENT_DIR, `${symbol.toLowerCase()}.json`);
      await fs.writeFile(filePath, JSON.stringify(symbolData, null, 2));
      
      logger.debug(`CandlestickStorageService: Saved data for ${symbol} to ${filePath}`);
    } catch (error) {
      logger.error(`CandlestickStorageService: Failed to save data for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * Load candlestick data for a symbol from persistent storage
   */
  static async loadCandlestickData(symbol: string): Promise<Record<string, Candlestick[]> | null> {
    try {
      const filePath = path.join(this.CURRENT_DIR, `${symbol.toLowerCase()}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const symbolData: SymbolCandlestickData = JSON.parse(data);
      
      logger.debug(`CandlestickStorageService: Loaded data for ${symbol} from ${filePath}`);
      return symbolData.intervals;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.debug(`CandlestickStorageService: No stored data found for ${symbol}`);
        return null;
      }
      logger.error(`CandlestickStorageService: Failed to load data for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * Save all current candlestick data (bulk operation)
   */
  static async saveAllCandlestickData(
    symbolsData: Map<string, Record<string, Candlestick[]>>
  ): Promise<void> {
    try {
      const savePromises: Promise<void>[] = [];
      
      for (const [symbol, intervalData] of symbolsData.entries()) {
        savePromises.push(this.saveCandlestickData(symbol, intervalData));
      }

      await Promise.all(savePromises);
      
      // Update metadata
      const metadata = await this.loadMetadata();
      metadata.lastUpdated = new Date().toISOString();
      metadata.symbolCount = symbolsData.size;
      metadata.totalRecords = Array.from(symbolsData.values())
        .reduce((total, intervals) => 
          total + Object.values(intervals).reduce((sum, candles) => sum + candles.length, 0), 0);
      
      await this.saveMetadata(metadata);
      logger.info(`CandlestickStorageService: Saved data for ${symbolsData.size} symbols`);
    } catch (error) {
      logger.error("CandlestickStorageService: Failed to save all candlestick data", error);
      throw error;
    }
  }

  /**
   * Load all candlestick data (bulk operation)
   */
  static async loadAllCandlestickData(): Promise<Map<string, Record<string, Candlestick[]>>> {
    try {
      const symbolsData = new Map<string, Record<string, Candlestick[]>>();
      const files = await fs.readdir(this.CURRENT_DIR);
      
      const loadPromises = files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const symbol = path.basename(file, '.json');
          const data = await this.loadCandlestickData(symbol);
          if (data) {
            symbolsData.set(symbol, data);
          }
        });

      await Promise.all(loadPromises);
      logger.info(`CandlestickStorageService: Loaded data for ${symbolsData.size} symbols`);
      return symbolsData;
    } catch (error) {
      logger.error("CandlestickStorageService: Failed to load all candlestick data", error);
      throw error;
    }
  }

  /**
   * Create daily backup of current data
   */
  static async createDailyBackup(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const backupDir = path.join(this.DAILY_DIR, today);
      
      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });
      
      // Copy current files to backup
      const files = await fs.readdir(this.CURRENT_DIR);
      const copyPromises = files.map(async (file) => {
        const srcPath = path.join(this.CURRENT_DIR, file);
        const destPath = path.join(backupDir, file);
        await fs.copyFile(srcPath, destPath);
      });

      await Promise.all(copyPromises);
      
      // Copy metadata
      const metadataDestPath = path.join(backupDir, 'metadata.json');
      await fs.copyFile(this.METADATA_FILE, metadataDestPath);
      
      logger.info(`CandlestickStorageService: Created daily backup in ${backupDir}`);
    } catch (error) {
      logger.error("CandlestickStorageService: Failed to create daily backup", error);
      throw error;
    }
  }

  /**
   * Clean old daily backups (keep last N days)
   */
  static async cleanOldBackups(daysToKeep: number = 7): Promise<void> {
    try {
      const backupDirs = await fs.readdir(this.DAILY_DIR);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const deletePromises = backupDirs
        .filter(dir => {
          const dirDate = new Date(dir);
          return dirDate < cutoffDate;
        })
        .map(async (dir) => {
          const dirPath = path.join(this.DAILY_DIR, dir);
          await fs.rm(dirPath, { recursive: true, force: true });
          logger.debug(`CandlestickStorageService: Deleted old backup ${dir}`);
        });

      await Promise.all(deletePromises);
      logger.info(`CandlestickStorageService: Cleaned backups older than ${daysToKeep} days`);
    } catch (error) {
      logger.error("CandlestickStorageService: Failed to clean old backups", error);
      throw error;
    }
  }

  /**
   * Save metadata to file
   */
  private static async saveMetadata(metadata: StorageMetadata): Promise<void> {
    await fs.writeFile(this.METADATA_FILE, JSON.stringify(metadata, null, 2));
  }

  /**
   * Load metadata from file
   */
  private static async loadMetadata(): Promise<StorageMetadata> {
    try {
      const data = await fs.readFile(this.METADATA_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.warn("CandlestickStorageService: Failed to load metadata, using defaults");
      return {
        lastUpdated: new Date().toISOString(),
        version: "1.0.0",
        symbolCount: 0,
        totalRecords: 0,
        updateFrequencyMinutes: 15
      };
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    metadata: StorageMetadata;
    filesCount: number;
    totalSizeBytes: number;
  }> {
    try {
      const metadata = await this.loadMetadata();
      const files = await fs.readdir(this.CURRENT_DIR);
      
      let totalSize = 0;
      for (const file of files) {
        const filePath = path.join(this.CURRENT_DIR, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return {
        metadata,
        filesCount: files.length,
        totalSizeBytes: totalSize
      };
    } catch (error) {
      logger.error("CandlestickStorageService: Failed to get storage stats", error);
      throw error;
    }
  }
}

export default CandlestickStorageService; 