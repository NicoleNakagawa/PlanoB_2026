-- ============================================================
--  PlanoB — script_bd.sql
--  MySQL 8.x · utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS `planob`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `planob`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
--  1. PLANO
--  Fonte: planos.ejs, painelfree.ejs
--  Tipos: Gratuito (R$0), Lazuli (R$59/mês), Diamante (R$149/mês)
-- ============================================================
DROP TABLE IF EXISTS `plano`;
CREATE TABLE `plano` (
  `id_plano`      INT            NOT NULL AUTO_INCREMENT,
  `nome`          VARCHAR(30)    NOT NULL,             -- 'Gratuito' | 'Lazuli' | 'Diamante'
  `valor_mensal`  DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `descricao`     TEXT,
  PRIMARY KEY (`id_plano`),
  UNIQUE KEY `uk_plano_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dados fixos dos planos mostrados no site
INSERT INTO `plano` (`nome`, `valor_mensal`, `descricao`) VALUES
  ('Gratuito', 0.00,   'Acesso básico renovado semestralmente. Inclui vídeos livres e painel de progresso.'),
  ('Lazuli',   59.00,  'Plano premium mensal. Treinos personalizados, vídeos exclusivos e acompanhamento.'),
  ('Diamante', 149.00, 'Plano completo. Tudo do Lazuli + suporte individual e planos de treino avançados.');


-- ============================================================
--  2. PROFESSOR
--  Fonte: cadastroprofessor.ejs, loginprofessor.ejs, painelprofessor.ejs
--  Campos: nome, email, senha (hash), cref, foto_perfil
-- ============================================================
DROP TABLE IF EXISTS `professor`;
CREATE TABLE `professor` (
  `id_professor`  INT           NOT NULL AUTO_INCREMENT,
  `nome`          VARCHAR(100)  NOT NULL,
  `email`         VARCHAR(100)  NOT NULL,
  `senha_hash`    VARCHAR(255)  NOT NULL,              -- bcrypt/argon2 — nunca salvar texto puro
  `cref`          VARCHAR(15)   NOT NULL,              -- formato 000000-G/SP
  `foto_perfil`   VARCHAR(255)  DEFAULT NULL,          -- path ou URL
  `criado_em`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_professor`),
  UNIQUE KEY `uk_professor_email` (`email`),
  UNIQUE KEY `uk_professor_cref`  (`cref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  3. ALUNO
--  Fonte: cadastroaluno.ejs, loginaluno.ejs, painelfree.ejs, todosalunos.ejs
--  Campos: nome, email, senha, endereço (mantido do SQL original)
-- ============================================================
DROP TABLE IF EXISTS `aluno`;
CREATE TABLE `aluno` (
  `id_aluno`      INT           NOT NULL AUTO_INCREMENT,
  `nome`          VARCHAR(100)  NOT NULL,
  `email`         VARCHAR(100)  NOT NULL,
  `senha_hash`    VARCHAR(255)  NOT NULL,              -- bcrypt/argon2
  `cpf`           VARCHAR(14)   DEFAULT NULL,          -- preenchido no pagamento
  `cep`           VARCHAR(10)   DEFAULT NULL,
  `rua`           VARCHAR(100)  DEFAULT NULL,
  `bairro`        VARCHAR(50)   DEFAULT NULL,
  `cidade`        VARCHAR(50)   DEFAULT NULL,
  `uf`            CHAR(2)       DEFAULT NULL,
  `foto_perfil`   VARCHAR(255)  DEFAULT NULL,
  `id_plano`      INT           NOT NULL DEFAULT 1,    -- 1 = Gratuito por padrão
  `criado_em`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aluno`),
  UNIQUE KEY `uk_aluno_email` (`email`),
  UNIQUE KEY `uk_aluno_cpf`   (`cpf`),
  CONSTRAINT `fk_aluno_plano` FOREIGN KEY (`id_plano`) REFERENCES `plano` (`id_plano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  4. ASSINATURA
--  Fonte: pagamento.ejs, streakprogress.ejs, painelfree.ejs
--  Registra cada contrato ativo ou histórico de um aluno
-- ============================================================
DROP TABLE IF EXISTS `assinatura`;
CREATE TABLE `assinatura` (
  `id_assinatura`  INT            NOT NULL AUTO_INCREMENT,
  `id_aluno`       INT            NOT NULL,
  `id_plano`       INT            NOT NULL,
  `status`         ENUM('ativa','cancelada','expirada','pendente') NOT NULL DEFAULT 'pendente',
  `valor_cobrado`  DECIMAL(10,2)  NOT NULL,            -- valor real pago (pode ter desconto)
  `data_inicio`    DATE           NOT NULL,
  `data_fim`       DATE           DEFAULT NULL,        -- NULL = recorrência sem fim definido
  `periodicidade`  ENUM('mensal','semestral','anual')  NOT NULL DEFAULT 'mensal',
  `renovacao_auto` TINYINT(1)     NOT NULL DEFAULT 1,
  `criado_em`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_assinatura`),
  KEY `idx_assinatura_aluno` (`id_aluno`),
  KEY `idx_assinatura_plano` (`id_plano`),
  CONSTRAINT `fk_assinatura_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno`  (`id_aluno`),
  CONSTRAINT `fk_assinatura_plano` FOREIGN KEY (`id_plano`) REFERENCES `plano`  (`id_plano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  5. PAGAMENTO
--  Fonte: pagamento.ejs
--  Campos do formulário: nome_titular, numero_cartao (últimos 4), cpf, validade, cvv
--  NUNCA armazenar CVV ou número completo — salvar apenas token/últimos 4 dígitos
-- ============================================================
DROP TABLE IF EXISTS `pagamento`;
CREATE TABLE `pagamento` (
  `id_pagamento`   INT            NOT NULL AUTO_INCREMENT,
  `id_assinatura`  INT            NOT NULL,
  `id_aluno`       INT            NOT NULL,
  `valor`          DECIMAL(10,2)  NOT NULL,
  `status`         ENUM('aprovado','recusado','pendente','estornado') NOT NULL DEFAULT 'pendente',
  `metodo`         ENUM('cartao_credito','cartao_debito','pix','boleto') NOT NULL DEFAULT 'cartao_credito',
  `nome_titular`   VARCHAR(100)   NOT NULL,
  `ultimos_4`      CHAR(4)        DEFAULT NULL,        -- últimos 4 dígitos do cartão
  `bandeira`       VARCHAR(20)    DEFAULT NULL,        -- 'visa', 'mastercard', etc.
  `token_gateway`  VARCHAR(255)   DEFAULT NULL,        -- token retornado pelo gateway
  `data_pagamento` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pagamento`),
  KEY `idx_pagamento_assinatura` (`id_assinatura`),
  KEY `idx_pagamento_aluno`      (`id_aluno`),
  CONSTRAINT `fk_pagamento_assinatura` FOREIGN KEY (`id_assinatura`) REFERENCES `assinatura` (`id_assinatura`),
  CONSTRAINT `fk_pagamento_aluno`      FOREIGN KEY (`id_aluno`)      REFERENCES `aluno`       (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  6. DESCONTO (streak/ofensiva)
--  Fonte: streakprogress.ejs
--  Cupons: OFENSIVA10 (10d→5%), OFENSIVA40 (40d→20%), 50d→35%, 90d→50%
-- ============================================================
DROP TABLE IF EXISTS `desconto`;
CREATE TABLE `desconto` (
  `id_desconto`    INT            NOT NULL AUTO_INCREMENT,
  `id_aluno`       INT            NOT NULL,
  `id_assinatura`  INT            DEFAULT NULL,        -- NULL = desconto ainda não aplicado
  `codigo`         VARCHAR(30)    NOT NULL,            -- ex: 'OFENSIVA40'
  `percentual`     DECIMAL(5,2)   NOT NULL,            -- ex: 20.00 (%)
  `dias_streak`    INT            NOT NULL,            -- dias de ofensiva que desbloquearam
  `usado`          TINYINT(1)     NOT NULL DEFAULT 0,
  `validade`       DATE           DEFAULT NULL,
  `criado_em`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_desconto`),
  KEY `idx_desconto_aluno`       (`id_aluno`),
  KEY `idx_desconto_assinatura`  (`id_assinatura`),
  CONSTRAINT `fk_desconto_aluno`      FOREIGN KEY (`id_aluno`)      REFERENCES `aluno`      (`id_aluno`),
  CONSTRAINT `fk_desconto_assinatura` FOREIGN KEY (`id_assinatura`) REFERENCES `assinatura` (`id_assinatura`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  7. STREAK (ofensiva de treinos)
--  Fonte: streakprogress.ejs, painelfree.ejs
--  Registra a sequência de dias consecutivos treinados por aluno
-- ============================================================
DROP TABLE IF EXISTS `streak`;
CREATE TABLE `streak` (
  `id_streak`          INT       NOT NULL AUTO_INCREMENT,
  `id_aluno`           INT       NOT NULL,
  `streak_atual`       INT       NOT NULL DEFAULT 0,   -- dias consecutivos ativos
  `streak_maximo`      INT       NOT NULL DEFAULT 0,   -- maior sequência já atingida
  `ultima_atividade`   DATE      DEFAULT NULL,         -- data do último treino registrado
  `atualizado_em`      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_streak`),
  UNIQUE KEY `uk_streak_aluno` (`id_aluno`),
  CONSTRAINT `fk_streak_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  8. FICHA DE TREINO
--  Fonte: painelprofessor.ejs, editarexercicios.ejs, painelfree.ejs
--  Criada pelo professor e atribuída a alunos
-- ============================================================
DROP TABLE IF EXISTS `ficha_treino`;
CREATE TABLE `ficha_treino` (
  `id_ficha`       INT           NOT NULL AUTO_INCREMENT,
  `id_professor`   INT           NOT NULL,
  `nome_ficha`     VARCHAR(100)  NOT NULL,
  `descricao`      TEXT          DEFAULT NULL,
  `nivel`          ENUM('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
  `categoria`      VARCHAR(50)   DEFAULT NULL,         -- 'Força', 'Cardio', 'HIIT', etc.
  `ativo`          TINYINT(1)    NOT NULL DEFAULT 1,
  `data_criacao`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ficha`),
  KEY `idx_ficha_professor` (`id_professor`),
  CONSTRAINT `fk_ficha_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  9. EXERCÍCIO (dentro de uma ficha)
--  Fonte: editarexercicios.ejs
--  Campos: titulo, descricao, nivel, categoria, duracao_segundos
-- ============================================================
DROP TABLE IF EXISTS `exercicio`;
CREATE TABLE `exercicio` (
  `id_exercicio`      INT           NOT NULL AUTO_INCREMENT,
  `id_ficha`          INT           NOT NULL,
  `titulo`            VARCHAR(100)  NOT NULL,
  `descricao`         TEXT          DEFAULT NULL,
  `nivel`             ENUM('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
  `categoria`         VARCHAR(50)   DEFAULT NULL,
  `duracao_segundos`  INT           DEFAULT NULL,
  `series`            INT           DEFAULT NULL,
  `repeticoes`        INT           DEFAULT NULL,
  `carga_kg`          DECIMAL(6,2)  DEFAULT NULL,
  `link_video`        VARCHAR(255)  DEFAULT NULL,      -- pode apontar para tabela video
  `ordem`             INT           NOT NULL DEFAULT 1, -- posição na ficha
  `criado_em`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_exercicio`),
  KEY `idx_exercicio_ficha` (`id_ficha`),
  CONSTRAINT `fk_exercicio_ficha` FOREIGN KEY (`id_ficha`) REFERENCES `ficha_treino` (`id_ficha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  10. ALUNO_FICHA (atribuição de fichas a alunos)
--  Fonte: painelprofessor.ejs, painelfree.ejs
--  Relação N:N entre aluno e ficha_treino
-- ============================================================
DROP TABLE IF EXISTS `aluno_ficha`;
CREATE TABLE `aluno_ficha` (
  `id_aluno`       INT       NOT NULL,
  `id_ficha`       INT       NOT NULL,
  `data_inicio`    DATE      NOT NULL,
  `data_fim`       DATE      DEFAULT NULL,
  `ativo`          TINYINT(1) NOT NULL DEFAULT 1,
  `atribuido_em`   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aluno`, `id_ficha`),
  KEY `idx_af_ficha` (`id_ficha`),
  CONSTRAINT `fk_af_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno`        (`id_aluno`),
  CONSTRAINT `fk_af_ficha` FOREIGN KEY (`id_ficha`) REFERENCES `ficha_treino` (`id_ficha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  11. VIDEO
--  Fonte: painelprofessor.ejs, todosvideos.ejs, videosfree.ejs, editarexercicios.ejs
--  Campos identificados: titulo, descricao, duracao, categoria, nivel, thumbnail, link
-- ============================================================
DROP TABLE IF EXISTS `video`;
CREATE TABLE `video` (
  `id_video`       INT           NOT NULL AUTO_INCREMENT,
  `id_professor`   INT           NOT NULL,
  `titulo`         VARCHAR(150)  NOT NULL,
  `descricao`      TEXT          DEFAULT NULL,
  `link_video`     VARCHAR(255)  NOT NULL,             -- URL ou path do arquivo
  `thumbnail`      VARCHAR(255)  DEFAULT NULL,
  `duracao_seg`    INT           DEFAULT NULL,         -- duração em segundos
  `categoria`      VARCHAR(50)   DEFAULT NULL,         -- 'Força', 'Cardio', 'HIIT', etc.
  `nivel`          ENUM('iniciante','intermediario','avancado') DEFAULT 'iniciante',
  `exclusivo`      TINYINT(1)    NOT NULL DEFAULT 0,   -- 0=gratuito, 1=premium
  `id_plano_min`   INT           DEFAULT NULL,         -- plano mínimo para acesso (NULL=todos)
  `ativo`          TINYINT(1)    NOT NULL DEFAULT 1,
  `criado_em`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_video`),
  KEY `idx_video_professor` (`id_professor`),
  KEY `idx_video_plano`     (`id_plano_min`),
  CONSTRAINT `fk_video_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`),
  CONSTRAINT `fk_video_plano`     FOREIGN KEY (`id_plano_min`) REFERENCES `plano`     (`id_plano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  12. PROGRESSO_SEMANAL
--  Fonte: progressosemanal.ejs
--  Campos: semana, dias treinados, tempo total, calorias, bpm_max, meta_semanal
-- ============================================================
DROP TABLE IF EXISTS `progresso_semanal`;
CREATE TABLE `progresso_semanal` (
  `id_progresso`    INT            NOT NULL AUTO_INCREMENT,
  `id_aluno`        INT            NOT NULL,
  `semana_inicio`   DATE           NOT NULL,           -- segunda-feira da semana
  `dias_treinados`  INT            NOT NULL DEFAULT 0,
  `meta_dias`       INT            NOT NULL DEFAULT 5, -- meta definida pelo aluno
  `tempo_total_min` INT            NOT NULL DEFAULT 0, -- soma dos minutos da semana
  `calorias_total`  DECIMAL(8,2)   DEFAULT NULL,
  `bpm_maximo`      INT            DEFAULT NULL,
  `variacao_pct`    DECIMAL(5,2)   DEFAULT NULL,       -- % de variação vs semana anterior
  `criado_em`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_progresso`),
  UNIQUE KEY `uk_progresso_aluno_semana` (`id_aluno`, `semana_inicio`),
  CONSTRAINT `fk_progresso_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  13. SESSAO_TREINO
--  Fonte: progressosemanal.ejs (barras diárias), painelfree.ejs
--  Cada treino realizado pelo aluno em um dia específico
-- ============================================================
DROP TABLE IF EXISTS `sessao_treino`;
CREATE TABLE `sessao_treino` (
  `id_sessao`      INT            NOT NULL AUTO_INCREMENT,
  `id_aluno`       INT            NOT NULL,
  `id_ficha`       INT            DEFAULT NULL,
  `data_treino`    DATE           NOT NULL,
  `duracao_min`    INT            NOT NULL DEFAULT 0,
  `calorias`       DECIMAL(7,2)   DEFAULT NULL,
  `bpm_maximo`     INT            DEFAULT NULL,
  `bpm_medio`      INT            DEFAULT NULL,
  `observacao`     TEXT           DEFAULT NULL,
  `criado_em`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sessao`),
  KEY `idx_sessao_aluno` (`id_aluno`),
  KEY `idx_sessao_ficha` (`id_ficha`),
  KEY `idx_sessao_data`  (`data_treino`),
  CONSTRAINT `fk_sessao_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno`        (`id_aluno`),
  CONSTRAINT `fk_sessao_ficha` FOREIGN KEY (`id_ficha`) REFERENCES `ficha_treino` (`id_ficha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  14. CHAT_FEEDBACK (conversa professor ↔ aluno)
--  Fonte: feedbackaluno.ejs, feedbackprofessor.ejs, feedbackresposta.ejs
--  Um chat é criado por par professor/aluno
-- ============================================================
DROP TABLE IF EXISTS `chat_feedback`;
CREATE TABLE `chat_feedback` (
  `id_chat`       INT       NOT NULL AUTO_INCREMENT,
  `id_professor`  INT       NOT NULL,
  `id_aluno`      INT       NOT NULL,
  `criado_em`     DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_chat`),
  UNIQUE KEY `uk_chat_par` (`id_professor`, `id_aluno`),
  KEY `idx_chat_professor` (`id_professor`),
  KEY `idx_chat_aluno`     (`id_aluno`),
  CONSTRAINT `fk_chat_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`),
  CONSTRAINT `fk_chat_aluno`     FOREIGN KEY (`id_aluno`)     REFERENCES `aluno`     (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  15. MENSAGEM_FEEDBACK
--  Fonte: feedbackaluno.ejs, feedbackresposta.ejs
--  Campos: intensidade (leve/moderado/intenso/pesado/exaustivo),
--          nivel_cansaco (range 0-10), mensagem de texto
-- ============================================================
DROP TABLE IF EXISTS `mensagem_feedback`;
CREATE TABLE `mensagem_feedback` (
  `id_mensagem`    INT       NOT NULL AUTO_INCREMENT,
  `id_chat`        INT       NOT NULL,
  `remetente`      ENUM('aluno','professor') NOT NULL,
  `intensidade`    ENUM('leve','moderado','intenso','pesado','exaustivo') DEFAULT NULL, -- só aluno preenche
  `nivel_cansaco`  INT       DEFAULT NULL,             -- 0-10, só aluno preenche
  `texto`          TEXT      NOT NULL,
  `lida`           TINYINT(1) NOT NULL DEFAULT 0,
  `enviado_em`     DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mensagem`),
  KEY `idx_msg_chat`      (`id_chat`),
  KEY `idx_msg_enviado`   (`enviado_em`),
  CONSTRAINT `fk_msg_chat` FOREIGN KEY (`id_chat`) REFERENCES `chat_feedback` (`id_chat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  16. SUPORTE
--  Fonte: suporte.ejs
--  Tickets/mensagens enviados pela página de suporte
-- ============================================================
DROP TABLE IF EXISTS `suporte`;
CREATE TABLE `suporte` (
  `id_suporte`  INT           NOT NULL AUTO_INCREMENT,
  `id_aluno`    INT           DEFAULT NULL,            -- NULL se visitante não autenticado
  `nome`        VARCHAR(100)  NOT NULL,
  `email`       VARCHAR(100)  NOT NULL,
  `assunto`     VARCHAR(150)  DEFAULT NULL,
  `mensagem`    TEXT          NOT NULL,
  `status`      ENUM('aberto','em_atendimento','resolvido','fechado') NOT NULL DEFAULT 'aberto',
  `criado_em`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_suporte`),
  KEY `idx_suporte_aluno` (`id_aluno`),
  CONSTRAINT `fk_suporte_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  RE-HABILITAR CHAVES
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
--  VISÃO GERAL DO SCHEMA
-- ============================================================
/*
  TABELAS E RELAÇÕES:

  plano ──────────────────────────────────────────────────────────────────────┐
    ▲                                                                          │
    │  fk_aluno_plano                                                          │
  aluno ─────────┬────────────────────────────────────────────────────────────┤
    │ fk_assinatura_aluno                                                      │
    │             │ fk_af_aluno                                                │
    │             ├── aluno_ficha ──── ficha_treino ──── exercicio             │
    │             │                         │                                  │
    │             │                  fk_ficha_professor                        │
    │             │                         ▼                                  │
    │             │                     professor ───── video                  │
    │             │                         │                                  │
    │             │                  fk_chat_professor                         │
    │             ├── chat_feedback ─────────┘                                 │
    │             │       │                                                    │
    │             │   mensagem_feedback                                        │
    │             │                                                            │
    │             ├── assinatura ──── pagamento                                │
    │             │       │                                                    │
    │             │   desconto (streak)                                        │
    │             │                                                            │
    │             ├── streak                                                   │
    │             ├── progresso_semanal                                        │
    │             ├── sessao_treino                                            │
    │             └── suporte                                                  │
    │                                                                          │
    └──────────────────────────────────────────── fk_assinatura_plano ────────┘

  NOTAS DE SEGURANÇA:
  - As colunas senha_hash em `aluno` e `professor` devem receber hashes
    gerados com bcrypt (custo 12) ou argon2id — nunca texto simples.
  - A tabela `pagamento` NÃO armazena número completo do cartão nem CVV.
    Armazene apenas o token retornado pelo gateway (ex: Stripe, Pagar.me).
  - O campo `cpf` em `aluno` e `card_cpf` no checkout devem ser criptografados
    com AES_ENCRYPT antes de inserir se sua versão do MySQL suportar.
*/