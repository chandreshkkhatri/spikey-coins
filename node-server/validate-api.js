#!/usr/bin/env node

/**
 * API Documentation Validator and Tester
 *
 * This script validates the OpenAPI specification and provides
 * example usage of the API endpoints.
 */

const YAML = require("yamljs");
const axios = require("axios");
const path = require("path");
const logger = require("./helpers/logger"); // Import the logger

const BASE_URL = "http://localhost:8000"; // Replace with your actual base URL
let swaggerDoc;

// Load OpenAPI specification
try {
  const openApiPath = path.resolve(__dirname, "./openapi.yaml");
  swaggerDoc = YAML.load(openApiPath);
  logger.info("✅ OpenAPI specification loaded successfully");
} catch (error) {
  logger.error("❌ Failed to load OpenAPI specification:", error.message);
  process.exit(1);
}

async function testEndpoint(method, path, description, expectedStatus = 200) {
  try {
    logger.info(`\n🔍 Testing: ${description}`);
    logger.info(`   ${method.toUpperCase()} ${BASE_URL}${path}`);
    let response;
    if (method === "get") {
      response = await axios.get(`${BASE_URL}${path}`);
    } else if (method === "post") {
      // response = await axios.post(`${BASE_URL}${path}`, {}); // Example for POST
    }

    logger.info(
      `   ✔️ Status: ${response.status} (Expected: ${expectedStatus})`
    );
    if (response.status !== expectedStatus) {
      logger.warn(
        `   ⚠️ Unexpected status code: ${response.status}. Response:`,
        {
          data: response.data,
        } // Pass response.data as an object for better logging
      );
    } else {
      if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        logger.info(`   📊 Data count: ${response.data.data.length}`);
      }
      if (typeof response.data.success !== "undefined") {
        logger.info(`   🎯 Success: ${response.data.success}`);
      }
    }
    return response.data;
  } catch (error) {
    logger.error(
      `   ❌ Error testing endpoint ${method.toUpperCase()} ${path}: ${
        error.message
      }`
    );
    if (error.response) {
      logger.error("   Error Response Status:", error.response.status);
      logger.error("   Error Response Data:", error.response.data);
    }
    return null; // Return null or throw error as appropriate
  }
}

async function runDocumentationTests() {
  if (!swaggerDoc) {
    logger.error("OpenAPI spec not loaded. Exiting tests.");
    return;
  }
  logger.info("🚀 Starting API Documentation Tests");
  logger.info(`📡 Base URL: ${BASE_URL}`);
  logger.info("─".repeat(60));

  if (swaggerDoc && swaggerDoc.paths) {
    for (const pathKey in swaggerDoc.paths) {
      for (const method in swaggerDoc.paths[pathKey]) {
        const endpointInfo = swaggerDoc.paths[pathKey][method];
        const description =
          endpointInfo.summary ||
          endpointInfo.description ||
          `Test ${method.toUpperCase()} ${pathKey}`;
        // Assuming 200 for GET, 201 for POST, etc. Adjust as needed.
        const expectedStatus = method.toLowerCase() === "post" ? 201 : 200;
        await testEndpoint(method, pathKey, description, expectedStatus);
      }
    }
  }

  logger.info("\n" + "─".repeat(60));
  logger.info("✨ API Documentation Testing Complete!");
  logger.info(`\n📚 View interactive documentation at: ${BASE_URL}/docs`);
  logger.info(`📄 OpenAPI spec available at: ${BASE_URL}/openapi.json`);
}

function validateOpenApiSpecStructure(spec) {
  logger.info("\n🔍 Validating OpenAPI Specification Structure...");
  const requiredTopLevelFields = ["openapi", "info", "paths"];
  const missingFields = requiredTopLevelFields.filter((field) => !spec[field]);

  if (missingFields.length > 0) {
    logger.error(
      `❌ Missing required fields in OpenAPI spec: ${missingFields.join(", ")}`
    );
    return false;
  }

  if (!spec.info || !spec.info.title || !spec.info.version) {
    logger.error(
      "❌ Missing required fields in info object: title and version"
    );
    return false;
  }

  logger.info("✅ OpenAPI specification structure is valid");
  logger.info(`   📖 Title: ${spec.info.title}`);
  logger.info(`   🏷️ Version: ${spec.info.version}`);
  return true;
}

async function main() {
  if (!swaggerDoc) {
    logger.error("Swagger document not loaded. Cannot run tests.");
    return;
  }
  if (validateOpenApiSpecStructure(swaggerDoc)) {
    await runDocumentationTests();
  }
}

main().catch((error) => {
  logger.error("Unhandled error during script execution:", error);
});
