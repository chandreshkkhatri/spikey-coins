const express = require("express");
const router = express.Router();
const Binance = require("node-binance-api");
const cors = require("cors");
const axios = require("axios");
// var bodyParser = require('body-parser');
// router.use(bodyParser.json()); // for parsing application/json
// router.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

router.use(cors());
const binance = new Binance();
// const api = {
//     api_endpoint: 'https://api.binance.com',
//     testConnectivity() {
//         return axios.get(this.api_endpoint + '/api/v1/ping')
//     },
//     getServerTime() {
//         return axios.get(this.api_endpoint + '/api/v1/time')
//     },
//     getExchangeInfo() {
//         return axios.get(this.api_endpoint + '/api/v1/exchangeInfo')
//     },
//     getCandleStickData(symbol, interval, limit) {
//         return axios.get(`${this.api_endpoint}/api/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`) //&startTime=${startTime}&endTime=${endTime}
//     },
//     get24hrTicker() {
//         return axios.get(this.api_endpoint + '/api/v1/ticker/24hr')
//     }
// }

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
  binance
    .prevDay()
    .then((response) => {
      res.send(response);
    })
    .catch((err) => {
      console.log(err.response);
      res.status(500).send("Error getting data from binance api");
    });
  // res.send('under construction')
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
