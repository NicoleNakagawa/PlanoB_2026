// Importa config/script_bd.sql (e moderador_extra.sql, se existir) no banco do .env
// Uso:  node scripts/importarBanco.js           -> so importa se o banco estiver vazio
//       node scripts/importarBanco.js --forcar  -> importa mesmo com tabelas (APAGA os dados!)
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function main() {
    const forcar = process.argv.includes('--forcar')
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
    console.log(`Conectado em ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)

    const [tabelas] = await conn.query('SHOW TABLES')
    if (tabelas.length > 0 && !forcar) {
        console.log(`O banco ja tem ${tabelas.length} tabela(s). Nada foi alterado.`)
        console.log('Para recriar tudo (APAGA os dados): node scripts/importarBanco.js --forcar')
        await conn.end()
        return
    }

    for (const arq of ['script_bd.sql', 'moderador_extra.sql']) {
        const caminho = path.join(__dirname, '..', 'config', arq)
        if (!fs.existsSync(caminho)) continue
        console.log(`Importando ${arq}...`)
        await conn.query(fs.readFileSync(caminho, 'utf8'))
    }

    const [depois] = await conn.query('SHOW TABLES')
    console.log(`Pronto! ${depois.length} tabelas no banco.`)
    await conn.end()
}

main().catch(err => {
    console.error('Erro:', err.code, err.message)
    process.exit(1)
})
