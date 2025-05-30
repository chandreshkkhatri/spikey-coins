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
        accessor: "price", // Use pre-calculated numeric price
        width: 120,
        Cell: ({ value }) => (
          <span style={{ fontFamily: "monospace" }}>${formatPrice(value)}</span>
        ),
      },
      {
        Header: <b className="left">24h Change</b>,
        accessor: "change_24h", // Use pre-calculated numeric change
        width: 100,
        Cell: ({ value }) => formatPercentage(value),
      },
      {
        Header: <b className="left">12h Change</b>,
        accessor: "change_12h",
        width: 100,
        sortMethod: (a, b) => {
          const numA = Number(a);
          const numB = Number(b);
          if (isNaN(numA) && isNaN(numB)) return 0;
          if (isNaN(numA)) return 1;
          if (isNaN(numB)) return -1;
          return numA > numB ? 1 : -1;
        },
        Cell: ({ value }) => {
          if (value === null || value === undefined) {
            return (
              <span style={{ color: "#777", fontSize: "0.8em" }}>N/A</span>
            );
          }
          return formatPercentage(value);
        },
      },
      {
        Header: <b className="left">8h Change</b>,
        accessor: "change_8h",
        width: 100,
        sortMethod: (a, b) => {
          const numA = Number(a);
          const numB = Number(b);
          if (isNaN(numA) && isNaN(numB)) return 0;
          if (isNaN(numA)) return 1;
          if (isNaN(numB)) return -1;
          return numA > numB ? 1 : -1;
        },
        Cell: ({ value }) => {
          if (value === null || value === undefined) {
            return (
              <span style={{ color: "#777", fontSize: "0.8em" }}>N/A</span>
            );
          }
          return formatPercentage(value);
        },
      },
      {
        Header: <b className="left">4h Change</b>,
        accessor: "change_4h",
        width: 100,
        sortMethod: (a, b) => {
          const numA = Number(a);
          const numB = Number(b);
          if (isNaN(numA) && isNaN(numB)) return 0;
          if (isNaN(numA)) return 1;
          if (isNaN(numB)) return -1;
          return numA > numB ? 1 : -1;
        },
        Cell: ({ value }) => {
          if (value === null || value === undefined) {
            return (
              <span style={{ color: "#777", fontSize: "0.8em" }}>N/A</span>
            );
          }
          return formatPercentage(value);
        },
      },
      {
        Header: <b className="left">1h Change</b>,
        accessor: "change_1h",
        width: 100,
        sortMethod: (a, b) => {
          const numA = Number(a);
          const numB = Number(b);
          if (isNaN(numA) && isNaN(numB)) return 0;
          if (isNaN(numA)) return 1;
          if (isNaN(numB)) return -1;
          return numA > numB ? 1 : -1;
        },
        Cell: ({ value }) => {
          if (value === null || value === undefined) {
            return (
              <span style={{ color: "#777", fontSize: "0.8em" }}>N/A</span>
            );
          }
          return formatPercentage(value);
        },
      },
      {
        Header: <b className="left">24h High/Low</b>,
        id: "highLow",
        width: 130,
        accessor: (d) => d.high_24h, // Sort by pre-calculated high price
        Cell: ({ original }) => {
          const high = original.high_24h;
          const low = original.low_24h;
          return (
            <div style={{ fontFamily: "monospace", fontSize: "0.9em" }}>
              <div style={{ color: "#4CAF50" }}>${formatPrice(high)}</div>
              <div style={{ color: "#f44336" }}>${formatPrice(low)}</div>
            </div>
          );
        },
      },
      {
        Header: <b className="left">24h Range %</b>,
        accessor: "range_position_24h", // Use pre-calculated range position
        width: 110,
        Cell: ({ value }) => {
          let color = "#ff9800"; // Orange for mid-range
          if (value < 25) color = "#f44336"; // Red for low range
          if (value > 75) color = "#4CAF50"; // Green for high range
          return (
            <span style={{ color, fontWeight: "bold" }}>
              {value.toFixed(1)}%
            </span>
          );
        },
      },
      {
        Header: <b className="left">Volume (USD)</b>,
        accessor: "volume_usd", // Use pre-calculated USD volume
        width: 120,
        Cell: ({ value }) => (
          <span style={{ fontFamily: "monospace" }}>
            ${formatNumber(value)}
          </span>
        ),
      },
      {
        Header: <b className="left">Volume (Base)</b>,
        accessor: "volume_base", // Use pre-calculated base volume
        width: 120,
        Cell: ({ value }) => (
          <span style={{ fontFamily: "monospace" }}>{formatNumber(value)}</span>
        ),
      },
      {
        Header: <b className="left">Market Cap</b>,
        id: "marketCap",
        width: 120,
        accessor: (d) => d.market_cap || 0,
        // This already returns a number, so sorting should work correctly
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
        accessor: "normalized_volume_score", // Use pre-calculated score
        width: 150,
        Cell: ({ value }) => (
          <span
            style={{
              fontFamily: "monospace",
              color:
                value > 1 ? "#4CAF50" : value > 0.5 ? "#FF9800" : "inherit",
            }}
          >
            {value.toFixed(2)}
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
        <div>Showing {tickerArray.length} USDT trading pairs</div>
        <div style={{ fontSize: "0.8em", marginTop: "5px" }}>
          💡 Filter tips: Use &gt;100 for greater than, &lt;50 for less than, or
          10-100 for ranges. Now includes 1h, 4h, 8h, 12h change columns for
          intraday analysis!
        </div>
      </div>

      <ReactTable
        data={tickerArray}
        columns={columns}
        defaultPageSize={20}
        defaultSorted={[
          {
            id: "change_24h", // Sort by 24h change percentage using pre-calculated field
            desc: true, // Show biggest gainers first
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
        defaultFilterMethod={(filter, row) => {
          const value = row[filter.id];
          const filterValue = filter.value.toLowerCase();

          // For string values, use includes
          if (typeof value === "string") {
            return value.toLowerCase().includes(filterValue);
          }

          // For numbers, support range filtering (e.g., ">100", "<50", "50-100")
          if (typeof value === "number") {
            if (filterValue.startsWith(">")) {
              const threshold = Number(filterValue.slice(1));
              return !isNaN(threshold) && value > threshold;
            }
            if (filterValue.startsWith("<")) {
              const threshold = Number(filterValue.slice(1));
              return !isNaN(threshold) && value < threshold;
            }
            if (filterValue.includes("-")) {
              const [min, max] = filterValue.split("-").map(Number);
              return !isNaN(min) && !isNaN(max) && value >= min && value <= max;
            }
            // Default: convert both to string and use includes
            return String(value).toLowerCase().includes(filterValue);
          }

          return String(value).toLowerCase().includes(filterValue);
        }}
      />
    </div>
  );
}

export default Ticker;
