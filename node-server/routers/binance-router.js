const express = require("express");
const router = express.Router();
const { Console } = require('console')
const { WebsocketStream } = require('@binance/connector');
const cors = require("cors");

router.use(cors());
const logger = new Console({ stdout: process.stdout, stderr: process.stderr })

let latestData = null;
const callbacks = {
  open: () => logger.debug('Connected with Websocket server'),
  close: () => logger.debug('Disconnected with Websocket server'),
  message: data => {
    latestData = JSON.parse(data);
  }
}
const websocketStreamClient = new WebsocketStream({ logger, callbacks });
websocketStreamClient.ticker();

router.get("/", (req, res) => {
  res.send("Hi, this is the binance router for proxy server");
});
router.get("/ticker/24hr", (req, res) => {
  res.send(latestData);
});

module.exports = router;
