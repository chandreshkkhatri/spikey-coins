const express = require('express')
const router = express.Router()
const cors = require('cors')
const axios = require('axios')
// var bodyParser = require('body-parser');
// router.use(bodyParser.json()); // for parsing application/json
// router.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

router.use(cors())


const api = {
    api_endpoint: 'https://poloniex.com/public',
    returnTicker() {
        return axios.get(this.api_endpoint + '?command=returnTicker')
    },
    returnCurrencies() {
        return axios.get(this.api_endpoint + '?command=returnCurrencies')
    },
    returnChartData(coin_pair, start, end, period) {
        return axios.get(this.api_endpoint + `?command=returnChartData&currencyPair=${coin_pair}&start=${start}&end=${end}&period=${period}`)
    }
}

router.get('/', (req, res) => {
    res.send('Hi, this is the poloniex router for proxy server')
})
router.get('/get-ticker', (req, res) => {
    api.returnTicker()
        .then((response) => res.send(response.data))
        .catch((err) => {
            console.log(err.response)
            res.status(500).send('Error fetching data from Poloniex API')
        })
})
router.get('/get-currencies', (req, res) => {
    api.returnCurrencies()
        .then((response) => res.send(response.data))
        .catch((err) => {
            console.log(err.response)
            res.status(500).send('Error fetching data from Poloniex API')
        })
})
router.get('/get-chart-data', (req, res) => {
    let { coin_pair, start, end, period } = req.query
    api.returnChartData(coin_pair, start, end, period)
        .then((response) => res.send(response.data))
        .catch((err) => {
            console.log(err.response)
            res.status(500).send('Error fetching data from Poloniex API')
        })
})

module.exports = router