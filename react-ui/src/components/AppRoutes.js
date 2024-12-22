import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom'

import Ticker from './Ticker'

function AppRoutes({ tickerArray }) {
    return (
        <Routes>
            <Route path='/ticker' element={<Ticker tickerArray={tickerArray} />}></Route>
            <Route path='*' element={<Navigate to='/ticker' replace />}></Route>
        </Routes>
    );
}

export default AppRoutes