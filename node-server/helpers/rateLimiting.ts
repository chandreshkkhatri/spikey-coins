/**
 * Rate limiting utilities
 */

// Rate limiting and monitoring state
let requestCount: number = 0;
let lastRequestReset: number = Date.now();
const REQUEST_WINDOW: number = 60000; // 1 minute window
const MAX_REQUESTS_PER_MINUTE: number = 50; // Conservative limit (well under Binance's 1200/min)

interface RateLimitingStatus {
  requestsInCurrentWindow: number;
  maxRequestsPerWindow: number;
  windowResetTime: string;
}

/**
 * Check if we can make a request without hitting rate limits
 * @returns Whether a request can be made
 */
function canMakeRequest(): boolean {
  const now = Date.now();

  // Reset counter every minute
  if (now - lastRequestReset > REQUEST_WINDOW) {
    requestCount = 0;
    lastRequestReset = now;
  }

  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  requestCount++;
  return true;
}

/**
 * Get current rate limiting status
 * @returns Rate limiting information
 */
function getRateLimitingStatus(): RateLimitingStatus {
  return {
    requestsInCurrentWindow: requestCount,
    maxRequestsPerWindow: MAX_REQUESTS_PER_MINUTE,
    windowResetTime: new Date(lastRequestReset + REQUEST_WINDOW).toISOString(),
  };
}

export {
  canMakeRequest,
  getRateLimitingStatus,
  REQUEST_WINDOW,
  MAX_REQUESTS_PER_MINUTE,
  type RateLimitingStatus,
};
