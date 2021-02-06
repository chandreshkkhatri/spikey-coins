import React, { Component } from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";

const binance = require("../utils/api").binance;

class BinanceTicker extends Component {
  state = { tickerArray: [] };
  componentDidMount() {
    this.getBinanceSpikes();
  }
  getBinanceSpikes = async () => {
    binance.get24hrTicker().then(async (res) => {
      let raw_data = res.data;
      console.log(raw_data)
      let data = [];
      let chartRequests = [];
      for (let it in raw_data) {
        let symbol = raw_data[it]['symbol'];
        let l = symbol.length;
        if (symbol.substring(l - 3, l) === "BTC") {
          data.push(raw_data[it]);
        //   chartRequests.push(binance.getCandleStickData(symbol, "15m", 1));
        }
      }
      await this.setState({ tickerArray: data });
    //   for (let it in chartRequests) {
    //     chartRequests[it]
    //       .then((res) => {
    //         let candles = [];
    //         for (let it in res.data) {
    //           candles[it] = {};
    //           candles[it].startTimeStamp = res.data[it][0];
    //           candles[it].open = res.data[it][1];
    //           candles[it].high = res.data[it][2];
    //           candles[it].low = res.data[it][3];
    //           candles[it].close = res.data[it][4];
    //           candles[it].volume = res.data[it][5];
    //           candles[it].endTimeStamp = res.data[it][6];
    //           candles[it].quoteVolume = res.data[it][7];
    //           candles[it].noOfTrades = res.data[it][8];
    //           candles[it].baseAssetVolume = res.data[it][9];
    //           candles[it].quoteAssetVolume = res.data[it][10];
    //           candles[it].ignore = res.data[it][11];
    //         }
    //         let raw_data = candles;

    //         data[it]["volume15min"] = raw_data[0]["volume"];
    //         data[it]["quoteVolume15min"] = raw_data[0]["quoteVolume"];
    //         data[it]["quoteAssetVolume15min"] = raw_data[0]["quoteAssetVolume"];
    //         data[it]["baseAssetVolume15min"] = raw_data[0]["baseAssetVolume"];
    //         if (Number(data[it]["quoteVolume"]) !== 0) {
    //           data[it]["volSpike15min"] =
    //             Math.floor(
    //               (Number(raw_data[0]["quoteVolume"]) /
    //                 Number(data[it]["quoteVolume"])) *
    //                 10000
    //             ) / 100;
    //         } else {
    //           data[it]["volSpike15min"] = 0;
    //         }
    //         this.setState({ tickerArray: data });
    //       })
    //       .catch((err) => console.log(err));
    //   }
    });
  };

  render() {
    let { tickerArray } = this.state;
    let columns = [
      {
        Header: <b className="left">Symbol</b>,
        accessor: "symbol",
      },
      {
        Header: <b className="left">Volume</b>,
        id: "quoteVolume",
        accessor: (d) => Math.floor(Number(d.quoteVolume)),
      },
      {
        Header: <b className="left">Price</b>,
        accessor: "lastPrice",
      },
      {
        Header: <b className="left">Change(%)</b>,
        accessor: "priceChangePercent",
      },
    //   {
    //     Header: <b className="left">Volume Spike 15min</b>,
    //     accessor: "volSpike15min",
    //   },
    ];
    return (
      <div>
        <h2> Binance Pumps </h2>
        <ReactTable
          data={tickerArray}
          columns={columns}
          defaultPageSize={20}
          className="-striped -highlight"
        />
      </div>
    );
  }
}

export default BinanceTicker;
