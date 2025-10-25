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

    // Run immediately on start
    this.runResearch();

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

    try {
      this.isRunning = true;
      const startTime = Date.now();

      logger.info('ResearchCronService: Starting research job...');

      const researchService = ResearchService.getInstance();

      // Run research for both 24h and 7d timeframes
      await researchService.runAutomatedResearch();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`ResearchCronService: Research job completed in ${duration}s`);
    } catch (error) {
      logger.error('ResearchCronService: Error during research job:', error);
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
  getStatus(): { running: boolean; interval: string; isExecuting: boolean } {
    return {
      running: this.intervalId !== null,
      interval: '2 hours',
      isExecuting: this.isRunning,
    };
  }
}

export default ResearchCronService;
