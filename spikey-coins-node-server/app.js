const express = require('express')
const cors = require('cors')
const port = 8000
const app = express()

const binanceRouter = require('./routers/binance-router')

app.use(cors())
app.use('/binance', binanceRouter)

app.get('/', (req, res) => {
    res.send(`Hi, you've reached the proxy server. We tunnel your requests to byass cors issues`)
})

app.listen(port, () => console.log(`Example app listening to port ${port}!`))
