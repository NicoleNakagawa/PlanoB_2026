-- ============================================================
--  PlanoB — script_bd.sql
--  MySQL 8.x · utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS `railway`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `railway`;

SET FOREIGN_KEY_CHECKS = 0;

-- Apagar primeiro as tabelas filhas, depois as tabelas principais
DROP TABLE IF EXISTS `mensagem_feedback`;
DROP TABLE IF EXISTS `chat_feedback`;
DROP TABLE IF EXISTS `suporte`;
DROP TABLE IF EXISTS `sessao_treino`;
DROP TABLE IF EXISTS `progresso_semanal`;
DROP TABLE IF EXISTS `video`;
DROP TABLE IF EXISTS `aluno_ficha`;
DROP TABLE IF EXISTS `exercicio`;
DROP TABLE IF EXISTS `ficha_treino`;
DROP TABLE IF EXISTS `streak`;
DROP TABLE IF EXISTS `desconto`;
DROP TABLE IF EXISTS `pagamento`;
DROP TABLE IF EXISTS `assinatura`;
DROP TABLE IF EXISTS `aluno`;
DROP TABLE IF EXISTS `professor`;
DROP TABLE IF EXISTS `plano`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  1. PLANO
-- ============================================================
CREATE TABLE `plano` (
  `id_plano` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(30) NOT NULL,
  `valor_mensal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `descricao` TEXT,
  PRIMARY KEY (`id_plano`),
  UNIQUE KEY `uk_plano_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `plano` (`id_plano`, `nome`, `valor_mensal`, `descricao`) VALUES
  (1, 'Gratuito', 0.00, 'Acesso básico renovado semestralmente. Inclui vídeos livres e painel de progresso.'),
  (2, 'Lazuli', 59.00, 'Plano premium mensal. Treinos personalizados, vídeos exclusivos e acompanhamento.'),
  (3, 'Diamante', 149.00, 'Plano completo. Tudo do Lazuli + suporte individual e planos de treino avançados.');

-- ============================================================
--  2. PROFESSOR
-- ============================================================
CREATE TABLE `professor` (
  `id_professor` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `cref` VARCHAR(15) NOT NULL,
  `foto_perfil` VARCHAR(255) DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_professor`),
  UNIQUE KEY `uk_professor_email` (`email`),
  UNIQUE KEY `uk_professor_cref` (`cref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  3. ALUNO
-- ============================================================
CREATE TABLE `aluno` (
  `id_aluno` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `cpf` VARCHAR(14) DEFAULT NULL,
  `cep` VARCHAR(10) DEFAULT NULL,
  `rua` VARCHAR(100) DEFAULT NULL,
  `bairro` VARCHAR(50) DEFAULT NULL,
  `cidade` VARCHAR(50) DEFAULT NULL,
  `uf` CHAR(2) DEFAULT NULL,
  `foto_perfil` VARCHAR(255) DEFAULT NULL,
  `id_plano` INT NOT NULL DEFAULT 1,

  -- Dados do aluno / preferências de treino
  `objetivo` VARCHAR(50) DEFAULT NULL,
  `tipo_treino` VARCHAR(50) DEFAULT NULL,
  `nivel_treino` VARCHAR(50) DEFAULT NULL,
  `local_treino` VARCHAR(50) DEFAULT NULL,
  `equipamentos` TEXT DEFAULT NULL,
  `dias_semana` INT DEFAULT NULL,
  `limitacoes` TEXT DEFAULT NULL,
  `dados_completos` TINYINT(1) NOT NULL DEFAULT 0,

  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aluno`),
  UNIQUE KEY `uk_aluno_email` (`email`),
  UNIQUE KEY `uk_aluno_cpf` (`cpf`),
  CONSTRAINT `fk_aluno_plano` FOREIGN KEY (`id_plano`) REFERENCES `plano` (`id_plano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  4. ASSINATURA
-- ============================================================
CREATE TABLE `assinatura` (
  `id_assinatura` INT NOT NULL AUTO_INCREMENT,
  `id_aluno` INT NOT NULL,
  `id_plano` INT NOT NULL,
  `status` ENUM('ativa','cancelada','expirada','pendente') NOT NULL DEFAULT 'pendente',
  `valor_cobrado` DECIMAL(10,2) NOT NULL,
  `data_inicio` DATE NOT NULL,
  `data_fim` DATE DEFAULT NULL,
  `periodicidade` ENUM('mensal','semestral','anual') NOT NULL DEFAULT 'mensal',
  `renovacao_auto` TINYINT(1) NOT NULL DEFAULT 1,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_assinatura`),
  KEY `idx_assinatura_aluno` (`id_aluno`),
  KEY `idx_assinatura_plano` (`id_plano`),
  CONSTRAINT `fk_assinatura_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_assinatura_plano` FOREIGN KEY (`id_plano`) REFERENCES `plano` (`id_plano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  5. PAGAMENTO
-- ============================================================
CREATE TABLE `pagamento` (
  `id_pagamento` INT NOT NULL AUTO_INCREMENT,
  `id_assinatura` INT NOT NULL,
  `id_aluno` INT NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL,
  `status` ENUM('aprovado','recusado','pendente','estornado') NOT NULL DEFAULT 'pendente',
  `metodo` ENUM('cartao_credito','cartao_debito','pix','boleto') NOT NULL DEFAULT 'cartao_credito',
  `nome_titular` VARCHAR(100) NOT NULL,
  `ultimos_4` CHAR(4) DEFAULT NULL,
  `bandeira` VARCHAR(20) DEFAULT NULL,
  `token_gateway` VARCHAR(255) DEFAULT NULL,
  `data_pagamento` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pagamento`),
  KEY `idx_pagamento_assinatura` (`id_assinatura`),
  KEY `idx_pagamento_aluno` (`id_aluno`),
  CONSTRAINT `fk_pagamento_assinatura` FOREIGN KEY (`id_assinatura`) REFERENCES `assinatura` (`id_assinatura`),
  CONSTRAINT `fk_pagamento_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  6. DESCONTO
-- ============================================================
CREATE TABLE `desconto` (
  `id_desconto` INT NOT NULL AUTO_INCREMENT,
  `id_aluno` INT NOT NULL,
  `id_assinatura` INT DEFAULT NULL,
  `codigo` VARCHAR(30) NOT NULL,
  `percentual` DECIMAL(5,2) NOT NULL,
  `dias_streak` INT NOT NULL,
  `usado` TINYINT(1) NOT NULL DEFAULT 0,
  `validade` DATE DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_desconto`),
  KEY `idx_desconto_aluno` (`id_aluno`),
  KEY `idx_desconto_assinatura` (`id_assinatura`),
  CONSTRAINT `fk_desconto_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_desconto_assinatura` FOREIGN KEY (`id_assinatura`) REFERENCES `assinatura` (`id_assinatura`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  7. STREAK
-- ============================================================
CREATE TABLE `streak` (
  `id_streak` INT NOT NULL AUTO_INCREMENT,
  `id_aluno` INT NOT NULL,
  `streak_atual` INT NOT NULL DEFAULT 0,
  `streak_maximo` INT NOT NULL DEFAULT 0,
  `ultima_atividade` DATE DEFAULT NULL,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_streak`),
  UNIQUE KEY `uk_streak_aluno` (`id_aluno`),
  CONSTRAINT `fk_streak_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  8. FICHA DE TREINO
-- ============================================================
CREATE TABLE `ficha_treino` (
  `id_ficha` INT NOT NULL AUTO_INCREMENT,
  `id_professor` INT NOT NULL,
  `nome_ficha` VARCHAR(100) NOT NULL,
  `descricao` TEXT DEFAULT NULL,
  `nivel` ENUM('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
  `categoria` VARCHAR(50) DEFAULT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `data_criacao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ficha`),
  KEY `idx_ficha_professor` (`id_professor`),
  CONSTRAINT `fk_ficha_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  9. EXERCÍCIO
-- ============================================================
CREATE TABLE `exercicio` (
  `id_exercicio` INT NOT NULL AUTO_INCREMENT,
  `id_ficha` INT NOT NULL,
  `titulo` VARCHAR(100) NOT NULL,
  `descricao` TEXT DEFAULT NULL,
  `nivel` ENUM('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
  `categoria` VARCHAR(50) DEFAULT NULL,
  `duracao_segundos` INT DEFAULT NULL,
  `series` INT DEFAULT NULL,
  `repeticoes` INT DEFAULT NULL,
  `carga_kg` DECIMAL(6,2) DEFAULT NULL,
  `link_video` VARCHAR(255) DEFAULT NULL,
  `ordem` INT NOT NULL DEFAULT 1,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_exercicio`),
  KEY `idx_exercicio_ficha` (`id_ficha`),
  CONSTRAINT `fk_exercicio_ficha` FOREIGN KEY (`id_ficha`) REFERENCES `ficha_treino` (`id_ficha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  10. ALUNO_FICHA
-- ============================================================
CREATE TABLE `aluno_ficha` (
  `id_aluno` INT NOT NULL,
  `id_ficha` INT NOT NULL,
  `data_inicio` DATE NOT NULL,
  `data_fim` DATE DEFAULT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `atribuido_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aluno`, `id_ficha`),
  KEY `idx_af_ficha` (`id_ficha`),
  CONSTRAINT `fk_af_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_af_ficha` FOREIGN KEY (`id_ficha`) REFERENCES `ficha_treino` (`id_ficha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  11. VIDEO
-- ============================================================
CREATE TABLE `video` (
  `id_video` INT NOT NULL AUTO_INCREMENT,
  `id_professor` INT NOT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `descricao` TEXT DEFAULT NULL,
  `link_video` VARCHAR(255) NOT NULL,
  `thumbnail` VARCHAR(255) DEFAULT NULL,
  `duracao_seg` INT DEFAULT NULL,
  `categoria` VARCHAR(50) DEFAULT NULL,
  `nivel` ENUM('iniciante','intermediario','avancado') DEFAULT 'iniciante',
  `exclusivo` TINYINT(1) NOT NULL DEFAULT 0,
  `id_plano_min` INT DEFAULT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_video`),
  KEY `idx_video_professor` (`id_professor`),
  KEY `idx_video_plano` (`id_plano_min`),
  CONSTRAINT `fk_video_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`),
  CONSTRAINT `fk_video_plano` FOREIGN KEY (`id_plano_min`) REFERENCES `plano` (`id_plano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  12. PROGRESSO SEMANAL
-- ============================================================
CREATE TABLE `progresso_semanal` (
  `id_progresso` INT NOT NULL AUTO_INCREMENT,
  `id_aluno` INT NOT NULL,
  `semana_inicio` DATE NOT NULL,
  `dias_treinados` INT NOT NULL DEFAULT 0,
  `meta_dias` INT NOT NULL DEFAULT 5,
  `tempo_total_min` INT NOT NULL DEFAULT 0,
  `calorias_total` DECIMAL(8,2) DEFAULT NULL,
  `bpm_maximo` INT DEFAULT NULL,
  `variacao_pct` DECIMAL(5,2) DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_progresso`),
  UNIQUE KEY `uk_progresso_aluno_semana` (`id_aluno`, `semana_inicio`),
  CONSTRAINT `fk_progresso_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  13. SESSÃO TREINO
-- ============================================================
CREATE TABLE `sessao_treino` (
  `id_sessao` INT NOT NULL AUTO_INCREMENT,
  `id_aluno` INT NOT NULL,
  `id_ficha` INT DEFAULT NULL,
  `data_treino` DATE NOT NULL,
  `duracao_min` INT NOT NULL DEFAULT 0,
  `calorias` DECIMAL(7,2) DEFAULT NULL,
  `bpm_maximo` INT DEFAULT NULL,
  `bpm_medio` INT DEFAULT NULL,
  `observacao` TEXT DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sessao`),
  KEY `idx_sessao_aluno` (`id_aluno`),
  KEY `idx_sessao_ficha` (`id_ficha`),
  KEY `idx_sessao_data` (`data_treino`),
  CONSTRAINT `fk_sessao_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_sessao_ficha` FOREIGN KEY (`id_ficha`) REFERENCES `ficha_treino` (`id_ficha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  14. CHAT FEEDBACK
-- ============================================================
CREATE TABLE `chat_feedback` (
  `id_chat` INT NOT NULL AUTO_INCREMENT,
  `id_professor` INT NOT NULL,
  `id_aluno` INT NOT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_chat`),
  UNIQUE KEY `uk_chat_par` (`id_professor`, `id_aluno`),
  KEY `idx_chat_professor` (`id_professor`),
  KEY `idx_chat_aluno` (`id_aluno`),
  CONSTRAINT `fk_chat_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`),
  CONSTRAINT `fk_chat_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  15. MENSAGEM FEEDBACK
-- ============================================================
CREATE TABLE `mensagem_feedback` (
  `id_mensagem` INT NOT NULL AUTO_INCREMENT,
  `id_chat` INT NOT NULL,
  `remetente` ENUM('aluno','professor') NOT NULL,
  `intensidade` ENUM('leve','moderado','intenso','pesado','exaustivo') DEFAULT NULL,
  `nivel_cansaco` INT DEFAULT NULL,
  `texto` TEXT NOT NULL,
  `lida` TINYINT(1) NOT NULL DEFAULT 0,
  `enviado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mensagem`),
  KEY `idx_msg_chat` (`id_chat`),
  KEY `idx_msg_enviado` (`enviado_em`),
  CONSTRAINT `fk_msg_chat` FOREIGN KEY (`id_chat`) REFERENCES `chat_feedback` (`id_chat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  16. SUPORTE
-- ============================================================
CREATE TABLE `suporte` (
  `id_suporte` INT NOT NULL AUTO_INCREMENT,
  `id_aluno` INT DEFAULT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `assunto` VARCHAR(150) DEFAULT NULL,
  `mensagem` TEXT NOT NULL,
  `status` ENUM('aberto','em_atendimento','resolvido','fechado') NOT NULL DEFAULT 'aberto',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_suporte`),
  KEY `idx_suporte_aluno` (`id_aluno`),
  CONSTRAINT `fk_suporte_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;