import React, { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  FilterFn,
  Row, // Import Row type
} from "@tanstack/react-table";

// Define the interface for our ticker data
export interface TickerData {
  s: string; // Symbol
  price: number;
  change_24h: number;
  change_12h?: number | null;
  change_8h?: number | null;
  change_4h?: number | null;
  change_1h?: number | null;
  high_24h: number;
  low_24h: number;
  range_position_24h: number;
  volume_usd: number;
  volume_base: number;
  market_cap?: number | null;
  normalized_volume_score: number;
  // Add any other properties that might exist on the items in tickerArray
}

// Define props for the Ticker component
interface TickerProps {
  tickerArray: TickerData[];
  loading: boolean;
  error: string | null;
}

const columnHelper = createColumnHelper<TickerData>();

// Helper function for custom number sorting (handles null/undefined)
// Updated to use Row<TickerData> for better type safety
const numberSort = (
  rowA: Row<TickerData>,
  rowB: Row<TickerData>,
  columnId: string
): number => {
  const a = rowA.getValue(columnId) as number | null | undefined;
  const b = rowB.getValue(columnId) as number | null | undefined;
  const numA = a === null || a === undefined ? -Infinity : Number(a);
  const numB = b === null || b === undefined ? -Infinity : Number(b);
  if (isNaN(numA) && isNaN(numB)) return 0;
  if (isNaN(numA)) return 1;
  if (isNaN(numB)) return -1;
  return numA - numB;
};

