import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import './App.css'
import './w3-styles.css'
import './colors.css'

import Ticker from './components/Ticker'
import { api } from './utils/api';

function App() {
  const [tickerArray, setTickerArray] = useState([]);

  const getSpikes = async () => {
    api.get24hrTicker().then(async (res) => {
      let raw_data = res.data;
      let data = [];
      for (let it in raw_data) {
        let symbol = raw_data[it]['s'];
        let l = symbol.length;
        if (symbol.substring(l - 4, l) === "USDT") {
          data.push(raw_data[it]);
        }
      }
      console.log(data)
      await setTickerArray(data);
    });
  };

  const getNormalizedVolume = async () => {
    const res = await api.getNormalizedVolume();
    console.log(res);
  }

  return (
    <div>
      <header className="grey">
        <nav style={{ fontSize: '2em', marginLeft: '30px', padding: '10px' }}>
          <div>Spikey Coins</div>
        </nav>
      </header>
      <main>
        <Router>
          <div>
            <div className="sidenav">
              <ul>
                <li className="sidenav-li">
                  <h3>Pages</h3>
                </li>
                <li className="sidenav-li">
                  <button onClick={getSpikes}>Get Ticker</button>
                </li>
                <br />
                <li className="sidenav-li">
                  <button onClick={getNormalizedVolume}>Get Normalized Volume</button>
                </li>
                <br />
              </ul>
            </div>
            <div className="main-content right">
              <Routes>
                <Route exact path='/ticker' element={<Ticker tickerArray={tickerArray} />}></Route>
                <Route render={() => <Navigate to='/ticker' />}></Route>
              </Routes>
            </div>
          </div>
        </Router>
      </main>
    </div >
  );
}

export default App;
