import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

// 옵션 상세는 Options.js의 체인에서 직접 매매하므로
// /options/:underlying 라우트는 Options 페이지로 리다이렉트
const OptionsDetail = () => {
  const { underlying } = useParams();
  return <Navigate to={`/options`} replace />;
};

export default OptionsDetail;
