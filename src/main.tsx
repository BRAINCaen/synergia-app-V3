
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './shared/components/Login';
import Register from './shared/components/Register';
import Timetracking from './shared/components/Timetracking';
import TimetrackingAdmin from './shared/components/TimetrackingAdmin';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pointage" element={<Timetracking />} />
      <Route path="/admin" element={<TimetrackingAdmin />} />
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
