import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link, Switch, Redirect } from 'react-router-dom'
import './App.css'
import './w3-styles.css'
import './colors.css'

import Ticker from './components/Ticker'

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
                  <ul>
                    <li className="sidenav-li">
                      <h3>Pages</h3>
                      <Link to="/ticker">Ticker</Link>
                    </li>
                    <br />
                    <li className="sidenav-li">
                      <h3>Options</h3>
                      <label>Exchange</label><br />
                      <select name="exchange">
                        <option value="binance">Binance</option>
                      </select>
                    </li>
                    <br />
                  </ul>
                </div>
              </div>
              <div className="main-content right">
                <div>
                  <Switch>
                    <Route exact path='/ticker' component={Ticker}></Route>
                    <Route render={() => <Redirect to='/ticker' />}></Route>
                  </Switch>
                </div>
              </div>
            </div>
          </Router>
        </main>
      </div >
    );
  }
}

export default App;
