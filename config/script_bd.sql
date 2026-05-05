CREATE DATABASE  IF NOT EXISTS `planob` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `planob`;

-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: planob
-- ------------------------------------------------------
-- Server version	9.6.0
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;
--
-- GTID state at the beginning of the backup 
--
SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '8b6f3a89-1caf-11f1-b6ec-0a0027000007:1-91';
--
-- Table structure for table `aluno`
--
DROP TABLE IF EXISTS `aluno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aluno` (
  `id_aluno` int NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `cidade` varchar(50) NOT NULL,
  `bairro` varchar(50) NOT NULL,
  `uf` char(2) NOT NULL,
  `rua` varchar(100) NOT NULL,
  `cep` varchar(10) NOT NULL,
  PRIMARY KEY (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `aluno`
--
LOCK TABLES `aluno` WRITE;
/*!40000 ALTER TABLE `aluno` DISABLE KEYS */;
/*!40000 ALTER TABLE `aluno` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `assinatura`
--
DROP TABLE IF EXISTS `assinatura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assinatura` (
  `id_assinatura` int NOT NULL,
  `id_aluno` int NOT NULL,
  `tipo_plano` varchar(50) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_inicio` char(10) NOT NULL,
  `data_fim` char(10) NOT NULL,
  `periodicidade` varchar(30) NOT NULL,
  PRIMARY KEY (`id_assinatura`),
  KEY `fk_assinatura_aluno` (`id_aluno`),
  CONSTRAINT `fk_assinatura_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `assinatura`
--
LOCK TABLES `assinatura` WRITE;
/*!40000 ALTER TABLE `assinatura` DISABLE KEYS */;
/*!40000 ALTER TABLE `assinatura` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `chat_feedback`
--
DROP TABLE IF EXISTS `chat_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_feedback` (
  `id_chat_feedback` int NOT NULL,
  `id_professor` int NOT NULL,
  `id_aluno` int NOT NULL,
  PRIMARY KEY (`id_chat_feedback`),
  KEY `fk_chat_professor` (`id_professor`),
  KEY `fk_chat_aluno` (`id_aluno`),
  CONSTRAINT `fk_chat_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_chat_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `chat_feedback`
--
LOCK TABLES `chat_feedback` WRITE;
/*!40000 ALTER TABLE `chat_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_feedback` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `desconto`
--
DROP TABLE IF EXISTS `desconto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `desconto` (
  `id_assinatura` int NOT NULL,
  `id_aluno` int NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_assinatura`,`id_aluno`),
  KEY `fk_desconto_aluno` (`id_aluno`),
  CONSTRAINT `fk_desconto_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_desconto_assinatura` FOREIGN KEY (`id_assinatura`) REFERENCES `assinatura` (`id_assinatura`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `desconto`
--
LOCK TABLES `desconto` WRITE;
/*!40000 ALTER TABLE `desconto` DISABLE KEYS */;
/*!40000 ALTER TABLE `desconto` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `ficha_treino`
--
DROP TABLE IF EXISTS `ficha_treino`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ficha_treino` (
  `id_ficha_treino` int NOT NULL,
  `id_professor` int NOT NULL,
  `nome_ficha` varchar(100) NOT NULL,
  `data_criacao` date NOT NULL,
  `link_video` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_ficha_treino`),
  KEY `fk_ficha_professor` (`id_professor`),
  CONSTRAINT `fk_ficha_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `ficha_treino`
--
LOCK TABLES `ficha_treino` WRITE;
/*!40000 ALTER TABLE `ficha_treino` DISABLE KEYS */;
/*!40000 ALTER TABLE `ficha_treino` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `login`
--
DROP TABLE IF EXISTS `login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login` (
  `id_login` int NOT NULL,
  `id_aluno` int NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(50) NOT NULL,
  PRIMARY KEY (`id_login`),
  KEY `fk_login_aluno` (`id_aluno`),
  CONSTRAINT `fk_login_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `login`
--
LOCK TABLES `login` WRITE;
/*!40000 ALTER TABLE `login` DISABLE KEYS */;
/*!40000 ALTER TABLE `login` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `login_professor`
--
DROP TABLE IF EXISTS `login_professor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_professor` (
  `id_login` int NOT NULL,
  `id_professor` int NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(50) NOT NULL,
  `cref` varchar(11) NOT NULL,
  PRIMARY KEY (`id_login`),
  KEY `fk_login_professor` (`id_professor`),
  CONSTRAINT `fk_login_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `login_professor`
--
LOCK TABLES `login_professor` WRITE;
/*!40000 ALTER TABLE `login_professor` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_professor` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `professor`
--
DROP TABLE IF EXISTS `professor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `professor` (
  `id_professor` int NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(50) NOT NULL,
  `cref` varchar(11) NOT NULL,
  PRIMARY KEY (`id_professor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `professor`
--
LOCK TABLES `professor` WRITE;
/*!40000 ALTER TABLE `professor` DISABLE KEYS */;
/*!40000 ALTER TABLE `professor` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `treino_exercicio`
--
DROP TABLE IF EXISTS `treino_exercicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `treino_exercicio` (
  `id_treino_exercicio` int NOT NULL,
  `id_ficha` int NOT NULL,
  `series` int NOT NULL,
  `repeticoes` int NOT NULL,
  `carga` decimal(10,2) DEFAULT NULL,
  `id_aluno` int DEFAULT NULL,
  PRIMARY KEY (`id_treino_exercicio`),
  KEY `fk_treino_ficha` (`id_ficha`),
  KEY `fk_treino_aluno` (`id_aluno`),
  CONSTRAINT `fk_treino_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_treino_ficha` FOREIGN KEY (`id_ficha`) REFERENCES `ficha_treino` (`id_ficha_treino`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `treino_exercicio`
--
LOCK TABLES `treino_exercicio` WRITE;
/*!40000 ALTER TABLE `treino_exercicio` DISABLE KEYS */;
/*!40000 ALTER TABLE `treino_exercicio` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `video`
--
DROP TABLE IF EXISTS `video`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video` (
  `id_video` int NOT NULL,
  `id_professor` int NOT NULL,
  `id_aluno` int DEFAULT NULL,
  `link_video` varchar(255) NOT NULL,
  PRIMARY KEY (`id_video`),
  KEY `fk_video_professor` (`id_professor`),
  KEY `fk_video_aluno` (`id_aluno`),
  CONSTRAINT `fk_video_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_video_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Dumping data for table `video`
--
LOCK TABLES `video` WRITE;
/*!40000 ALTER TABLE `video` DISABLE KEYS */;
/*!40000 ALTER TABLE `video` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
-- Dump completed on 2026-04-17 10:37:13