// Diagnostico rapido: mostra para onde o app conecta e o que existe no banco.
// Uso: node scripts/testarBanco.js
require('dotenv').config()
const mysql = require('mysql2/promise')

async function main() {
    console.log(`Conectando em ${process.env.DB_HOST}:${process.env.DB_PORT} / ${process.env.DB_NAME} (SSL=${process.env.DB_SSL})`)
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT),
        connectTimeout: 30000,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    })
    console.log('1) Conexao: OK')

    const [rows] = await conn.query('SHOW TABLES')
    const tabelas = rows.map(r => Object.values(r)[0])
    console.log(`2) Tabelas (${tabelas.length}): ${tabelas.join(', ')}`)

    for (const t of ['aluno', 'professor', 'moderador', 'suporte_mensagem']) {
        if (!tabelas.includes(t)) { console.log(`   FALTA a tabela "${t}"`); continue }
        const [[c]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``)
        console.log(`   ${t}: ${c.n} registro(s)`)
    }
    await conn.end()
}
main().catch(e => { console.error('1) Conexao: FALHOU ->', e.code, e.message); process.exit(1) })
