/**
 * Rate limiting utilities
 */

// Rate limiting and monitoring state
let requestCount = 0;
let lastRequestReset = Date.now();
const REQUEST_WINDOW = 60000; // 1 minute window
const MAX_REQUESTS_PER_MINUTE = 50; // Conservative limit (well under Binance's 1200/min)

/**
 * Check if we can make a request without hitting rate limits
 * @returns {boolean} Whether a request can be made
 */
function canMakeRequest() {
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
 * @returns {Object} Rate limiting information
 */
function getRateLimitingStatus() {
  return {
    requestsInCurrentWindow: requestCount,
    maxRequestsPerWindow: MAX_REQUESTS_PER_MINUTE,
    windowResetTime: new Date(lastRequestReset + REQUEST_WINDOW).toISOString(),
  };
}

module.exports = {
  canMakeRequest,
  getRateLimitingStatus,
  REQUEST_WINDOW,
  MAX_REQUESTS_PER_MINUTE,
};
