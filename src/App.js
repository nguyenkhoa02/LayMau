import './App.css';
import React from 'react';
import { useSelector } from 'react-redux';
// import Login from './pages/Login';
import Home from './pages/Home';

function App() {
  const user = useSelector((state) => state.auth) || { user: null, status: 'idle' };
  return (
    <div className="App">
      {user?.status === 'pending' && <p>Logging in…</p>}
      {!user?.user ? <Home /> : <Home />}
    </div>
  );
}

export default App;