function Ticker({ tickerArray, loading, error }: TickerProps) {
  /**
   * Format number with appropriate units (K, M, B)
   */
  const formatNumber = (num: number | undefined | null): string => {
    if (num === null || num === undefined || isNaN(Number(num))) return "0";
    const number = Number(num);
    if (number >= 1e9) return (number / 1e9).toFixed(2) + "B";
    if (number >= 1e6) return (number / 1e6).toFixed(2) + "M";
    if (number >= 1e3) return (number / 1e3).toFixed(2) + "K";
    return number.toFixed(2);
  };

  /**
   * Format percentage with color coding
   */
  const formatPercentage = (
    value: number | undefined | null
  ): React.ReactNode => {
    // Changed to React.ReactNode
    if (value === null || value === undefined || isNaN(Number(value))) {
      return <span style={{ color: "#777", fontSize: "0.8em" }}>N/A</span>;
    }
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
  const formatPrice = (value: number | undefined | null): string => {
    if (value === null || value === undefined || isNaN(Number(value)))
      return "N/A";
    const price = Number(value);
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(8); // For very small prices
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("s", {
        header: () => <b className="left">Symbol</b>,
        cell: (info) => (
          <strong style={{ color: "#2196F3" }}>
            {info.getValue() && info.getValue().replace("USDT", "/USDT")}
          </strong>
        ),
        // size: 120, // Replaced width with size for TanStack Table
      }),
      columnHelper.accessor("price", {
        header: () => <b className="left">Price (USD)</b>,
        cell: (info) => (
          <span style={{ fontFamily: "monospace" }}>
            ${formatPrice(info.getValue())}
          </span>
        ),
        // size: 120,
        sortingFn: "alphanumeric", // Basic sorting, can be customized
      }),
      columnHelper.accessor("change_24h", {
        header: () => <b className="left">24h Change</b>,
        cell: (info) => formatPercentage(info.getValue()),
        // size: 100,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("change_12h", {
        header: () => <b className="left">12h Change</b>,
        cell: (info) => formatPercentage(info.getValue()),
        sortingFn: numberSort, // Use the typed sorting function
      }),
      columnHelper.accessor("change_8h", {
        header: () => <b className="left">8h Change</b>,
        cell: (info) => formatPercentage(info.getValue()),
        sortingFn: numberSort, // Use the typed sorting function
      }),
      columnHelper.accessor("change_4h", {
        header: () => <b className="left">4h Change</b>,
        cell: (info) => formatPercentage(info.getValue()),
        sortingFn: numberSort, // Use the typed sorting function
      }),
      columnHelper.accessor("change_1h", {
        header: () => <b className="left">1h Change</b>,
        cell: (info) => formatPercentage(info.getValue()),
        sortingFn: numberSort, // Use the typed sorting function
      }),
      columnHelper.display({
        id: "highLow_24h",
        header: () => <b className="left">24h High/Low</b>,
        cell: ({ row }) => (
          // Access original row data
          <div style={{ fontFamily: "monospace", fontSize: "0.9em" }}>
            <div style={{ color: "#4CAF50" }}>
              ${formatPrice(row.original.high_24h)}
            </div>
            <div style={{ color: "#f44336" }}>
              ${formatPrice(row.original.low_24h)}
            </div>
          </div>
        ),
        // size: 130,
        enableSorting: false, // Typically display columns aren't sorted by themselves
      }),
      columnHelper.accessor("range_position_24h", {
        header: () => <b className="left">24h Range %</b>,
        cell: (info) => {
          const value = info.getValue();
          if (value === null || value === undefined)
            return (
              <span style={{ color: "#777", fontSize: "0.8em" }}>N/A</span>
            );
          let color = "#ff9800"; // Orange for mid-range
          if (value < 25) color = "#f44336"; // Red for low range
          if (value > 75) color = "#4CAF50"; // Green for high range
          return (
            <span style={{ color, fontWeight: "bold" }}>
              {Number(value).toFixed(1)}%
            </span>
          );
        },
        // size: 110,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("volume_usd", {
        header: () => <b className="left">Volume (USD)</b>,
        cell: (info) => (
          <span style={{ fontFamily: "monospace" }}>
            ${formatNumber(info.getValue())}
          </span>
        ),
        // size: 120,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("volume_base", {
        header: () => <b className="left">Volume (Base)</b>,
        cell: (info) => (
          <span style={{ fontFamily: "monospace" }}>
            {formatNumber(info.getValue())}
          </span>
        ),
        // size: 120,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("market_cap", {
        header: () => <b className="left">Market Cap</b>,
        cell: (info) => {
          const value = info.getValue();
          return (
            <span
              style={{
                fontFamily: "monospace",
                color: value ? "inherit" : "#999",
              }}
            >
              {value ? `$${formatNumber(value)}` : "N/A"}
            </span>
          );
        },
        // size: 120,
        sortingFn: numberSort, // Use the typed sorting function
      }),
      columnHelper.accessor("normalized_volume_score", {
        header: () => <b className="left">Norm. Volume Score</b>,
        cell: (info) => {
          const value = info.getValue();
          if (value === null || value === undefined)
            return (
              <span style={{ color: "#777", fontSize: "0.8em" }}>N/A</span>
            );
          return (
            <span
              style={{
                fontFamily: "monospace",
                color:
                  Number(value) > 1
                    ? "#4CAF50"
                    : Number(value) > 0.5
                    ? "#FF9800"
                    : "inherit",
              }}
            >
              {Number(value).toFixed(2)}
            </span>
          );
        },
        // size: 150,
        sortingFn: "alphanumeric",
      }),
    ],
    []
  );

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "change_24h", desc: true }, // Initial sort
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Custom global filter function
  const customGlobalFilterFn: FilterFn<TickerData> = React.useCallback(
    (row, columnId, filterValue) => {
      const value = row.getValue(columnId) as
        | string
        | number
        | null
        | undefined; // Type assertion
      const sValue = String(value).toLowerCase();
      const fValue = String(filterValue).toLowerCase();

      if (typeof value === "string") {
        return sValue.includes(fValue);
      }
      if (typeof value === "number") {
        if (fValue.startsWith(">")) {
          const threshold = Number(fValue.slice(1));
          return !isNaN(threshold) && value > threshold;
        }
        if (fValue.startsWith("<")) {
          const threshold = Number(fValue.slice(1));
          return !isNaN(threshold) && value < threshold;
        }
        if (fValue.includes("-")) {
          const [min, max] = fValue.split("-").map(Number);
          return !isNaN(min) && !isNaN(max) && value >= min && value <= max;
        }
        return sValue.includes(fValue); // Fallback for numbers if no operator
      }
      return sValue.includes(fValue); // Default for other types
    },
    []
  );

  const table = useReactTable({
    data: tickerArray,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: customGlobalFilterFn, // Apply the custom global filter
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // debugTable: true,
  });

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-lg text-gray-600">Loading ticker data...</div>
        <div className="text-sm text-gray-500 mt-2">
          Please wait while we fetch the latest market data
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <div className="text-lg font-semibold text-red-600 mb-2">
          Error Loading Data
        </div>
        <div className="text-gray-600">{error}</div>
        <div className="mt-4 text-sm text-gray-500">
          Please try refreshing the data using the controls in the sidebar
        </div>
      </div>
    );
  }

  // Show empty state
  if (!tickerArray || tickerArray.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <div className="text-lg font-semibold text-gray-600 mb-2">
          No Data Available
        </div>
        <div className="text-gray-500 mb-4">
          No ticker data available. Click &apos;Refresh Ticker&apos; to load
          data.
        </div>
        <div className="text-sm text-gray-400">
          Make sure your API connection is working properly
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          📈 Cryptocurrency Market Data
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-gray-600">
            <div className="font-semibold">
              Showing {table.getRowModel().rows.length} USDT trading pairs
            </div>
            <div className="text-sm mt-1 flex items-center gap-2">
              <span>💡</span>
              <span>
                Filter tips: Use &gt;100 for greater than, &lt;50 for less than,
                or 10-100 for ranges
              </span>
            </div>
          </div>
          <input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="🔍 Search all columns..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="bg-gradient-to-r from-gray-50 to-gray-100"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1 ${
                          header.column.getCanSort()
                            ? "cursor-pointer select-none hover:text-gray-700 transition-colors"
                            : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: " 🔼",
                          desc: " 🔽",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 whitespace-nowrap text-sm"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {"<<"}
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {"<"}
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {">"}
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {">>"}
            </button>
          </div>
          <span className="text-gray-600">
            Page{" "}
            <strong>
              {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Go to page:</span>
            <input
              type="number"
              defaultValue={table.getState().pagination.pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                table.setPageIndex(page);
              }}
              className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="px-3 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          >
            {[10, 20, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="text-gray-600 font-medium">
          {table.getPrePaginationRowModel().rows.length} Total Rows
        </div>
      </div>
    </div>
  );
}

export default Ticker;

// Note: The old `filterable` and `defaultFilterMethod` props from react-table v6
// are replaced by TanStack Table's globalFilter and columnFilters.
// The example above uses a global filter input.
// For column-specific filters, you would add filter UIs in your header cells
// and manage column filter state (e.g., using `table.getColumn('columnId').setFilterValue(...)`).

// The `width` property on columns is replaced by `size`.
// TanStack Table is headless, so CSS for table layout (like `height: "600px"` on the table)
// needs to be handled manually. The example uses `width: "100%"` for the table.
// You might need to wrap the table in a div with specific height and overflow properties
// to achieve a similar scrollable effect as before.
// The `className="instrument-table -striped -highlight"` is kept but may need adjustments
// as TanStack Table doesn't provide default styling.
