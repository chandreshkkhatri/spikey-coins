/**
 * Rate limiting utilities
 */

// Rate limiting and monitoring state
let requestCount = 0;
let lastRequestReset = Date.now();
const REQUEST_WINDOW_MS = 60000; // 1 minute window in milliseconds
const MAX_REQUESTS_PER_WINDOW = 50; // Conservative limit (well under Binance's 1200/min)

/**
 * Check if we can make a request without hitting rate limits.
 * Increments the request counter if a request can be made.
 * @returns {boolean} Whether a request can be made.
 */
function canMakeRequest() {
  const now = Date.now();

  // Reset counter if the window has passed
  if (now - lastRequestReset > REQUEST_WINDOW_MS) {
    requestCount = 0;
    lastRequestReset = now;
  }

  if (requestCount < MAX_REQUESTS_PER_WINDOW) {
    requestCount++;
    return true;
  }

  return false;
}

/**
 * Get current rate limiting status.
 * @returns {object} Rate limiting information.
 */
function getRateLimitingStatus() {
  const timeRemainingInWindow =
    REQUEST_WINDOW_MS - (Date.now() - lastRequestReset);
  return {
    requestsInCurrentWindow: requestCount,
    maxRequestsPerWindow: MAX_REQUESTS_PER_WINDOW,
    windowResetsInMs: Math.max(0, timeRemainingInWindow), // Ensure it's not negative
    windowResetTimeISO: new Date(
      lastRequestReset + REQUEST_WINDOW_MS
    ).toISOString(),
  };
}

module.exports = {
  canMakeRequest,
  getRateLimitingStatus,
  REQUEST_WINDOW_MS,
  MAX_REQUESTS_PER_WINDOW,
};
