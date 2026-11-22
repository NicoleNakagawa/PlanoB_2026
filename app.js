require('dotenv').config()

const express = require('express')
const session = require('express-session')
const path = require('path')

const db = require('./app/config/pool_conexoes')
const SessaoMysql = require('./app/config/sessaoMysql')
const garantirTabelas = require('./app/config/garantirTabelas')
const mensagens = require('./app/middlewares/mensagens')

const app = express()
const port = process.env.PORT || 3000

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.set('trust proxy', 1)

if (!process.env.SESSION_SECRET) {
    console.warn('[aviso] SESSION_SECRET não definido no .env. Usando um valor padrão; defina um segredo próprio em produção.')
}

// Sessões ficam no MySQL: o login sobrevive quando o servidor reinicia ou "dorme".
app.use(session({
    store: new SessaoMysql(db),
    secret: process.env.SESSION_SECRET || 'academia-em-casa-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        // 'auto' = cookie seguro quando a conexão é HTTPS (Render, Railway), normal no localhost
        secure: 'auto',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}))

app.use(express.static(path.join(__dirname, 'app', 'public')))

// Navegadores pedem /favicon.ico sozinhos; servimos o mesmo ícone do site.
app.get('/favicon.ico', (req, res) => {
    res.type('image/svg+xml').sendFile(path.join(__dirname, 'app', 'public', 'favicon.svg'))
})

// Mensagens de sucesso/erro saem da URL e aparecem uma única vez
app.use(mensagens)

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'app', 'views', 'pages'))

// Variáveis globais para todas as páginas EJS.
// Isso evita erro interno quando algum EJS usa erro, sucesso, aluno ou professor.
app.use((req, res, next) => {
    res.locals.erro = null
    res.locals.sucesso = null
    res.locals.aluno = req.session.aluno || null
    res.locals.professor = req.session.professor || null
    res.locals.moderador = req.session.moderador || null
    res.locals.anoAtual = new Date().getFullYear()

    // Número do WhatsApp do suporte (só dígitos, com DDI). Ex.: 5511912345678
    // Se não estiver no .env, o botão de WhatsApp some do site.
    res.locals.whatsappSuporte = String(process.env.WHATSAPP_SUPORTE || '').replace(/\D/g, '')
    next()
})

const rotas = require('./app/routes/router')
app.use('/', rotas)

// Middleware global de erro
app.use((err, req, res, next) => {
    console.error('[ERRO GLOBAL]', err)

    res.status(500).send(`
        <style>
            body {
                font-family: sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: #f7f5ff;
                color: #232c51;
                gap: 16px;
                margin: 0;
                text-align: center;
            }

            h1 {
                font-size: 4rem;
                margin: 0;
            }

            p {
                margin: 0;
                font-size: 1.1rem;
            }

            a {
                background: #0058ba;
                color: #fff;
                padding: 12px 28px;
                border-radius: 999px;
                font-weight: 700;
                text-decoration: none;
            }
        </style>

        <h1>500</h1>
        <p>Erro interno do servidor.</p>
        <a href="/home">Voltar para Home</a>
    `)
})

garantirTabelas()

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`)
})