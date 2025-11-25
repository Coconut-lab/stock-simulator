-- MySQL dump 10.13  Distrib 8.0.41, for macos15 (arm64)
--
-- Host: localhost    Database: finance_db
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `market_hours`
--

DROP TABLE IF EXISTS `market_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `market_hours` (
  `market` varchar(20) NOT NULL,
  `open_time` time NOT NULL,
  `close_time` time NOT NULL,
  `timezone` varchar(50) NOT NULL,
  `trading_days` varchar(20) DEFAULT 'MON-FRI',
  PRIMARY KEY (`market`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='시장 운영시간';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `market_hours`
--

LOCK TABLES `market_hours` WRITE;
/*!40000 ALTER TABLE `market_hours` DISABLE KEYS */;
INSERT INTO `market_hours` VALUES ('KRW','09:00:00','15:30:00','Asia/Seoul','MON-FRI'),('USD','09:30:00','16:00:00','America/New_York','MON-FRI');
/*!40000 ALTER TABLE `market_hours` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `portfolios`
--

DROP TABLE IF EXISTS `portfolios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `portfolios` (
  `portfolio_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '사용자 ID',
  `stock_id` bigint NOT NULL COMMENT '종목 ID',
  `quantity` int NOT NULL DEFAULT '0' COMMENT '보유 수량',
  `avg_price` decimal(15,4) NOT NULL COMMENT '평균 매수가',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`portfolio_id`),
  UNIQUE KEY `uk_user_stock` (`user_id`,`stock_id`),
  KEY `idx_portfolio_user_id` (`user_id`),
  KEY `idx_portfolio_stock_id` (`stock_id`),
  CONSTRAINT `fk_portfolio_stock` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`stock_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_portfolio_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='포트폴리오';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `portfolios`
--

LOCK TABLES `portfolios` WRITE;
/*!40000 ALTER TABLE `portfolios` DISABLE KEYS */;
INSERT INTO `portfolios` VALUES (4,2,1,2,96700.0000,'2025-11-24 15:10:49','2025-11-24 15:10:49'),(5,2,4,1,257500.0000,'2025-11-24 15:10:56','2025-11-24 15:10:56'),(6,2,20,4,52223.4979,'2025-11-24 15:11:03','2025-11-24 15:11:03'),(7,2,18,2,153749.5136,'2025-11-24 15:11:11','2025-11-24 15:11:11');
/*!40000 ALTER TABLE `portfolios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stocks`
--

DROP TABLE IF EXISTS `stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stocks` (
  `stock_id` bigint NOT NULL AUTO_INCREMENT,
  `symbol` varchar(20) NOT NULL COMMENT '종목코드',
  `name` varchar(100) DEFAULT NULL COMMENT '종목명',
  `current_price` decimal(15,4) NOT NULL COMMENT '현재가',
  `previous_close` decimal(15,4) DEFAULT NULL COMMENT '전일종가',
  `open_price` decimal(15,4) DEFAULT NULL COMMENT '시가',
  `high_price` decimal(15,4) DEFAULT NULL COMMENT '고가',
  `low_price` decimal(15,4) DEFAULT NULL COMMENT '저가',
  `volume` bigint DEFAULT '0' COMMENT '거래량',
  `change_amount` decimal(15,4) DEFAULT NULL COMMENT '변동가',
  `change_percent` decimal(8,4) DEFAULT NULL COMMENT '변동률',
  `market` varchar(10) DEFAULT 'KRW' COMMENT '시장(KRW/USD)',
  `currency` varchar(10) DEFAULT 'KRW' COMMENT '통화',
  `exchange_rate` decimal(10,4) DEFAULT '1.0000' COMMENT '환율(USD만)',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_id`),
  UNIQUE KEY `uk_symbol` (`symbol`),
  KEY `idx_stocks_symbol` (`symbol`),
  KEY `idx_stocks_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='주식';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stocks`
--

LOCK TABLES `stocks` WRITE;
/*!40000 ALTER TABLE `stocks` DISABLE KEYS */;
INSERT INTO `stocks` VALUES (1,'005930','삼성전자',96700.0000,94800.0000,97800.0000,99000.0000,96200.0000,28497744,1900.0000,2.0042,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(2,'000660','SK하이닉스',520000.0000,521000.0000,531000.0000,542000.0000,517000.0000,5368726,-1000.0000,-0.1919,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(3,'035420','네이버',261000.0000,262500.0000,267500.0000,269500.0000,259000.0000,1657805,-1500.0000,-0.5714,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(4,'005380','현대차',257500.0000,259500.0000,262000.0000,262000.0000,257500.0000,599241,-2000.0000,-0.7707,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(5,'051910','LG화학',358500.0000,367000.0000,369000.0000,370500.0000,355000.0000,319529,-8500.0000,-2.3161,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(6,'006400','삼성SDI',281000.0000,288500.0000,291500.0000,291500.0000,280500.0000,808887,-7500.0000,-2.5997,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(7,'035720','카카오',58800.0000,58700.0000,59300.0000,59500.0000,57600.0000,2205376,100.0000,0.1704,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(8,'068270','셀트리온',182100.0000,187400.0000,189300.0000,189500.0000,182100.0000,1925846,-5300.0000,-2.8282,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(9,'207940','삼성바이오로직스',1789000.0000,1221000.0000,1797000.0000,1841000.0000,1650000.0000,533491,568000.0000,46.5192,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(10,'373220','LG에너지솔루션',412000.0000,425500.0000,429500.0000,429500.0000,412000.0000,431766,-13500.0000,-3.1727,'KRW','KRW',1.0000,'2025-11-24 16:27:41'),(11,'AAPL','Apple Inc.',275.0900,271.4900,270.9000,275.9200,270.9000,16398397,3.6000,1.3260,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(12,'GOOGL','Alphabet Inc.',314.5350,299.6600,310.9400,318.5600,309.5950,31497080,14.8750,4.9640,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(13,'MSFT','Microsoft Corporation',474.9450,472.1200,475.0000,476.1800,468.0200,10151757,2.8250,0.5984,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(14,'AMZN','Amazon.com Inc.',225.1100,220.6900,222.5800,226.7900,222.2700,15200903,4.4200,2.0028,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(15,'TSLA','Tesla Inc.',418.7200,391.0900,402.1600,419.5500,401.0900,41924532,27.6300,7.0649,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(16,'META','Meta Platforms Inc.',611.7950,594.2500,598.7200,614.8200,597.6301,8433092,17.5450,2.9525,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(17,'NVDA','NVIDIA Corporation',182.0100,178.8800,179.5000,182.1300,176.4800,91170158,3.1300,1.7498,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(18,'NFLX','Netflix Inc.',104.1650,104.3100,104.2500,105.1300,103.3200,11220722,-0.1450,-0.1390,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(19,'AMD','Advanced Micro Devices',213.7650,203.7800,207.1600,213.8100,205.8500,16898524,9.9850,4.8999,'USD','USD',1475.6600,'2025-11-24 16:27:41'),(20,'INTC','Intel Corporation',35.9900,34.5000,34.9950,36.0700,34.6900,26402763,1.4900,4.3188,'USD','USD',1475.6600,'2025-11-24 16:27:41');
/*!40000 ALTER TABLE `stocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `transaction_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '사용자 ID',
  `stock_id` bigint NOT NULL COMMENT '종목 ID',
  `type` enum('BUY','SELL') NOT NULL COMMENT '거래 유형',
  `quantity` int NOT NULL COMMENT '거래 수량',
  `price` decimal(15,4) NOT NULL COMMENT '거래 가격',
  `commission` decimal(10,2) DEFAULT '0.00' COMMENT '거래 수수료',
  `total_amount` decimal(15,2) NOT NULL COMMENT '총 거래금액',
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '거래 시각',
  PRIMARY KEY (`transaction_id`),
  KEY `idx_transaction_user_id` (`user_id`),
  KEY `idx_transaction_stock_id` (`stock_id`),
  KEY `idx_transaction_timestamp` (`timestamp`),
  CONSTRAINT `fk_transaction_stock` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`stock_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='거래내역';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,1,1,'BUY',2,96700.0000,1000.00,194400.00,'2025-11-24 13:13:52'),(2,1,1,'SELL',2,96700.0000,1000.00,192400.00,'2025-11-24 13:14:21'),(3,2,18,'BUY',1,153749.5136,1350.00,155099.51,'2025-11-24 15:08:09'),(4,2,18,'SELL',1,153749.5136,1350.00,152399.51,'2025-11-24 15:08:35'),(5,2,20,'BUY',4,52223.4979,1350.00,210243.99,'2025-11-24 15:09:44'),(6,2,20,'SELL',4,52223.4979,1350.00,207543.99,'2025-11-24 15:10:17'),(7,2,1,'BUY',2,96700.0000,1000.00,194400.00,'2025-11-24 15:10:49'),(8,2,4,'BUY',1,257500.0000,1000.00,258500.00,'2025-11-24 15:10:56'),(9,2,20,'BUY',4,52223.4979,1350.00,210243.99,'2025-11-24 15:11:03'),(10,2,18,'BUY',2,153749.5136,1350.00,308849.03,'2025-11-24 15:11:11');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `balance` decimal(15,2) DEFAULT '1000000.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'2coconut','wosjiwjs@gmail.com','$2b$12$Zn8Ms5UHG8NNw0bQUYF6LO1cpDYCMAd5mMT2wrI3c5YNd8FA7eHDa',998000.00,'2025-11-24 13:05:43','2025-11-24 13:14:21'),(2,'Test_User','Test@test.com','$2b$12$wrJpmtwDS49Iliinw7pWQO33YEsK1aW3ZD6KE2bY/3YELR78ahriq',22607.00,'2025-11-24 14:51:55','2025-11-24 15:11:11');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'finance_db'
--

--
-- Dumping routines for database 'finance_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-25  1:37:13
