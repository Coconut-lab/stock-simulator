import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { adminService } from '../services/adminService';

const POLL_INTERVAL = 60000;
const SCROLL_SPEED = 60; // px/sec

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
    top: 0; bottom: 0;
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
  will-change: transform;
`;

const TickerItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

const Spacer = styled.span`
  display: inline-block;
  width: ${p => p.$w}px;
  flex-shrink: 0;
`;

const ItemGap = styled.span`
  display: inline-block;
  width: 60px;
  flex-shrink: 0;
`;

const MeasureBox = styled.div`
  position: absolute;
  visibility: hidden;
  white-space: nowrap;
  display: flex;
  align-items: center;
`;

const HIDDEN_PATHS = ['/login', '/register'];

const AnnouncementTicker = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [repeatsPerSet, setRepeatsPerSet] = useState(4);
  const measureRef = useRef(null);
  const trackRef = useRef(null);
  const prevDataRef = useRef('');
  const animRef = useRef(null);
  const offsetRef = useRef(0);
  const setWidthRef = useRef(0);
  const location = useLocation();

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await adminService.getActiveAnnouncements();
      const newData = res.data || [];
      const newKey = JSON.stringify(newData.map(a => a.id + a.message));
      if (newKey !== prevDataRef.current) {
        prevDataRef.current = newKey;
        setAnnouncements(newData);
      }
    } catch {
      if (prevDataRef.current !== '[]') {
        prevDataRef.current = '[]';
        setAnnouncements([]);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    const timer = setInterval(fetchAnnouncements, POLL_INTERVAL);
    const onUpdate = () => fetchAnnouncements();
    window.addEventListener('announcement-updated', onUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('announcement-updated', onUpdate);
    };
  }, [fetchAnnouncements]);

  // 1세트 너비 측정
  useEffect(() => {
    if (announcements.length === 0) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!measureRef.current) return;
        const oneSetWidth = measureRef.current.scrollWidth;
        if (oneSetWidth === 0) return;
        const reps = Math.max(1, Math.ceil(1600 / oneSetWidth));
        setRepeatsPerSet(reps);
        setWidthRef.current = oneSetWidth * reps;
        offsetRef.current = 0;
      });
    });
  }, [announcements]);

  // requestAnimationFrame 기반 애니메이션 루프
  useEffect(() => {
    if (announcements.length === 0) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let lastTime = null;

    const animate = (time) => {
      if (lastTime !== null && setWidthRef.current > 0) {
        const dt = (time - lastTime) / 1000;
        offsetRef.current -= SCROLL_SPEED * dt;

        if (Math.abs(offsetRef.current) >= setWidthRef.current) {
          offsetRef.current += setWidthRef.current;
        }

        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
        }
      }
      lastTime = time;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [announcements]);

  if (!announcements.length) return null;
  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const renderItem = (a, key) => (
    <React.Fragment key={key}>
      <TickerItem $urgent={a.priority === 'urgent'}>
        <span className="dot" />
        {a.priority === 'urgent' && <span className="urgent-tag">긴급</span>}
        {a.message}
      </TickerItem>
      <ItemGap />
    </React.Fragment>
  );

  const buildSet = (prefix) => {
    const items = [];
    for (let r = 0; r < repeatsPerSet; r++) {
      announcements.forEach((a, i) => {
        items.push(renderItem(a, `${prefix}-${r}-${i}`));
      });
    }
    return items;
  };

  const measureItems = [];
  announcements.forEach((a, i) => {
    measureItems.push(renderItem(a, `m-${i}`));
  });

  return (
    <TickerWrapper>
      <LabelTag>NOTICE</LabelTag>

      <MeasureBox ref={measureRef}>
        {measureItems}
      </MeasureBox>

      <TickerTrack ref={trackRef}>
        <Spacer $w={80} />
        {buildSet('a')}
        {buildSet('b')}
      </TickerTrack>
    </TickerWrapper>
  );
};

export default AnnouncementTicker;
