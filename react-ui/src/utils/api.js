import axios from "axios";
const config = require("./config.json");

const api_endpoint = config.base_url;

const api = {
  api_endpoint: api_endpoint,
  get24hrTicker() {
    return axios.get(this.api_endpoint + "api/ticker/24hr");
  },
  refreshMarketcapData() {
    return axios.get(this.api_endpoint + "api/ticker/refreshMarketcapData");
  },
};

export { api };
