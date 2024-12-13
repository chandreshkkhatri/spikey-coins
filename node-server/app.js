const express = require('express')
const cors = require('cors')
const port = 8000
const app = express()

const tickerRouter = require('./routers/ticker-router')

app.use(cors())
app.use('/api/ticker', tickerRouter)

app.get('/', (req, res) => {
    res.send(`Hi, you've reached the proxy server. We tunnel your requests to byass cors issues`)
})

app.listen(port, () => console.log(`Example app listening to port ${port}!`))
