// Cria, se ainda não existirem, as tabelas que o sistema usa além do script_bd.sql.
// Roda sozinho ao iniciar o servidor, então não precisa de migração manual.

const db = require('./pool_conexoes')

async function garantirTabelas() {
    try {
        await db.query(
            `CREATE TABLE IF NOT EXISTS redefinicao_senha (
                id_redefinicao INT NOT NULL AUTO_INCREMENT,
                tipo_usuario ENUM('aluno','professor','moderador') NOT NULL,
                id_usuario INT NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expira_em DATETIME NOT NULL,
                usado_em DATETIME DEFAULT NULL,
                criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_redefinicao),
                UNIQUE KEY uk_redefinicao_token (token_hash),
                KEY idx_redefinicao_usuario (tipo_usuario, id_usuario)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        )
    } catch (err) {
        console.error('[tabelas] não foi possível criar redefinicao_senha:', err.message)
    }
}

module.exports = garantirTabelas
