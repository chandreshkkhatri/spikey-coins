#!/usr/bin/env node

/**
 * API Documentation Validator and Tester
 *
 * This script validates the OpenAPI specification and provides
 * example usage of the API endpoints.
 */

const axios = require("axios");
const YAML = require("yamljs");

// Configuration
const BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";
const TIMEOUT = 10000; // 10 seconds

// Load OpenAPI spec
let swaggerDoc;
try {
  swaggerDoc = YAML.load("./openapi.yaml");
  console.log("✅ OpenAPI specification loaded successfully");
} catch (error) {
  console.error("❌ Failed to load OpenAPI specification:", error.message);
  process.exit(1);
}

/**
 * Test an API endpoint
 */
async function testEndpoint(method, path, description) {
  try {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   ${method.toUpperCase()} ${BASE_URL}${path}`);

    const response = await axios({
      method,
      url: `${BASE_URL}${path}`,
      timeout: TIMEOUT,
      validateStatus: () => true, // Accept any status code
    });

    const statusText = response.status < 400 ? "✅" : "⚠️";
    console.log(
      `   ${statusText} Status: ${response.status} ${response.statusText}`
    );

    if (response.data) {
      if (typeof response.data === "object") {
        const keys = Object.keys(response.data);
        console.log(
          `   📄 Response keys: ${keys.slice(0, 5).join(", ")}${
            keys.length > 5 ? "..." : ""
          }`
        );

        // Show specific info for different endpoints
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`   📊 Data count: ${response.data.data.length}`);
        }
        if (response.data.success !== undefined) {
          console.log(`   🎯 Success: ${response.data.success}`);
        }
      }
    }

    return response;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Main testing function
 */
async function runTests() {
  console.log("🚀 Starting API Documentation Tests");
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log("─".repeat(60));

  // Test health endpoints
  await testEndpoint("GET", "/", "Server Health Check");
  await testEndpoint("GET", "/api/ticker", "Ticker Router Health Check");

  // Test main API endpoints
  await testEndpoint("GET", "/api/ticker/24hr", "24-Hour Ticker Data");
  await testEndpoint("GET", "/api/ticker/candlestick", "Candlestick Summary");
  await testEndpoint(
    "GET",
    "/api/ticker/candlestick/BTCUSDT",
    "Bitcoin Candlestick Data"
  );
  await testEndpoint("GET", "/api/ticker/marketCap", "Market Cap Data");

  // Test documentation endpoints
  await testEndpoint("GET", "/openapi.json", "OpenAPI Specification");

  console.log("\n" + "─".repeat(60));
  console.log("✨ API Documentation Testing Complete!");
  console.log(`\n📚 View interactive documentation at: ${BASE_URL}/docs`);
  console.log(`📄 OpenAPI spec available at: ${BASE_URL}/openapi.json`);
}

/**
 * Validate OpenAPI specification
 */
function validateSpec() {
  console.log("\n🔍 Validating OpenAPI Specification...");

  const requiredFields = ["openapi", "info", "paths"];
  const missingFields = requiredFields.filter((field) => !swaggerDoc[field]);

  if (missingFields.length > 0) {
    console.log(`❌ Missing required fields: ${missingFields.join(", ")}`);
    return false;
  }

  console.log("✅ OpenAPI specification structure is valid");
  console.log(`   📖 Title: ${swaggerDoc.info.title}`);
  console.log(`   🔖 Version: ${swaggerDoc.info.version}`);
  console.log(`   🛣️  Paths: ${Object.keys(swaggerDoc.paths).length}`);
  console.log(
    `   🏷️  Schemas: ${
      Object.keys(swaggerDoc.components?.schemas || {}).length
    }`
  );

  return true;
}

/**
 * Display usage examples
 */
function showUsageExamples() {
  console.log("\n" + "=".repeat(60));
  console.log("📋 USAGE EXAMPLES");
  console.log("=".repeat(60));

  const examples = [
    {
      title: "Get all ticker data with short-term changes",
      command: `curl "${BASE_URL}/api/ticker/24hr" | jq '.data[0]'`,
    },
    {
      title: "Get Bitcoin candlestick data",
      command: `curl "${BASE_URL}/api/ticker/candlestick/BTCUSDT" | jq '.data[-1]'`,
    },
    {
      title: "Get market cap data",
      command: `curl "${BASE_URL}/api/ticker/marketCap" | jq '.data[0]'`,
    },
    {
      title: "Check server health",
      command: `curl "${BASE_URL}/" | jq '.'`,
    },
  ];

  examples.forEach((example, index) => {
    console.log(`\n${index + 1}. ${example.title}:`);
    console.log(`   ${example.command}`);
  });

  console.log("\n" + "=".repeat(60));
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
API Documentation Validator and Tester

Usage:
  node validate-api.js [options]

Options:
  --test, -t     Run API endpoint tests
  --validate     Validate OpenAPI specification only
  --examples     Show usage examples
  --help, -h     Show this help message

Environment Variables:
  API_BASE_URL   Base URL for API testing (default: http://localhost:8000)

Examples:
  node validate-api.js --test
  node validate-api.js --validate
  API_BASE_URL=https://api.example.com node validate-api.js --test
`);
  process.exit(0);
}

// Run based on arguments
async function main() {
  if (args.includes("--validate")) {
    validateSpec();
  } else if (args.includes("--examples")) {
    showUsageExamples();
  } else if (
    args.includes("--test") ||
    args.includes("-t") ||
    args.length === 0
  ) {
    validateSpec();
    await runTests();
    showUsageExamples();
  }
}

main().catch(console.error);
