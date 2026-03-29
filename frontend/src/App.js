import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import AnnouncementTicker from './components/AnnouncementTicker';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Transactions from './pages/Transactions';
import Markets from './pages/Markets';
import StockDetail from './pages/StockDetail';
import Predictions from './pages/Predictions';
import PredictionDetail from './pages/PredictionDetail';
import MyBets from './pages/MyBets';
import AdminPredictions from './pages/AdminPredictions';
import AdminUsers from './pages/AdminUsers';
import AdminAnnouncements from './pages/AdminAnnouncements';
import Futures from './pages/Futures';
import FuturesDetail from './pages/FuturesDetail';
import FuturesPositions from './pages/FuturesPositions';
import Options from './pages/Options';
import OptionsDetail from './pages/OptionsDetail';
import OptionsPositions from './pages/OptionsPositions';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AnnouncementTicker />
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
            <Route
              path="/predictions"
              element={
                <PrivateRoute>
                  <Predictions />
                </PrivateRoute>
              }
            />
            <Route
              path="/predictions/:id"
              element={
                <PrivateRoute>
                  <PredictionDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/my-bets"
              element={
                <PrivateRoute>
                  <MyBets />
                </PrivateRoute>
              }
            />
            <Route
              path="/futures"
              element={
                <PrivateRoute>
                  <Futures />
                </PrivateRoute>
              }
            />
            <Route
              path="/futures/:contractId"
              element={
                <PrivateRoute>
                  <FuturesDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/futures/positions"
              element={
                <PrivateRoute>
                  <FuturesPositions />
                </PrivateRoute>
              }
            />
            <Route
              path="/options"
              element={
                <PrivateRoute>
                  <Options />
                </PrivateRoute>
              }
            />
            <Route
              path="/options/:underlying"
              element={
                <PrivateRoute>
                  <OptionsDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/options/positions"
              element={
                <PrivateRoute>
                  <OptionsPositions />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/predictions"
              element={
                <AdminRoute>
                  <AdminPredictions />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <AdminRoute>
                  <AdminAnnouncements />
                </AdminRoute>
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
