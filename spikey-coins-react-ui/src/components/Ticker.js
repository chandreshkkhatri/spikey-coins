import React, { Component } from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";

const binance = require("../utils/api").binance;

class Ticker extends Component {
  state = { tickerArray: [] };
  componentDidMount() {
    this.getSpikes();
  }
  getSpikes = async () => {
    binance.get24hrTicker().then(async (res) => {
      let raw_data = res.data;
      console.log(raw_data)
      let data = [];
      for (let it in raw_data) {
        let symbol = raw_data[it]['s'];
        let l = symbol.length;
        if (symbol.substring(l - 4, l) === "USDT") {
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
        accessor: "s",
      },
      {
        Header: <b className="left">Volume</b>,
        id: "quoteVolume",
        accessor: (d) => Math.floor(Number(d.v)*100*d.c)/100,
      },
      {
        Header: <b className="left">Price</b>,
        accessor: "c",
      },
      {
        Header: <b className="left">Change(%)</b>,
        accessor: "P",
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
