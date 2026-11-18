// Cria as tabelas que faltam (moderador, moderacao_log) sem apagar nada.
// Seguro rodar quantas vezes quiser (usa CREATE TABLE IF NOT EXISTS).
// Uso: node scripts/garantirTabelas.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT),
        multipleStatements: true,
        connectTimeout: 30000,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    })
    const sql = fs.readFileSync(path.join(__dirname, '..', 'config', 'moderador_extra.sql'), 'utf8')
    await conn.query(sql)
    const [t] = await conn.query('SHOW TABLES')
    console.log(`OK. O banco tem ${t.length} tabelas (moderador e moderacao_log garantidas).`)
    await conn.end()
}
main().catch(e => { console.error('Erro:', e.code, e.message); process.exit(1) })
