const express = require("express");
const cors = require("cors");

// Configuration
const PORT = process.env.PORT || 8000;
const app = express();

// Import routers
const tickerRouter = require("./routers/ticker-router");

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/ticker", tickerRouter);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Spikey Coins Proxy Server",
    description: "Tunneling requests to bypass CORS issues",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Proxy server listening on port ${PORT}`);
  console.log(`📊 Ticker API available at http://localhost:${PORT}/api/ticker`);
});
