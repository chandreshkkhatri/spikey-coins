const app = require("./tests/testApp");

// Debug: Print all registered routes
function printRoutes(app) {
  console.log("Registered routes:");
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      console.log(`${Object.keys(layer.route.methods)} ${layer.route.path}`);
    } else if (layer.name === "router") {
      console.log("Router middleware found");
      if (layer.regexp.source) {
        console.log("  Router pattern:", layer.regexp.source);
      }
      if (layer.handle && layer.handle.stack) {
        layer.handle.stack.forEach((subLayer) => {
          if (subLayer.route) {
            console.log(
              `  -> ${Object.keys(subLayer.route.methods)} ${
                subLayer.route.path
              }`
            );
          }
        });
      }
    }
  });
}

printRoutes(app);
