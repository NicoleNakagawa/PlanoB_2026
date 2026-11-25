// Cria, se ainda não existirem, as tabelas que o sistema usa além do script_bd.sql.
// Roda sozinho ao iniciar o servidor, então não precisa de migração manual.

const db = require('./pool_conexoes')

// MySQL não aceita "ADD COLUMN IF NOT EXISTS", então conferimos antes no information_schema.
async function garantirColuna(tabela, coluna, definicao) {
    try {
        const [rows] = await db.query(
            `SELECT COUNT(*) AS total
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [tabela, coluna]
        )

        if (Number(rows[0].total) === 0) {
            await db.query(`ALTER TABLE \`${tabela}\` ADD COLUMN \`${coluna}\` ${definicao}`)
        }
    } catch (err) {
        console.error(`[tabelas] não foi possível adicionar ${tabela}.${coluna}:`, err.message)
    }
}

async function garantirTabelas() {
    // Treino personalizado: recomendação do professor e detalhes de cada exercício
    await garantirColuna('ficha_treino', 'recomendacao', 'TEXT DEFAULT NULL')
    await garantirColuna('ficha_treino', 'treino_atualizado_em', 'DATETIME DEFAULT NULL')
    await garantirColuna('exercicio', 'dia_treino', "CHAR(1) NOT NULL DEFAULT 'A'")
    await garantirColuna('exercicio', 'descanso_seg', 'INT DEFAULT NULL')
    await garantirColuna('exercicio', 'observacao', 'VARCHAR(255) DEFAULT NULL')
    await garantirColuna('exercicio', 'id_video', 'INT DEFAULT NULL')

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

    await garantirTabelasTreinoAluno()
}

async function garantirTabelasTreinoAluno() {
    // Notificações do aluno (sino): ex. "seu professor montou um treino para você"
    try {
        await db.query(
            `CREATE TABLE IF NOT EXISTS notificacao_aluno (
                id_notificacao INT NOT NULL AUTO_INCREMENT,
                id_aluno INT NOT NULL,
                tipo VARCHAR(30) NOT NULL DEFAULT 'treino',
                id_ficha INT DEFAULT NULL,
                titulo VARCHAR(120) NOT NULL,
                mensagem VARCHAR(255) DEFAULT NULL,
                link VARCHAR(255) DEFAULT NULL,
                lida TINYINT(1) NOT NULL DEFAULT 0,
                criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_notificacao),
                KEY idx_notificacao_aluno (id_aluno, lida, criada_em)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        )
    } catch (err) {
        console.error('[tabelas] não foi possível criar notificacao_aluno:', err.message)
    }

    // Exercícios do treino do professor que o aluno já concluiu (um registro por exercício por dia)
    try {
        await db.query(
            `CREATE TABLE IF NOT EXISTS exercicio_concluido (
                id_aluno INT NOT NULL,
                id_exercicio INT NOT NULL,
                id_ficha INT NOT NULL,
                dia_treino CHAR(1) NOT NULL DEFAULT 'A',
                data_conclusao DATE NOT NULL,
                concluido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_aluno, id_exercicio, data_conclusao),
                KEY idx_exconcl_ficha (id_aluno, id_ficha, data_conclusao)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        )
    } catch (err) {
        console.error('[tabelas] não foi possível criar exercicio_concluido:', err.message)
    }
}

module.exports = garantirTabelas
