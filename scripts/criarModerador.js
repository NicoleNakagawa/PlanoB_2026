const bcrypt = require('bcrypt')
const db = require('../app/config/pool_conexoes')

const SALT_ROUNDS = 12

async function criarModerador() {
    const nome = 'Admin PlanoB'
    const email = 'planob@gmail.com'
    const senha = 'PlanoB@2026'
    const nivel = 'master'

    try {
        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS)

        const [existe] = await db.query(
            `SELECT id_moderador
             FROM moderador
             WHERE email = ?
             LIMIT 1`,
            [email]
        )

        if (existe.length > 0) {
            await db.query(
                `UPDATE moderador
                 SET nome = ?,
                     senha_hash = ?,
                     nivel = ?,
                     ativo = 1
                 WHERE email = ?`,
                [nome, senhaHash, nivel, email]
            )

            console.log('Moderador atualizado com sucesso!')
        } else {
            await db.query(
                `INSERT INTO moderador
                 (nome, email, senha_hash, nivel, ativo)
                 VALUES (?, ?, ?, ?, 1)`,
                [nome, email, senhaHash, nivel]
            )

            console.log('Moderador criado com sucesso!')
        }

        console.log('E-mail:', email)
        console.log('Senha:', senha)
    } catch (err) {
        console.error('Erro ao criar moderador:', err.message)
    } finally {
        process.exit()
    }
}

criarModerador()