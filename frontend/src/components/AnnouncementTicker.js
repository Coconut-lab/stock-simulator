import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { adminService } from '../services/adminService';

const POLL_INTERVAL = 60000; // 1분마다 확인

const scroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const TickerWrapper = styled.div`
  width: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  overflow: hidden;
  position: relative;
  z-index: 999;
  border-bottom: 1px solid rgba(255, 200, 50, 0.15);

  &::before, &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 60px;
    z-index: 2;
    pointer-events: none;
  }
  &::before {
    left: 0;
    background: linear-gradient(to right, #1a1a2e, transparent);
  }
  &::after {
    right: 0;
    background: linear-gradient(to left, #16213e, transparent);
  }
`;

const LabelTag = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  font-weight: 700;
  font-size: 12px;
  z-index: 3;
  letter-spacing: 1px;
  white-space: nowrap;
`;

const TickerTrack = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: ${scroll} ${p => p.$duration}s linear infinite;
  padding: 10px 0;
  padding-left: 80px;
`;

const TickerItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 60px;
  font-size: 13px;
  color: ${p => p.$urgent ? '#ffcc00' : '#e0e0e0'};
  font-weight: ${p => p.$urgent ? '700' : '500'};

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => p.$urgent ? '#ff4444' : '#ffc107'};
    flex-shrink: 0;
  }

  .urgent-tag {
    background: rgba(255, 68, 68, 0.25);
    color: #ff6b6b;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid rgba(255, 68, 68, 0.3);
  }
`;

const HIDDEN_PATHS = ['/login', '/register'];

const AnnouncementTicker = () => {
  const [announcements, setAnnouncements] = useState([]);
  const trackRef = useRef(null);
  const location = useLocation();

  const fetchAnnouncements = async () => {
    try {
      const res = await adminService.getActiveAnnouncements();
      setAnnouncements(res.data || []);
    } catch {
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    const timer = setInterval(fetchAnnouncements, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  if (!announcements.length) return null;
  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const speed = Math.max(15, announcements.length * 12);

  return (
    <TickerWrapper>
      <LabelTag>NOTICE</LabelTag>
      <TickerTrack $duration={speed} ref={trackRef}>
        {[...announcements, ...announcements].map((a, i) => (
          <TickerItem key={`${a.id}-${i}`} $urgent={a.priority === 'urgent'}>
            <span className="dot" />
            {a.priority === 'urgent' && <span className="urgent-tag">긴급</span>}
            {a.message}
          </TickerItem>
        ))}
      </TickerTrack>
    </TickerWrapper>
  );
};

export default AnnouncementTicker;
