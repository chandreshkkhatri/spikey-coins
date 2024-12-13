const express = require("express");
const router = express.Router();
const { Console } = require('console')
const axios = require("axios");
require("dotenv").config();
const { WebsocketStream } = require('@binance/connector');
const cors = require("cors");
const coingeckoIds = require("../coin-data/coingecko-ids.json");
const coinmarketcap = require("../coin-data/coinmarketcap.json");
const coingeckoUrl = "https://api.coingecko.com/api/v3/";

router.use(cors());
const logger = new Console({ stdout: process.stdout, stderr: process.stderr })
const coingecko_api_key = process.env.COINGECKO_API_KEY

let latestTickerData = [];
const callbacks = {
  open: () => logger.debug('Connected with Websocket server'),
  close: () => logger.debug('Disconnected with Websocket server'),
  message: data => {
    response = JSON.parse(data);
    const tickerMap = new Map(latestTickerData.map(item => [item.s, item]));
    const coinmarketcapMap = new Map(coinmarketcap.map(item => [(item.symbol + "USDT").toUpperCase(), item]));

    response.forEach(item => {
      if (tickerMap.has(item.s)) {
        Object.assign(tickerMap.get(item.s), item);
      } else {
        latestTickerData.push(item);
        
        if (item.s.slice(-4) === "USDT" && coinmarketcapMap.has(item.s)) {
          const market_cap = coinmarketcapMap.get(item.s).market_cap;
          item.market_cap = market_cap;
        }
      }
    });
  }
}
const websocketStreamClient = new WebsocketStream({ logger, callbacks });
websocketStreamClient.ticker();

router.get("/", (req, res) => {
  res.send("Hi, this is the binance router for proxy server");
});
router.get("/24hr", (req, res) => {
  res.send(latestTickerData);
});
router.get("/normalizedVolume", (req, res) => {
  res.send(latestTickerData);
});
router.get("/marketCap", async (req, res) => {
  const coinIds = coingeckoIds.map(item => item.id).join(",");
  const response = await axios.get(`${coingeckoUrl}/coins/markets?x_cg_demo_api_key=${coingecko_api_key}&vs_currency=usd&ids=${coinIds}`);
  console.log(response.data);
  res.send(response.data);
})

module.exports = router;
