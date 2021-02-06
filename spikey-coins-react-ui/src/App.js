import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link, Switch, Redirect } from 'react-router-dom'
import './App.css'
import './w3-styles.css'
import './colors.css'

import BinanceTicker from './components/BinanceTicker'

class App extends Component {

  render() {
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
                <div>
                  <ul className="sidenav-ul">
                    <li className="sidenav-li"><Link to="/binance">Binance</Link></li>
                  </ul>
                </div>
              </div>
              <div className="main-content right">
                <div>
                  <Switch>
                    <Route exact path='/binance' component={BinanceTicker}></Route>
                    <Route render={() => <Redirect to='/binance' />}></Route>
                  </Switch>
                </div>
              </div>
            </div>
          </Router>
        </main>
      </div>
    );
  }
}

export default App;
