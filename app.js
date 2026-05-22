require('dotenv').config()

const express = require('express')
const session = require('express-session')
const path = require('path')

const app = express()
const port = process.env.PORT || 3000

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(session({
    secret: process.env.SESSION_SECRET || 'academia-em-casa-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}))

app.use(express.static(path.join(__dirname, 'app', 'public')))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'app', 'views', 'pages'))

const rotas = require('./app/routes/router')
app.use('/', rotas)

// Middleware global de erro (obrigatório no Express 5)
app.use((err, req, res, next) => {
    console.error('[ERRO GLOBAL]', err)
    res.status(500).send(`
        <style>
            body { font-family: sans-serif; display: flex; flex-direction: column;
                   align-items: center; justify-content: center; height: 100vh;
                   background: #f7f5ff; color: #232c51; gap: 16px; }
            h1 { font-size: 4rem; margin: 0; }
            a { background: #0058ba; color: #fff; padding: 12px 28px;
                border-radius: 999px; font-weight: 700; text-decoration: none; }
        </style>
        <h1>500</h1>
        <p>Erro interno do servidor.</p>
        <a href="/home">Voltar para Home</a>
    `)
})

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`)
})
