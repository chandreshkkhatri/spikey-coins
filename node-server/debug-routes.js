const app = require("./tests/testApp");
const logger = require("./helpers/logger");

// Debug: Print all registered routes
function printRoutes(app) {
  logger.info("Registered routes:");
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      logger.info(`${Object.keys(layer.route.methods)} ${layer.route.path}`);
    } else if (layer.name === "router") {
      logger.info("Router middleware found");
      if (layer.regexp) {
        logger.info("  Router pattern:", layer.regexp.source);
      }
      if (layer.handle.stack) {
        layer.handle.stack.forEach((handler) => {
          if (handler.route) {
            logger.info(
              `    ${Object.keys(handler.route.methods)} ${handler.route.path}`
            );
          } else if (handler.name === "router") {
            logger.info("  Router middleware found");
            if (handler.regexp) {
              logger.info("    Router pattern:", handler.regexp.source);
            }
            if (handler.handle.stack) {
              handler.handle.stack.forEach((route, i) => {
                logger.info(
                  `      [${i}] ${route.stack[0].name} -> ${route.route.path}`
                );
              });
            }
          }
        });
      }
    }
  });
}

printRoutes(app);
