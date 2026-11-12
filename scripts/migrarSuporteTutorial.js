// =====================================================================
// Migração: suporte com respostas + tutorial de primeiro acesso
//
// Rode UMA vez (pode rodar de novo sem problema, ele confere antes):
//   node scripts/migrarSuporteTutorial.js
//
// O que faz:
//   1. suporte: adiciona id_professor, tipo_usuario, resposta_nao_lida, atualizado_em
//   2. cria a tabela suporte_mensagem (conversa de cada chamado)
//   3. aluno e professor: adiciona tutorial_visto
//      (contas que já existem ficam como "já viu", só contas novas veem o tutorial)
// =====================================================================

const db = require('../app/config/pool_conexoes')

async function colunaExiste(tabela, coluna) {
    const [linhas] = await db.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tabela, coluna]
    )
    return Number(linhas[0].total) > 0
}

async function tabelaExiste(tabela) {
    const [linhas] = await db.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tabela]
    )
    return Number(linhas[0].total) > 0
}

async function adicionarColuna(tabela, coluna, definicao) {
    if (await colunaExiste(tabela, coluna)) {
        console.log(`  = ${tabela}.${coluna} já existe`)
        return false
    }

    await db.query(`ALTER TABLE \`${tabela}\` ADD COLUMN \`${coluna}\` ${definicao}`)
    console.log(`  + ${tabela}.${coluna} criada`)
    return true
}

async function migrar() {
    console.log('Migrando suporte...')

    await adicionarColuna('suporte', 'id_professor', 'INT DEFAULT NULL AFTER `id_aluno`')
    await adicionarColuna('suporte', 'tipo_usuario', "ENUM('aluno','professor') DEFAULT NULL AFTER `id_professor`")
    await adicionarColuna('suporte', 'resposta_nao_lida', 'TINYINT(1) NOT NULL DEFAULT 0')
    await adicionarColuna('suporte', 'atualizado_em', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')

    // Chamados antigos: quem tem id_aluno era aluno
    await db.query(`UPDATE suporte SET tipo_usuario = 'aluno' WHERE id_aluno IS NOT NULL AND tipo_usuario IS NULL`)

    const [fks] = await db.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'suporte' AND CONSTRAINT_NAME = 'fk_suporte_professor'`
    )

    if (Number(fks[0].total) === 0) {
        await db.query(
            `ALTER TABLE suporte
             ADD KEY idx_suporte_professor (id_professor),
             ADD CONSTRAINT fk_suporte_professor FOREIGN KEY (id_professor) REFERENCES professor (id_professor)`
        )
        console.log('  + chave estrangeira suporte -> professor criada')
    }

    if (await tabelaExiste('suporte_mensagem')) {
        console.log('  = tabela suporte_mensagem já existe')
    } else {
        await db.query(
            `CREATE TABLE suporte_mensagem (
                id_mensagem INT NOT NULL AUTO_INCREMENT,
                id_suporte INT NOT NULL,
                autor ENUM('usuario','moderador') NOT NULL,
                id_moderador INT DEFAULT NULL,
                nome_autor VARCHAR(100) NOT NULL,
                mensagem TEXT NOT NULL,
                criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_mensagem),
                KEY idx_suporte_msg_chamado (id_suporte, criado_em),
                CONSTRAINT fk_suporte_msg_chamado FOREIGN KEY (id_suporte) REFERENCES suporte (id_suporte) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        )
        console.log('  + tabela suporte_mensagem criada')
    }

    console.log('Migrando tutorial de primeiro acesso...')

    for (const tabela of ['aluno', 'professor']) {
        const criou = await adicionarColuna(tabela, 'tutorial_visto', 'TINYINT(1) NOT NULL DEFAULT 0')

        // Só na primeira vez: quem já tinha conta não precisa ver o tutorial
        if (criou) {
            await db.query(`UPDATE \`${tabela}\` SET tutorial_visto = 1`)
            console.log(`  ~ contas antigas de ${tabela} marcadas como "tutorial já visto"`)
        }
    }

    console.log('Migração concluída.')
}

migrar()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erro na migração:', err.message)
        process.exit(1)
    })
