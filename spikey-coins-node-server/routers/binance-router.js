const express = require("express");
const router = express.Router();
const { Console } = require('console')
const { WebsocketStream } = require('@binance/connector');
const Binance = require("node-binance-api");
const cors = require("cors");

router.use(cors());
const binance = new Binance();
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
router.get("/time", (req, res) => {
  binance
    .promiseRequest("v1/time")
    .then((response) => res.send(response.data))
    .catch((err) => {
      console.log(err.response);
      res.status(500).send("Error getting data from binance api");
    });
});
router.get("/ticker/24hr", (req, res) => {
  res.send(latestData);
});

router.get("/klines", (req, res) => {
  const { symbol, interval, limit } = req.query;
  console.log('jo')
  binance
    .candlesticks(symbol, interval, limit)
    .then((response) => {
      console.log(response);
      res.send(response);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error getting data from binance api");
    });
  // res.send('under construction')
});

module.exports = router;
