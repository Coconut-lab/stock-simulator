import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Transactions from './pages/Transactions';
import Markets from './pages/Markets';
import StockDetail from './pages/StockDetail';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* 보호된 라우트 */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/portfolio" 
              element={
                <PrivateRoute>
                  <Portfolio />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/transactions" 
              element={
                <PrivateRoute>
                  <Transactions />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/markets" 
              element={
                <PrivateRoute>
                  <Markets />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/stock/:symbol" 
              element={
                <PrivateRoute>
                  <StockDetail />
                </PrivateRoute>
              } 
            />
            
            {/* 기본 라우트 - 대시보드로 리다이렉트 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 페이지 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
