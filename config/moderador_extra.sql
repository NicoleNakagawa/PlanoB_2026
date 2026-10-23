-- =====================================================================
-- PlanoB - tabelas do painel de moderador
-- Rode UMA vez no banco (o mesmo banco do script_bd.sql):
--   sudo mysql -u root -p railway < config/moderador_extra.sql
-- É seguro rodar de novo: usa CREATE TABLE IF NOT EXISTS.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `moderador` (
  `id_moderador` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `nivel` VARCHAR(30) DEFAULT 'padrao',
  `foto_perfil` VARCHAR(255) DEFAULT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_moderador`),
  UNIQUE KEY `uk_moderador_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Registro de tudo que o moderador faz (excluir cadastro, mudar plano,
-- ocultar vídeo, mudar status de suporte). Aparece na tela "Atividades".
-- Não tem chave estrangeira de propósito: o histórico continua existindo
-- mesmo que um moderador seja removido depois.
CREATE TABLE IF NOT EXISTS `moderacao_log` (
  `id_log` INT NOT NULL AUTO_INCREMENT,
  `id_moderador` INT DEFAULT NULL,
  `moderador_nome` VARCHAR(100) NOT NULL,
  `acao` VARCHAR(50) NOT NULL,
  `alvo_tipo` VARCHAR(30) DEFAULT NULL,
  `alvo_id` INT DEFAULT NULL,
  `detalhe` VARCHAR(255) DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_log`),
  KEY `idx_log_criado` (`criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Moderador de teste (senha: Moderador123). Descomente se ainda não tiver um
-- e TROQUE a senha antes de publicar o site.
-- INSERT IGNORE INTO moderador (nome, email, senha_hash, nivel, ativo)
-- VALUES ('Moderador Teste', 'moderador@teste.com',
--         '$2b$12$/Jm0Clo97ZZtP5QCKu/2xOxU7Hb79bwrZ8WIVgX5SUWGQ/uk3W7ai', 'admin', 1);
