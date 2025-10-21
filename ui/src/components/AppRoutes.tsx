import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import Ticker, { TickerData } from "./Ticker";

// Define props interface for AppRoutes
interface AppRoutesProps {
  tickerArray: TickerData[];
  loading: boolean;
  error: string | null;
}

function AppRoutes({ tickerArray, loading, error }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/ticker"
        element={
          <Ticker tickerArray={tickerArray} loading={loading} error={error} />
        }
      />
      <Route path="*" element={<Navigate to="/ticker" replace />} />
    </Routes>
  );
}

export default AppRoutes;
