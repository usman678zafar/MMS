import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Donations from './pages/Donations';
import Expenses from './pages/Expenses';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="donations" element={<Donations />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="staff" element={<Staff />} />
            <Route path="inventory" element={<Inventory />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
