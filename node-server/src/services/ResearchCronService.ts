/**
 * Research Cron Service
 * Schedules automated research to run every 2 hours
 */

import ResearchService from "./ResearchService.js";
import logger from "../utils/logger.js";

class ResearchCronService {
  private static instance: ResearchCronService;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  private isRunning: boolean = false;
  private quotaExceeded: boolean = false;
  private quotaResetTime: Date | null = null;

  private constructor() {}

  static getInstance(): ResearchCronService {
    if (!ResearchCronService.instance) {
      ResearchCronService.instance = new ResearchCronService();
    }
    return ResearchCronService.instance;
  }

  /**
   * Start the automated research cron job
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('ResearchCronService: Cron job already running');
      return;
    }

    logger.info('ResearchCronService: Starting automated research cron job (runs every 2 hours)');

    // Skip immediate run on startup if disabled via environment variable
    // This prevents quota exhaustion on server restarts
    const skipImmediateRun = process.env.SKIP_RESEARCH_ON_STARTUP === 'true';
    
    if (!skipImmediateRun) {
      // Run immediately on start (but catch errors to prevent startup issues)
      this.runResearch().catch((error) => {
        logger.warn('ResearchCronService: Initial research run failed (will retry on schedule):', error instanceof Error ? error.message : String(error));
      });
    } else {
      logger.info('ResearchCronService: Skipping immediate run on startup (SKIP_RESEARCH_ON_STARTUP=true)');
    }

    // Schedule to run every 2 hours
    this.intervalId = setInterval(() => {
      this.runResearch();
    }, this.INTERVAL_MS);

    logger.info('ResearchCronService: Cron job started successfully');
  }

  /**
   * Stop the automated research cron job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('ResearchCronService: Cron job stopped');
    }
  }

  /**
   * Execute the research job
   */
  private async runResearch(): Promise<void> {
    if (this.isRunning) {
      logger.warn('ResearchCronService: Research already in progress, skipping this run');
      return;
    }

    // Check if quota was exceeded and reset time has passed
    if (this.quotaExceeded && this.quotaResetTime) {
      if (new Date() < this.quotaResetTime) {
        const minutesUntilReset = Math.ceil((this.quotaResetTime.getTime() - Date.now()) / 60000);
        logger.warn(`ResearchCronService: API quota exceeded, skipping research. Will retry in ${minutesUntilReset} minutes.`);
        return;
      } else {
        // Quota should be reset, clear the flag
        logger.info('ResearchCronService: Quota reset time passed, attempting research again');
        this.quotaExceeded = false;
        this.quotaResetTime = null;
      }
    }

    try {
      this.isRunning = true;
      const startTime = Date.now();

      logger.info('ResearchCronService: Starting research job...');

      const researchService = ResearchService.getInstance();

      // Run research for both 24h and 7d timeframes
      await researchService.runAutomatedResearch();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`ResearchCronService: Research job completed in ${duration}s`);
      
      // Reset quota flag on success
      this.quotaExceeded = false;
      this.quotaResetTime = null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if error is quota exceeded
      if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
        this.quotaExceeded = true;
        // Set reset time to 24 hours from now (daily quota reset)
        this.quotaResetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        logger.error('ResearchCronService: API quota exceeded. Research will be skipped until quota resets (approximately 24 hours).');
      } else {
        logger.error('ResearchCronService: Error during research job:', error);
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger research (for testing or admin actions)
   */
  async triggerManually(timeframe: '24h' | '7d' = '24h'): Promise<void> {
    logger.info(`ResearchCronService: Manual trigger requested for ${timeframe}`);

    const researchService = ResearchService.getInstance();
    await researchService.runAutomatedResearch(timeframe);

    logger.info(`ResearchCronService: Manual research completed for ${timeframe}`);
  }

  /**
   * Get cron job status
   */
  getStatus(): { running: boolean; interval: string; isExecuting: boolean; quotaExceeded: boolean; quotaResetTime: string | null } {
    return {
      running: this.intervalId !== null,
      interval: '2 hours',
      isExecuting: this.isRunning,
      quotaExceeded: this.quotaExceeded,
      quotaResetTime: this.quotaResetTime ? this.quotaResetTime.toISOString() : null,
    };
  }
}

export default ResearchCronService;
