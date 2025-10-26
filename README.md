# 가상 주식 투자 시뮬레이터

실제 주식 데이터를 기반으로 한 가상 주식 투자 웹 애플리케이션입니다. 실제 돈을 잃을 위험 없이 주식 투자를 연습하고 포트폴리오 관리를 학습할 수 있습니다.

## 🚀 주요 기능

### 사용자 관리
- 회원가입 및 로그인
- 개인 포트폴리오 관리
- 거래 내역 추적

### 주식 거래
- 실시간 주식 가격 조회 (FinanceDataReader 라이브러리 사용)
- 한국 주식 (KRX) 및 미국 주식 (NASDAQ) 지원
- 매수/매도 기능
- 실제와 동일한 거래 수수료 적용
- 주식 가격 차트 및 상세 분석

### 포트폴리오 관리
- 보유 주식 현황 조회
- 손익 계산 및 수익률 분석
- 포트폴리오 가치 평가
- 거래 이력 관리

### 시장 정보
- 주요 주식 종목 현황
- 주식 검색 기능
- 시장별 인기 종목 표시
- 주식 상세 페이지 및 가격 차트
- 실시간 거래 기능

## 🛠 기술 스택

### Backend
- **Python 3.8+**
- **Flask** - 웹 프레임워크
- **MongoDB** - 데이터베이스
- **FinanceDataReader** - 주식 데이터 API (대안: yfinance)
- **JWT** - 인증 토큰
- **bcrypt** - 비밀번호 암호화

### Frontend
- **React 19** - UI 라이브러리
- **React Router** - 라우팅
- **Styled Components** - 스타일링
- **Axios** - HTTP 클라이언트
- **Recharts** - 차트 라이브러리

### Database
- **MongoDB Atlas** - 클라우드 데이터베이스

## 📋 시스템 요구사항

- Node.js 16.0 이상
- Python 3.8 이상
- MongoDB 접근 권한

## 🚀 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd finace
```

### 편리한 설치 스크립트 (권장)
```bash
# macOS/Linux
chmod +x start.sh
./start.sh

# Windows
start.bat
```

스크립트가 자동으로 백엔드와 프론트엔드를 설정하고 실행합니다.

### 수동 설치 (선택)

### 2. Backend 설정

#### 필요한 패키지 설치
```bash
# 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

# 패키지 설치
pip install -r requirements.txt
```

#### 환경 변수 설정
`backend/.env` 파일을 수정하여 JWT 시크릿 키를 설정하세요:
```
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
FLASK_ENV=development
DEBUG=True
```

#### Backend 서버 실행
```bash
cd backend
python app.py
```

서버는 `http://localhost:5000`에서 실행됩니다.

### 3. Frontend 설정

#### 필요한 패키지 설치
```bash
cd frontend
npm install
```

#### Frontend 개발 서버 실행
```bash
npm start
```

애플리케이션은 `http://localhost:3000`에서 실행됩니다.

## 🎆 새로 추가된 기능

### 📈 주식 차트 기능
- **실시간 가격 차트**: Line Chart 및 Area Chart 지원
- **다양한 기간**: 1주일, 1개월, 3개월, 6개월, 1년
- **상세 정보**: 시가, 고가, 저가, 종가, 거래량
- **인터랙티브 툴팁**: 마우스 호버로 상세 데이터 표시

### 📊 주식 상세 페이지
- **주식 정보**: 현재가, 전일대비 변동률, 시가/고가/저가
- **실시간 거래**: 상세 페이지에서 직접 매수/매도
- **거래 계산기**: 예상 거래금액, 수수료, 총 결제금액 자동 계산
- **내비게이션**: 시장 페이지에서 주식 클릭으로 이동

### 📶 FinanceDataReader 통합
- **안정적 데이터**: 한국/미국 주식 데이터 모두 안정적 제공
- **실시간 업데이트**: 5분마다 자동 업데이트
- **폴백 시스템**: API 오류 시 자동 대체 데이터 사용

## 💰 초기 설정

- 새 사용자는 회원가입 시 **100만원**의 가상 자금으로 시작합니다
- 거래 수수료는 실제와 동일하게 적용됩니다:
  - 한국 주식: 0.015%
  - 미국 주식: 0.005%

## 📊 지원 주식

### 한국 주식 (KOSPI)
- 삼성전자 (005930.KS)
- SK하이닉스 (000660.KS)
- 네이버 (035420.KS)
- 현대차 (005380.KS)
- LG화학 (051910.KS)
- 삼성SDI (006400.KS)
- 카카오 (035720.KS)
- 셀트리온 (068270.KS)
- 삼성바이오로직스 (207940.KS)
- LG에너지솔루션 (373220.KS)

