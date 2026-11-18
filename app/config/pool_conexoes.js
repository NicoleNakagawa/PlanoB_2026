require('dotenv').config()

const mysql = require('mysql2')

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,

    // Defina DB_SSL=true no .env se o Railway exigir SSL
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
})

pool.getConnection((err, conn) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:')
        console.error('Código:', err.code)
        console.error('Mensagem:', err.message)
        return
    }

    console.log(`Conectado ao banco MySQL: ${process.env.DB_NAME}`)
    conn.release()
})

module.exports = pool.promise()