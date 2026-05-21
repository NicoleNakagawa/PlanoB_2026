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

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`)
})