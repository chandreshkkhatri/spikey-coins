import app from "./tests/testApp";
import logger from "./helpers/logger";
import { Application } from "express";

// Type definitions for Express internal structures
interface RouteLayer {
  route?: {
    methods: Record<string, boolean>;
    path: string;
  };
  name?: string;
  regexp?: {
    source: string;
  };
  handle?: {
    stack?: HandlerLayer[];
  };
}

interface HandlerLayer {
  route?: {
    methods: Record<string, boolean>;
    path: string;
  };
  name?: string;
  regexp?: {
    source: string;
  };
  handle?: {
    stack?: RouteLayer[];
  };
  stack?: Array<{ name: string }>;
}

interface ExpressApp extends Application {
  _router: {
    stack: RouteLayer[];
  };
}

// Debug: Print all registered routes
function printRoutes(app: ExpressApp): void {
  logger.info("Registered routes:");
  app._router.stack.forEach((layer: RouteLayer) => {
    if (layer.route) {
      logger.info(`${Object.keys(layer.route.methods)} ${layer.route.path}`);
    } else if (layer.name === "router") {
      logger.info("Router middleware found");
      if (layer.regexp) {
        logger.info("  Router pattern:", layer.regexp.source);
      }
      if (layer.handle?.stack) {
        layer.handle.stack.forEach((handler: HandlerLayer) => {
          if (handler.route) {
            logger.info(
              `    ${Object.keys(handler.route.methods)} ${handler.route.path}`
            );
          } else if (handler.name === "router") {
            logger.info("  Router middleware found");
            if (handler.regexp) {
              logger.info("    Router pattern:", handler.regexp.source);
            }
            if (handler.handle?.stack) {
              handler.handle.stack.forEach((route: any, i: number) => {
                if (route.route && route.stack) {
                  logger.info(
                    `      [${i}] ${route.stack[0]?.name} -> ${route.route.path}`
                  );
                }
              });
            }
          }
        });
      }
    }
  });
}

printRoutes(app as ExpressApp);
