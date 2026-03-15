import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';

const DARK_PATHS = ['/predictions', '/my-bets', '/admin/predictions', '/admin/users', '/admin/announcements'];

const NavContainer = styled.nav`
  background: ${p => p.$dark ? '#12101f' : 'white'};
  box-shadow: ${p => p.$dark
    ? '0 2px 20px rgba(0,0,0,0.4)'
    : '0 2px 12px rgba(0,0,0,0.05)'};
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background 0.35s ease, box-shadow 0.35s ease;
  border-bottom: 1px solid ${p => p.$dark ? 'rgba(255,255,255,0.06)' : 'transparent'};
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
  &:hover { color: #764ba2; }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 30px;
  @media (max-width: 768px) { gap: 20px; }
`;

const NavLink = styled(Link)`
  color: ${p => p.$dark ? '#999' : '#666'};
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    color: #667eea;
    background: ${p => p.$dark ? 'rgba(102,126,234,0.12)' : '#f8f9fa'};
  }

  &.active {
    color: ${p => p.$dark ? '#a5b4fc' : '#667eea'};
    background: ${p => p.$dark ? 'rgba(102,126,234,0.18)' : '#f0f2ff'};
    font-weight: 600;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: ${p => p.$dark ? '#aaa' : '#666'};
  transition: color 0.35s ease;

  .username {
    font-weight: 600;
    color: ${p => p.$dark ? '#ddd' : '#333'};
  }
  .balance {
    color: #27ae60;
    font-weight: 600;
  }
`;

const LogoutButton = styled.button`
  background: ${p => p.$dark ? 'rgba(231,76,60,0.2)' : '#e74c3c'};
  color: ${p => p.$dark ? '#e74c3c' : 'white'};
  border: ${p => p.$dark ? '1px solid rgba(231,76,60,0.3)' : 'none'};
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    background: ${p => p.$dark ? 'rgba(231,76,60,0.35)' : '#c0392b'};
  }
`;

const Navigation = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const isDark = DARK_PATHS.some(p => location.pathname.startsWith(p));

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '\u20A90';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <NavContainer $dark={isDark}>
        <NavContent>
          <Logo to="/">Stock Trader</Logo>
          <NavLinks>
            <NavLink to="/login" $dark={isDark}>로그인</NavLink>
            <NavLink to="/register" $dark={isDark}>회원가입</NavLink>
          </NavLinks>
        </NavContent>
      </NavContainer>
    );
  }

  return (
    <NavContainer $dark={isDark}>
      <NavContent>
        <Logo to="/dashboard">Stock Trader</Logo>

        <NavLinks>
          <NavLink to="/dashboard" $dark={isDark}
            className={location.pathname === '/dashboard' ? 'active' : ''}>
            대시보드
          </NavLink>
          <NavLink to="/portfolio" $dark={isDark}
            className={location.pathname === '/portfolio' ? 'active' : ''}>
            포트폴리오
          </NavLink>
          <NavLink to="/markets" $dark={isDark}
            className={location.pathname === '/markets' ? 'active' : ''}>
            시장
          </NavLink>
          <NavLink to="/transactions" $dark={isDark}
            className={location.pathname === '/transactions' ? 'active' : ''}>
            거래내역
          </NavLink>
          <NavLink to="/predictions" $dark={isDark}
            className={location.pathname.startsWith('/predictions') ? 'active' : ''}>
            예측마켓
          </NavLink>
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin/predictions" $dark={isDark}
                className={location.pathname === '/admin/predictions' ? 'active' : ''}
                style={{
                  color: isDark ? '#ff6b6b' : '#e74c3c',
                  fontWeight: 700
                }}>
                예측관리
              </NavLink>
              <NavLink to="/admin/users" $dark={isDark}
                className={location.pathname === '/admin/users' ? 'active' : ''}
                style={{
                  color: isDark ? '#ff6b6b' : '#e74c3c',
                  fontWeight: 700
                }}>
                유저관리
              </NavLink>
              <NavLink to="/admin/announcements" $dark={isDark}
                className={location.pathname === '/admin/announcements' ? 'active' : ''}
                style={{
                  color: isDark ? '#ffc107' : '#f39c12',
                  fontWeight: 700
                }}>
                공지관리
              </NavLink>
            </>
          )}
        </NavLinks>

        <UserInfo $dark={isDark}>
          <div className="username">{user?.username}님</div>
          <div className="balance">{formatCurrency(user?.balance)}</div>
          <LogoutButton $dark={isDark} onClick={handleLogout}>
            로그아웃
          </LogoutButton>
        </UserInfo>
      </NavContent>
    </NavContainer>
  );
};

export default Navigation;
