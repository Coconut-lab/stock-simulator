import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';

const DARK_PATHS = ['/predictions', '/my-bets', '/admin', '/futures', '/options'];

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
  height: 60px;
  gap: 12px;

  @media (max-width: 1100px) {
    padding: 0 12px;
  }
`;

const Logo = styled(Link)`
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
  &:hover { color: #764ba2; }

  @media (max-width: 900px) {
    font-size: 17px;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 1;
  min-width: 0;
  flex-wrap: nowrap;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const NavLink = styled(Link)`
  color: ${p => p.$dark ? '#999' : '#666'};
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: #667eea;
    background: ${p => p.$dark ? 'rgba(102,126,234,0.12)' : '#f8f9fa'};
  }

  &.active {
    color: ${p => p.$dark ? '#a5b4fc' : '#667eea'};
    background: ${p => p.$dark ? 'rgba(102,126,234,0.18)' : '#f0f2ff'};
    font-weight: 600;
  }

  @media (max-width: 900px) {
    font-size: 13px;
    padding: 5px 8px;
  }
`;

/* ── 파생상품 드롭다운 ── */

const DerivDropdown = styled.div`
  position: relative;
  &:hover > div {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

const DerivTrigger = styled.span`
  color: ${p => p.$dark ? '#a5b4fc' : '#667eea'};
  font-weight: 600;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: ${p => p.$dark ? 'rgba(102,126,234,0.12)' : 'rgba(102,126,234,0.08)'};
  }

  &.active {
    background: ${p => p.$dark ? 'rgba(102,126,234,0.18)' : 'rgba(102,126,234,0.1)'};
  }

  .arrow {
    font-size: 10px;
    transition: transform 0.2s;
  }

  ${() => DerivDropdown}:hover & .arrow {
    transform: rotate(180deg);
  }
`;

const DerivMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  min-width: 140px;
  background: ${p => p.$dark ? '#1e1e36' : 'white'};
  border: 1px solid ${p => p.$dark ? 'rgba(255,255,255,0.1)' : '#eee'};
  border-radius: 12px;
  padding: 6px;
  box-shadow: ${p => p.$dark
    ? '0 8px 32px rgba(0,0,0,0.5)'
    : '0 8px 32px rgba(0,0,0,0.12)'};
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1100;
`;

const DerivItem = styled(Link)`
  display: block;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  color: ${p => p.$dark ? '#ccc' : '#555'};
  transition: all 0.15s ease;

  &:hover {
    background: ${p => p.$dark ? 'rgba(102,126,234,0.12)' : 'rgba(102,126,234,0.06)'};
    color: ${p => p.$dark ? '#a5b4fc' : '#667eea'};
  }

  &.active {
    background: ${p => p.$dark ? 'rgba(102,126,234,0.18)' : 'rgba(102,126,234,0.1)'};
    color: ${p => p.$dark ? '#a5b4fc' : '#667eea'};
  }
`;

/* ── 관리자 드롭다운 ── */

const AdminDropdown = styled.div`
  position: relative;

  &:hover > div {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

const AdminTrigger = styled.span`
  color: ${p => p.$dark ? '#ff6b6b' : '#e74c3c'};
  font-weight: 700;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: ${p => p.$dark ? 'rgba(231,76,60,0.12)' : 'rgba(231,76,60,0.08)'};
  }

  &.active {
    background: ${p => p.$dark ? 'rgba(231,76,60,0.18)' : 'rgba(231,76,60,0.1)'};
  }

  .arrow {
    font-size: 10px;
    transition: transform 0.2s;
  }

  ${AdminDropdown}:hover & .arrow {
    transform: rotate(180deg);
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  min-width: 160px;
  background: ${p => p.$dark ? '#1e1e36' : 'white'};
  border: 1px solid ${p => p.$dark ? 'rgba(255,255,255,0.1)' : '#eee'};
  border-radius: 12px;
  padding: 6px;
  box-shadow: ${p => p.$dark
    ? '0 8px 32px rgba(0,0,0,0.5)'
    : '0 8px 32px rgba(0,0,0,0.12)'};
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1100;
`;

const DropdownItem = styled(Link)`
  display: block;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  color: ${p => p.$dark ? '#ccc' : '#555'};
  transition: all 0.15s ease;

  &:hover {
    background: ${p => p.$dark ? 'rgba(231,76,60,0.12)' : 'rgba(231,76,60,0.06)'};
    color: ${p => p.$dark ? '#ff6b6b' : '#e74c3c'};
  }

  &.active {
    background: ${p => p.$dark ? 'rgba(231,76,60,0.18)' : 'rgba(231,76,60,0.1)'};
    color: ${p => p.$dark ? '#ff6b6b' : '#e74c3c'};
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: ${p => p.$dark ? '#aaa' : '#666'};
  transition: color 0.35s ease;
  flex-shrink: 0;
  white-space: nowrap;

  .username {
    font-weight: 600;
    color: ${p => p.$dark ? '#ddd' : '#333'};
  }
  .balance {
    color: #27ae60;
    font-weight: 600;
  }

  @media (max-width: 900px) {
    gap: 6px;
    font-size: 12px;

    .username { display: none; }
  }
`;

const LogoutButton = styled.button`
  background: ${p => p.$dark ? 'rgba(231,76,60,0.2)' : '#e74c3c'};
  color: ${p => p.$dark ? '#e74c3c' : 'white'};
  border: ${p => p.$dark ? '1px solid rgba(231,76,60,0.3)' : 'none'};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
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
          <DerivDropdown>
            <DerivTrigger
              $dark={isDark}
              className={(location.pathname.startsWith('/futures') || location.pathname.startsWith('/options')) ? 'active' : ''}
            >
              파생상품 <span className="arrow">▼</span>
            </DerivTrigger>
            <DerivMenu $dark={isDark}>
              <DerivItem to="/futures" $dark={isDark}
                className={location.pathname.startsWith('/futures') ? 'active' : ''}>
                선물
              </DerivItem>
              <DerivItem to="/options" $dark={isDark}
                className={location.pathname.startsWith('/options') ? 'active' : ''}>
                옵션
              </DerivItem>
            </DerivMenu>
          </DerivDropdown>
          <NavLink to="/transactions" $dark={isDark}
            className={location.pathname === '/transactions' ? 'active' : ''}>
            거래내역
          </NavLink>
          <NavLink to="/predictions" $dark={isDark}
            className={location.pathname.startsWith('/predictions') ? 'active' : ''}>
            예측마켓
          </NavLink>
          {user?.role === 'admin' && (
            <AdminDropdown>
              <AdminTrigger
                $dark={isDark}
                className={location.pathname.startsWith('/admin') ? 'active' : ''}
              >
                관리자 <span className="arrow">▼</span>
              </AdminTrigger>
              <DropdownMenu $dark={isDark}>
                <DropdownItem to="/admin/predictions" $dark={isDark}
                  className={location.pathname === '/admin/predictions' ? 'active' : ''}>
                  예측 관리
                </DropdownItem>
                <DropdownItem to="/admin/users" $dark={isDark}
                  className={location.pathname === '/admin/users' ? 'active' : ''}>
                  유저 관리
                </DropdownItem>
                <DropdownItem to="/admin/announcements" $dark={isDark}
                  className={location.pathname === '/admin/announcements' ? 'active' : ''}>
                  공지 관리
                </DropdownItem>
              </DropdownMenu>
            </AdminDropdown>
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
