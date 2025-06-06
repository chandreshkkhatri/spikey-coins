const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

const logsDir = path.join(__dirname, "../logs");

// Define the log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    (info) =>
      `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message} ${
        info.splat !== undefined
          ? `${info.splat.map((arg) => JSON.stringify(arg)).join(" ")}`
          : ""
      }`
  )
);

// Create a new Winston logger instance
const logger = winston.createLogger({
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Add colorize for console output
        logFormat
      ),
      level: process.env.NODE_ENV === "development" ? "debug" : "info", // Log debug in dev, info in prod
    }),
    // Daily rotate file transport for all logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, "application-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true, // Archive old logs
      maxSize: "20m", // Rotate if log file exceeds 20MB
      maxFiles: "14d", // Keep logs for 14 days
      level: "debug", // Log all levels to this file (debug, info, warn, error)
    }),
    // Separate file for error logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d", // Keep error logs for 30 days
      level: "error", // Only log errors to this file
    }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Stream for morgan (HTTP request logger)
logger.stream = {
  write: function (message, encoding) {
    logger.info(message.trim());
  },
};

module.exports = logger;
