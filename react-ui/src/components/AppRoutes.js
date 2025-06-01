import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import Ticker from "./Ticker";

function AppRoutes({ tickerArray, loading, error }) {
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
