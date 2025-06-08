#!/usr/bin/env node

/**
 * API Documentation Validator and Tester
 *
 * This script validates the OpenAPI specification and provides
 * example usage of the API endpoints.
 */

import YAML from "yamljs";
import axios, { AxiosResponse } from "axios";
import path from "path";
import logger from "./helpers/logger";

const BASE_URL: string = "http://localhost:8000"; // Replace with your actual base URL
let swaggerDoc: any;

// OpenAPI specification interfaces
interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, EndpointInfo>>;
}

interface EndpointInfo {
  summary?: string;
  description?: string;
  responses?: Record<string, any>;
}

interface TestResponse {
  success?: boolean;
  data?: any[];
  [key: string]: any;
}

// Load OpenAPI specification
try {
  const openApiPath = path.resolve(__dirname, "./openapi.yaml");
  swaggerDoc = YAML.load(openApiPath) as OpenAPISpec;
  logger.info("✅ OpenAPI specification loaded successfully");
} catch (error: any) {
  logger.error("❌ Failed to load OpenAPI specification:", error.message);
  process.exit(1);
}

async function testEndpoint(
  method: string,
  path: string,
  description: string,
  expectedStatus: number = 200
): Promise<TestResponse | null> {
  try {
    logger.info(`\n🔍 Testing: ${description}`);
    logger.info(`   ${method.toUpperCase()} ${BASE_URL}${path}`);
    let response: AxiosResponse<TestResponse>;

    if (method === "get") {
      response = await axios.get(`${BASE_URL}${path}`);
    } else if (method === "post") {
      response = await axios.post(`${BASE_URL}${path}`, {});
    } else {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }

    logger.info(
      `   ✔️ Status: ${response.status} (Expected: ${expectedStatus})`
    );
    if (response.status !== expectedStatus) {
      logger.warn(
        `   ⚠️ Unexpected status code: ${response.status}. Response:`,
        {
          data: response.data,
        }
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
  } catch (error: any) {
    logger.error(
      `   ❌ Error testing endpoint ${method.toUpperCase()} ${path}: ${
        error.message
      }`
    );
    if (error.response) {
      logger.error("   Error Response Status:", error.response.status);
      logger.error("   Error Response Data:", error.response.data);
    }
    return null;
  }
}

async function runDocumentationTests(): Promise<void> {
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
        const endpointInfo: EndpointInfo = swaggerDoc.paths[pathKey][method];
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

function validateOpenApiSpecStructure(spec: any): boolean {
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

async function main(): Promise<void> {
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
