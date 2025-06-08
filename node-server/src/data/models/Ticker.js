/**
 * @typedef {object} Ticker
 * Represents the combined ticker data structure stored and served by the API.
 *
 * Properties from Binance stream (!ticker@arr):
 * @property {string} s - Symbol (e.g., "BTCUSDT")
 * @property {string} p - Price change
 * @property {string} P - Price change percent
 * @property {string} c - Last price
 * @property {string} h - High price (24h)
 * @property {string} l - Low price (24h)
 * @property {string} v - Total traded base asset volume (24h)
 * @property {string} q - Total traded quote asset volume (24h)
 * @property {number} E - Event time (timestamp)
 *
 * Properties from CoinGecko (added via MarketDataService):
 * @property {string} [image] - URL of the coin image
 * @property {number} [market_cap] - Market capitalization
 * @property {number} [market_cap_rank] - Market cap rank
 * @property {number} [circulating_supply] - Circulating supply
 * @property {number} [total_supply] - Total supply
 * @property {number} [fully_diluted_valuation] - Fully diluted valuation
 * @property {number} [ath] - All-time high price
 * @property {number} [ath_change_percentage] - Change percentage from ATH
 * @property {string} [ath_date] - Date of ATH
 * @property {number} [atl] - All-time low price
 * @property {number} [atl_change_percentage] - Change percentage from ATL
 * @property {string} [atl_date] - Date of ATL
 *
 * Calculated properties (added via PriceCalculationService & MarketDataService):
 * @property {number} [price] - Parsed last price (from 'c')
 * @property {number} [volume_usd] - Total traded volume in USD (24h)
 * @property {number} [volume_base] - Parsed total traded base asset volume (from 'v')
 * @property {number} [range_position_24h] - Current price's position within the 24h high-low range (0-100%)
 * @property {number} [normalized_volume_score] - Volume score normalized by market cap
 * @property {number | null} [change_1h] - Percentage price change in the last 1 hour
 * @property {number | null} [change_4h] - Percentage price change in the last 4 hours
 * @property {number | null} [change_8h] - Percentage price change in the last 8 hours
 * @property {number | null} [change_12h] - Percentage price change in the last 12 hours
 *
 * @property {string} last_updated - ISO timestamp of when this ticker record was last processed/updated in our system.
 */

// This file primarily serves as a type definition for JSDoc.
