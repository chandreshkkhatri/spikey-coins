const express = require('express')
const router = express.Router()
const cors = require('cors')
const axios = require('axios')
// var bodyParser = require('body-parser');
// router.use(bodyParser.json()); // for parsing application/json
// router.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

router.use(cors())


const api = {
    api_endpointv1: 'https://api.bittrex.com/api/v1.1',
    api_endpointv2: 'https://international.bittrex.com/Api/v2.0',
    getCurrencies() {
        return axios.get(this.api_endpointv1 + '/public/getcurrencies')
    },
    getTicker() {
        return axios.get(this.api_endpointv1 + '/public/getticker')
    },
    getSummaries() {
        return axios.get(this.api_endpointv1 + '/public/getmarketsummaries')
    },
    getCandles(start, marketName, tickInterval) {
        return axios.get(this.api_endpointv2 + `/pub/market/GetTicks?_=${start}&marketName=${marketName}&tickInterval=${tickInterval}`)
        //start 1499127220008 marketName=BTC-WAVES&tickInterval=thirtyMin
    }
}

router.get('/', (req, res) => {
    res.send('Hi, this is the poloniex router for proxy server')
})
router.get('/get-ticker', (req, res) => {
    api.getTicker()
        .then((response) => res.send(response.data))
        .catch((err) => {
            console.log(err)
            res.status(500).send('Error fetching data from bittrex api')
        })
})
router.get('/get-currencies', (req, res) => {
    api.getCurrencies()
        .then((response) => res.send(response.data))
        .catch((err) => {
            console.log(err)
            res.status(500).send('Error fetching data from bittrex api')
        })
})
router.get('/get-market-summaries', (req, res) => {
    api.getSummaries()
        .then((response) => res.send(response.data))
        .catch((err) => {
            console.log(err)
            res.status(500).send('Error fetching data from bittrex api')
        })
})
router.get('/get-candles', (req, res) => {
    let { start, marketName, tickInterval } = req.query
    api.getCandles(start, marketName, tickInterval)
        .then((response) => res.send(response.data))
        .catch((err) => {
            console.log(err)
            res.status(500).send('Error fetching data from bittrex api')
        })
})

module.exports = router