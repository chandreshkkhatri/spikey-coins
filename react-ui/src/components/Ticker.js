import React from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";

function Ticker({ tickerArray }) {

  let columns = [
    {
      Header: <b className="left">Symbol</b>,
      accessor: "s",
    },
    {
      Header: <b className="left">Volume</b>,
      id: "quoteVolume",
      accessor: (d) => Math.floor(Number(d.v) * 100 * d.c) / 100,
    },
    {
      Header: <b className="left">Price</b>,
      accessor: "c",
    },
    {
      Header: <b className="left">Change(%)</b>,
      accessor: "P",
    },
    {
      Header: <b className="left">Normalized Volume</b>,
      id: "normalizedVolume",
      accessor: (d) => {
        if (!d.market_cap) {
          return 0
        }
        return Math.floor(Number(d.v) * 100000 * d.c / d.market_cap) / 100
      },
    }
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

export default Ticker;
