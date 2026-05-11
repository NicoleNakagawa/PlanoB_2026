const express = require('express')
const session = require('express-session')
const path = require('path')

const app = express()
const port = 3000

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(session({
    secret: 'academia-em-casa-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}))

// Arquivos estáticos: CSS, JS, imagens etc.
app.use(express.static(path.join(__dirname, 'app', 'public')))
app.use(express.static(path.join(__dirname, 'public')))

// Configuração do EJS
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'app', 'views', 'pages'))

// Rotas
const rotas = require('./app/routes/router')
app.use('/', rotas)

// Servidor
app.listen(port, () => {
    console.log(`Servidor online \nhttp://localhost:${port}`)
})