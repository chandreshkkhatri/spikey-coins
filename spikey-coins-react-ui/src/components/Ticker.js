import React, { Component } from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";

const binance = require("../utils/api").binance;

class Ticker extends Component {
  state = { tickerArray: [] };
  componentDidMount() {
    this.getBinanceSpikes();
  }
  getBinanceSpikes = async () => {
    binance.get24hrTicker().then(async (res) => {
      let raw_data = res.data;
      console.log(raw_data)
      let data = [];
      for (let it in raw_data) {
        let symbol = raw_data[it]['symbol'];
        let l = symbol.length;
        if (symbol.substring(l - 3, l) === "BTC") {
          data.push(raw_data[it]);
        }
      }
      await this.setState({ tickerArray: data });
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
    ];
    return (
      <div>
        <ReactTable
          data={tickerArray}
          columns={columns}
          defaultPageSize={15}
          className="instrument-table -striped -highlight"
        />
      </div>
    );
  }
}

export default Ticker;
