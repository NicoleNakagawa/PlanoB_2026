require('dotenv').config()

const mysql = require('mysql2')

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'planob',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

pool.getConnection((err, conn) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err.message)
        return
    }

    console.log('Conectado ao banco MySQL!')
    conn.release()
})

module.exports = pool.promise()