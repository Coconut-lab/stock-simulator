import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';

const NavContainer = styled.nav`
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
`;

const Logo = styled(Link)`
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    color: #764ba2;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 30px;
  
  @media (max-width: 768px) {
    gap: 20px;
  }
`;

const NavLink = styled(Link)`
  color: #666;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    color: #667eea;
    background: #f8f9fa;
  }
  
  &.active {
    color: #667eea;
    background: #f0f2ff;
    font-weight: 600;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: #666;
  
  .username {
    font-weight: 600;
    color: #333;
  }
  
  .balance {
    color: #27ae60;
    font-weight: 600;
  }
`;

const LogoutButton = styled.button`
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background: #c0392b;
  }
`;

const Navigation = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₩0';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // 로그인/회원가입 페이지에서는 네비게이션 숨기기
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  // 인증되지 않은 경우 간단한 네비게이션만 표시
  if (!isAuthenticated) {
    return (
      <NavContainer>
        <NavContent>
          <Logo to="/">
            📈 Stock Trader
          </Logo>
          <NavLinks>
            <NavLink to="/login">로그인</NavLink>
            <NavLink to="/register">회원가입</NavLink>
          </NavLinks>
        </NavContent>
      </NavContainer>
    );
  }

  return (
    <NavContainer>
      <NavContent>
        <Logo to="/dashboard">
          📈 Stock Trader
        </Logo>
        
        <NavLinks>
          <NavLink 
            to="/dashboard" 
            className={location.pathname === '/dashboard' ? 'active' : ''}
          >
            대시보드
          </NavLink>
          <NavLink 
            to="/portfolio" 
            className={location.pathname === '/portfolio' ? 'active' : ''}
          >
            포트폴리오
          </NavLink>
          <NavLink 
            to="/markets" 
            className={location.pathname === '/markets' ? 'active' : ''}
          >
            시장
          </NavLink>
          <NavLink
            to="/transactions"
            className={location.pathname === '/transactions' ? 'active' : ''}
          >
            거래내역
          </NavLink>
          <NavLink
            to="/predictions"
            className={location.pathname.startsWith('/predictions') ? 'active' : ''}
          >
            예측마켓
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin/predictions"
              className={location.pathname === '/admin/predictions' ? 'active' : ''}
              style={{ color: location.pathname === '/admin/predictions' ? '#e74c3c' : '#e74c3c', fontWeight: 700 }}
            >
              관리자
            </NavLink>
          )}
        </NavLinks>

        <UserInfo>
          <div className="username">{user?.username}님</div>
          <div className="balance">{formatCurrency(user?.balance)}</div>
          <LogoutButton onClick={handleLogout}>
            로그아웃
          </LogoutButton>
        </UserInfo>
      </NavContent>
    </NavContainer>
  );
};

export default Navigation;