### 미국 주식 (NASDAQ)
- Apple (AAPL)
- Google (GOOGL)
- Microsoft (MSFT)
- Amazon (AMZN)
- Tesla (TSLA)
- Meta (META)
- NVIDIA (NVDA)
- Netflix (NFLX)
- AMD (AMD)
- Intel (INTC)

## 🏗 프로젝트 구조

```
finace/
├── backend/                 # Flask 백엔드
│   ├── models/             # 데이터 모델
│   ├── routes/             # API 라우트
│   ├── services/           # 비즈니스 로직
│   ├── utils/              # 유틸리티 함수
│   ├── config.py           # 설정 파일
│   └── app.py              # 메인 애플리케이션
├── frontend/               # React 프론트엔드
│   ├── src/
│   │   ├── components/     # 재사용 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── services/       # API 서비스
│   │   ├── context/        # React Context
│   │   ├── hooks/          # 커스텀 훅
│   │   └── utils/          # 유틸리티 함수
│   └── public/
├── requirements.txt        # Python 의존성
└── README.md
```

## 🔒 보안 고려사항

- JWT 토큰 기반 인증
- 비밀번호 bcrypt 해싱
- CORS 설정으로 크로스 오리진 요청 제어
- 입력 데이터 검증 및 보안

## 📈 데이터 업데이트

- **한국/미국 주식**: FinanceDataReader를 통한 실시간 데이터 (5분마다 업데이트)
- **차트 데이터**: 최대 1년간의 주가 이력 데이터 제공
- 데이터는 MongoDB에 캐시되어 빠른 응답을 제공합니다
- API 오류 시 fallback 데이터로 서비스 연속성을 보장합니다

## 🐛 알려진 이슈

- 주식 시장 휴장일에는 이전 거래일 종가가 표시됩니다
- FinanceDataReader를 사용하여 한국/미국 주식 데이터 모두 안정적으로 제공합니다
- 주식 차트는 최대 1년간의 데이터를 지원합니다
- 실시간 거래 기능으로 주식 상세 페이지에서 직접 매수/매도 가능

## 🔧 문제 해결

### 백엔드 실행 오류 시:
- Python 버전 확인 (3.8 이상 필요)
- 의존성 패키지 재설치: `pip install -r requirements.txt`

### 프론트엔드 실행 오류 시:
- Node.js 버전 확인 (16.0 이상 필요)
- 의존성 패키지 재설치: `npm install`

### MongoDB 연결 오류 시:
- 인터넷 연결 확인
- MongoDB Atlas 클러스터 상태 확인

### FinanceDataReader 관련 이슈 시:
- 자동으로 fallback 데이터로 전환되어 서비스 연속성을 보장합니다
- 업데이트 간격이 5분으로 설정되어 rate limiting을 방지합니다
- 한국/미국 주식 모두 안정적으로 데이터를 제공합니다
- 서비스 재시작 시 자동으로 복구됩니다

## 💡 사용 팁

1. **회원가입**: 처음 방문 시 회원가입하여 100만원의 가상 자금을 받으세요
2. **주식 검색**: 시장 페이지에서 원하는 주식을 검색할 수 있습니다
3. **주식 차트**: 주식을 클릭하면 상세 페이지에서 가격 차트를 확인할 수 있습니다
4. **실시간 거래**: 주식 상세 페이지에서 직접 매수/매도가 가능합니다
5. **포트폴리오**: 보유 주식의 실시간 손익을 확인하세요
6. **차트 기간**: 1주일부터 1년까지 다양한 기간의 차트를 볼 수 있습니다
7. **거래 수수료**: 매수/매도 시 실제와 동일한 수수료가 적용됩니다

## 🔮 향후 개발 계획

- [x] 차트 기능 추가 (가격 히스토리, 기술적 분석) - **완료**
- [x] 주식 상세 페이지 및 실시간 거래 - **완료**
- [ ] 포트폴리오 성과 분석 도구
- [ ] 시장 뉴스 통합
- [ ] 모바일 반응형 UI 개선
- [ ] 더 많은 주식 종목 추가
- [ ] 사용자 순위 시스템
- [ ] 모의 투자 대회 기능
- [ ] 알림 및 알림탁 기능
- [ ] 다방면 차트 (캔들차트, 볼린저밴드 등)

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (\`git checkout -b feature/새기능\`)
3. 변경사항을 커밋합니다 (\`git commit -m '새 기능 추가'\`)
4. 브랜치에 푸시합니다 (\`git push origin feature/새기능\`)
5. Pull Request를 생성합니다

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

## ⚠️ 면책조항

이 애플리케이션은 교육 목적으로만 사용되며, 실제 금융 조언을 제공하지 않습니다. 실제 투자 결정을 내리기 전에 전문가와 상담하시기 바랍니다.