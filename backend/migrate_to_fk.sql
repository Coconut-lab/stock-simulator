-- ============================================
-- 마이그레이션 스크립트: symbol → stock_id FK 구조로 변경
-- 기존 데이터를 유지하면서 구조 변경
-- ============================================

USE finance_db;

-- 1단계: 백업 테이블 생성
CREATE TABLE IF NOT EXISTS `portfolios_backup` LIKE `portfolios`;
INSERT INTO `portfolios_backup` SELECT * FROM `portfolios`;

CREATE TABLE IF NOT EXISTS `transactions_backup` LIKE `transactions`;
INSERT INTO `transactions_backup` SELECT * FROM `transactions`;

-- 2단계: 기존 외래 키 삭제 (있다면)
ALTER TABLE `portfolios` DROP FOREIGN KEY IF EXISTS `fk_portfolio_user`;
ALTER TABLE `transactions` DROP FOREIGN KEY IF EXISTS `fk_transaction_user`;

-- 3단계: Stocks 테이블에 기존 심볼들 등록
-- Portfolios에 있는 심볼
INSERT IGNORE INTO `stocks` (`symbol`, `name`, `current_price`, `market`, `currency`)
SELECT DISTINCT 
    `symbol`,
    `symbol` as `name`,
    0 as `current_price`,
    CASE 
        WHEN `symbol` REGEXP '^[0-9]{6}$' THEN 'KRW'
        ELSE 'USD'
    END as `market`,
    CASE 
        WHEN `symbol` REGEXP '^[0-9]{6}$' THEN 'KRW'
        ELSE 'USD'
    END as `currency`
FROM `portfolios_backup`
WHERE `symbol` IS NOT NULL;

-- Transactions에 있는 심볼
INSERT IGNORE INTO `stocks` (`symbol`, `name`, `current_price`, `market`, `currency`)
SELECT DISTINCT 
    `symbol`,
    `symbol` as `name`,
    0 as `current_price`,
    CASE 
        WHEN `symbol` REGEXP '^[0-9]{6}$' THEN 'KRW'
        ELSE 'USD'
    END as `market`,
    CASE 
        WHEN `symbol` REGEXP '^[0-9]{6}$' THEN 'KRW'
        ELSE 'USD'
    END as `currency`
FROM `transactions_backup`
WHERE `symbol` IS NOT NULL;

-- 4단계: 임시 컬럼 추가
ALTER TABLE `portfolios` ADD COLUMN `stock_id_new` BIGINT NULL AFTER `user_id`;
ALTER TABLE `transactions` ADD COLUMN `stock_id_new` BIGINT NULL AFTER `user_id`;

-- 5단계: stock_id 매핑
UPDATE `portfolios` p
JOIN `stocks` s ON p.`symbol` = s.`symbol`
SET p.`stock_id_new` = s.`stock_id`;

UPDATE `transactions` t
JOIN `stocks` s ON t.`symbol` = s.`symbol`
SET t.`stock_id_new` = s.`stock_id`;

-- 6단계: 기존 컬럼 삭제 및 새 컬럼 이름 변경
ALTER TABLE `portfolios` 
    DROP COLUMN `symbol`,
    DROP COLUMN `market`,
    CHANGE COLUMN `stock_id_new` `stock_id` BIGINT NOT NULL,
    DROP INDEX IF EXISTS `uk_user_symbol`,
    ADD UNIQUE KEY `uk_user_stock` (`user_id`, `stock_id`),
    ADD INDEX `idx_portfolio_stock_id` (`stock_id`);

ALTER TABLE `transactions`
    DROP COLUMN `symbol`,
    DROP COLUMN `market`,
    CHANGE COLUMN `stock_id_new` `stock_id` BIGINT NOT NULL,
    ADD INDEX `idx_transaction_stock_id` (`stock_id`);

-- 7단계: 외래 키 제약조건 추가
ALTER TABLE `portfolios`
    ADD CONSTRAINT `fk_portfolio_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    ADD CONSTRAINT `fk_portfolio_stock` FOREIGN KEY (`stock_id`) 
        REFERENCES `stocks` (`stock_id`) ON DELETE RESTRICT;

ALTER TABLE `transactions`
    ADD CONSTRAINT `fk_transaction_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    ADD CONSTRAINT `fk_transaction_stock` FOREIGN KEY (`stock_id`) 
        REFERENCES `stocks` (`stock_id`) ON DELETE RESTRICT;

-- 8단계: 백업 테이블 삭제 (선택사항)
-- DROP TABLE IF EXISTS `portfolios_backup`;
-- DROP TABLE IF EXISTS `transactions_backup`;

SELECT 'Migration completed successfully!' as status;
