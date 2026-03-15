import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { adminService } from '../services/adminService';

const POLL_INTERVAL = 60000;
const SCROLL_SPEED = 60; // px/sec 일정 속도

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
  left: 0; top: 0; bottom: 0;
  display: flex; align-items: center;
  padding: 0 14px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white; font-weight: 700; font-size: 12px;
  z-index: 3; letter-spacing: 1px; white-space: nowrap;
`;

const TickerTrack = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  padding: 10px 0;
  padding-left: 80px;
  animation: ${scroll} ${p => p.$duration}s linear infinite;
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
    width: 6px; height: 6px; border-radius: 50%;
    background: ${p => p.$urgent ? '#ff4444' : '#ffc107'};
    flex-shrink: 0;
  }
  .urgent-tag {
    background: rgba(255, 68, 68, 0.25);
    color: #ff6b6b; font-size: 10px; font-weight: 700;
    padding: 2px 6px; border-radius: 3px;
    border: 1px solid rgba(255, 68, 68, 0.3);
  }
`;

/* 측정 전용 (화면에 안 보임) */
const MeasureBox = styled.div`
  position: absolute;
  visibility: hidden;
  white-space: nowrap;
  display: flex;
  align-items: center;
  padding-left: 80px;
`;

const HIDDEN_PATHS = ['/login', '/register'];

const AnnouncementTicker = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [duration, setDuration] = useState(40);
  const [repeatsPerSet, setRepeatsPerSet] = useState(4);
  const measureRef = useRef(null);
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
    // 공지 변경 이벤트 감지 → 즉시 갱신
    const onUpdate = () => fetchAnnouncements();
    window.addEventListener('announcement-updated', onUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('announcement-updated', onUpdate);
    };
  }, []);

  // 1세트 너비 측정 → 반복 횟수 & 애니메이션 시간 계산
  const measure = useCallback(() => {
    if (!measureRef.current) return;
    const oneSetWidth = measureRef.current.scrollWidth;
    if (oneSetWidth === 0) return;

    // 한 세트가 최소 1600px 이상이 되도록 반복
    const reps = Math.max(1, Math.ceil(1600 / oneSetWidth));
    setRepeatsPerSet(reps);

    // 한 세트 전체 너비 (= 반복 * 측정값), 이 길이가 -50% 이동 거리
    const totalHalfWidth = oneSetWidth * reps;
    setDuration(totalHalfWidth / SCROLL_SPEED);
  }, []);

  useEffect(() => {
    if (announcements.length > 0) {
      requestAnimationFrame(() => requestAnimationFrame(measure));
    }
  }, [announcements, measure]);

  if (!announcements.length) return null;
  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const renderItem = (a, key) => (
    <TickerItem key={key} $urgent={a.priority === 'urgent'}>
      <span className="dot" />
      {a.priority === 'urgent' && <span className="urgent-tag">긴급</span>}
      {a.message}
    </TickerItem>
  );

  // 한 세트 = announcements × repeatsPerSet
  const buildSet = (prefix) => {
    const items = [];
    for (let r = 0; r < repeatsPerSet; r++) {
      announcements.forEach((a, i) => {
        items.push(renderItem(a, `${prefix}-${r}-${i}`));
      });
    }
    return items;
  };

  return (
    <TickerWrapper>
      <LabelTag>NOTICE</LabelTag>

      {/* 1세트 너비 측정용 (announcements 1번만) */}
      <MeasureBox ref={measureRef}>
        {announcements.map((a, i) => renderItem(a, `m-${i}`))}
      </MeasureBox>

      {/* 실제 트랙: 동일한 세트 2개 → translateX(-50%)로 무한루프 */}
      <TickerTrack $duration={duration}>
        {buildSet('a')}
        {buildSet('b')}
      </TickerTrack>
    </TickerWrapper>
  );
};

export default AnnouncementTicker;
