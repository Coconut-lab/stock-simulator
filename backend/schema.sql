-- ============================================
-- Stock Simulator MySQL Schema (FK 버전)
-- 외래 키 관계를 사용하는 정규화된 설계
-- ============================================

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS finance_db
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE finance_db;

-- 기존 테이블 삭제 (순서 중요 - 외래 키 때문에)
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `portfolios`;
DROP TABLE IF EXISTS `stocks`;
DROP TABLE IF EXISTS `stock_cache`;
DROP TABLE IF EXISTS `market_hours`;
DROP TABLE IF EXISTS `users`;

-- ============================================
-- Users: 사용자 정보
-- ============================================
CREATE TABLE `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `balance` DECIMAL(15, 2) DEFAULT 1000000.00,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `uk_email` (`email`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='사용자';

-- ============================================
-- Market_Hours: 시장 운영 시간
-- ============================================
CREATE TABLE `market_hours` (
    `market` VARCHAR(20) NOT NULL,
    `open_time` TIME NOT NULL,
    `close_time` TIME NOT NULL,
    `timezone` VARCHAR(50) NOT NULL,
    `trading_days` VARCHAR(20) DEFAULT 'MON-FRI',
    PRIMARY KEY (`market`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='시장 운영시간';

-- 기본 시장 데이터 삽입
INSERT INTO `market_hours` (`market`, `open_time`, `close_time`, `timezone`, `trading_days`) VALUES
('KRW', '09:00:00', '15:30:00', 'Asia/Seoul', 'MON-FRI'),
('USD', '09:30:00', '16:00:00', 'America/New_York', 'MON-FRI');

-- ============================================
-- Stocks: 주식 정보 (기준 테이블)
-- ============================================
CREATE TABLE `stocks` (
    `stock_id` BIGINT NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(20) NOT NULL COMMENT '종목코드',
    `name` VARCHAR(100) NULL COMMENT '종목명',
    `current_price` DECIMAL(15, 4) NOT NULL COMMENT '현재가',
    `previous_close` DECIMAL(15, 4) NULL COMMENT '전일종가',
    `open_price` DECIMAL(15, 4) NULL COMMENT '시가',
    `high_price` DECIMAL(15, 4) NULL COMMENT '고가',
    `low_price` DECIMAL(15, 4) NULL COMMENT '저가',
    `volume` BIGINT DEFAULT 0 COMMENT '거래량',
    `change_amount` DECIMAL(15, 4) NULL COMMENT '변동가',
    `change_percent` DECIMAL(8, 4) NULL COMMENT '변동률',
    `market` VARCHAR(10) DEFAULT 'KRW' COMMENT '시장(KRW/USD)',
    `currency` VARCHAR(10) DEFAULT 'KRW' COMMENT '통화',
    `exchange_rate` DECIMAL(10, 4) DEFAULT 1.0000 COMMENT '환율(USD만)',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`stock_id`),
    UNIQUE KEY `uk_symbol` (`symbol`),
    INDEX `idx_stocks_symbol` (`symbol`),
    INDEX `idx_stocks_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='주식';

-- ============================================
-- Portfolios: 사용자 보유 종목
-- ============================================
CREATE TABLE `portfolios` (
    `portfolio_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT '사용자 ID',
    `stock_id` BIGINT NOT NULL COMMENT '종목 ID',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '보유 수량',
    `avg_price` DECIMAL(15, 4) NOT NULL COMMENT '평균 매수가',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`portfolio_id`),
    UNIQUE KEY `uk_user_stock` (`user_id`, `stock_id`),
    INDEX `idx_portfolio_user_id` (`user_id`),
    INDEX `idx_portfolio_stock_id` (`stock_id`),
    CONSTRAINT `fk_portfolio_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_portfolio_stock` FOREIGN KEY (`stock_id`) 
        REFERENCES `stocks` (`stock_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='포트폴리오';

-- ============================================
-- Transactions: 거래 내역
-- ============================================
CREATE TABLE `transactions` (
    `transaction_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT '사용자 ID',
    `stock_id` BIGINT NOT NULL COMMENT '종목 ID',
    `type` ENUM('BUY', 'SELL') NOT NULL COMMENT '거래 유형',
    `quantity` INT NOT NULL COMMENT '거래 수량',
    `price` DECIMAL(15, 4) NOT NULL COMMENT '거래 가격',
    `commission` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '거래 수수료',
    `total_amount` DECIMAL(15, 2) NOT NULL COMMENT '총 거래금액',
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '거래 시각',
    PRIMARY KEY (`transaction_id`),
    INDEX `idx_transaction_user_id` (`user_id`),
    INDEX `idx_transaction_stock_id` (`stock_id`),
    INDEX `idx_transaction_timestamp` (`timestamp`),
    CONSTRAINT `fk_transaction_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_transaction_stock` FOREIGN KEY (`stock_id`) 
        REFERENCES `stocks` (`stock_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='거래내역';
