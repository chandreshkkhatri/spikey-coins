import axios from "axios";
const cred = require("./cred.json");

const binance_endpoint = cred.binance_endpoint;

const binance = {
  api_endpoint: binance_endpoint,
  getServerTime() {
    return axios.get(this.api_endpoint + "/time");
  },
  getCandleStickData(symbol, interval, limit) {
    return axios.get(
      `${
        this.api_endpoint
      }/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    ); //&startTime=${startTime}&endTime=${endTime}
  },
  get24hrTicker() {
    return axios.get(this.api_endpoint + "/ticker/24hr");
  },
};

export { binance };
