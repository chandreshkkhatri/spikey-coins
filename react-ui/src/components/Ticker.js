import React, { useMemo } from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";

function Ticker({ tickerArray, loading, error }) {
  /**
   * Format number with appropriate units (K, M, B)
   */
  const formatNumber = (num) => {
    if (!num || isNaN(num)) return "0";

    const number = Number(num);
    if (number >= 1e9) return (number / 1e9).toFixed(2) + "B";
    if (number >= 1e6) return (number / 1e6).toFixed(2) + "M";
    if (number >= 1e3) return (number / 1e3).toFixed(2) + "K";
    return number.toFixed(2);
  };

  /**
   * Format percentage with color coding
   */
  const formatPercentage = (value) => {
    const percentage = Number(value);
    const color = percentage >= 0 ? "green" : "red";
    return (
      <span style={{ color }}>
        {percentage >= 0 ? "+" : ""}
        {percentage.toFixed(2)}%
      </span>
    );
  };

  /**
   * Format price with appropriate decimal places
   */
  const formatPrice = (value) => {
    const price = Number(value);
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(8);
  };

  /**
   * Calculate normalized volume score
   */
  const calculateNormalizedVolume = (item) => {
    if (!item.market_cap || !item.v || !item.c) return 0;
    const volumeUSD = Number(item.v) * Number(item.c);
    const score = (volumeUSD * 100000) / Number(item.market_cap);
    return (score / 100).toFixed(2);
  };

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(
    () => [
      {
        Header: <b className="left">Symbol</b>,
        accessor: "s",
        width: 120,
        Cell: ({ value }) => (
          <strong style={{ color: "#2196F3" }}>
            {value && value.replace("USDT", "/USDT")}
          </strong>
        ),
      },
      {
        Header: <b className="left">Price (USD)</b>,
        accessor: "c",
        width: 120,
        Cell: ({ value }) => (
          <span style={{ fontFamily: "monospace" }}>${formatPrice(value)}</span>
        ),
      },
      {
        Header: <b className="left">24h Change</b>,
        accessor: "P",
        width: 100,
        Cell: ({ value }) => formatPercentage(value),
      },
      {
        Header: <b className="left">Volume (USD)</b>,
        id: "volumeUSD",
        width: 120,
        accessor: (d) => {
          const volumeUSD = Number(d.v) * Number(d.c);
          return volumeUSD;
        },
        Cell: ({ value }) => (
          <span style={{ fontFamily: "monospace" }}>
            ${formatNumber(value)}
          </span>
        ),
      },
      {
        Header: <b className="left">Market Cap</b>,
        id: "marketCap",
        width: 120,
        accessor: (d) => d.market_cap || 0,
        Cell: ({ value }) => (
          <span
            style={{
              fontFamily: "monospace",
              color: value ? "inherit" : "#999",
            }}
          >
            {value ? `$${formatNumber(value)}` : "N/A"}
          </span>
        ),
      },
      {
        Header: <b className="left">Norm. Volume Score</b>,
        id: "normalizedVolume",
        width: 150,
        accessor: (d) => calculateNormalizedVolume(d),
        Cell: ({ value }) => (
          <span
            style={{
              fontFamily: "monospace",
              color:
                value > 1 ? "#4CAF50" : value > 0.5 ? "#FF9800" : "inherit",
            }}
          >
            {value}
          </span>
        ),
      },
    ],
    []
  );

  // Show loading state
  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div>Loading ticker data...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  // Show empty state
  if (!tickerArray || tickerArray.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div>
          No ticker data available. Click "Refresh Ticker" to load data.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "10px 0", color: "#666" }}>
        Showing {tickerArray.length} USDT trading pairs
      </div>

      <ReactTable
        data={tickerArray}
        columns={columns}
        defaultPageSize={20}
        defaultSorted={[
          {
            id: "volumeUSD",
            desc: true,
          },
        ]}
        className="instrument-table -striped -highlight"
        style={{
          height: "600px",
        }}
        showPaginationTop={true}
        showPaginationBottom={true}
        pageSizeOptions={[10, 20, 50, 100]}
        filterable={true}
        defaultFilterMethod={(filter, row) =>
          String(row[filter.id])
            .toLowerCase()
            .includes(filter.value.toLowerCase())
        }
      />
    </div>
  );
}

export default Ticker;
