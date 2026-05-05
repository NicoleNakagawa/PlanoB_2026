const express = require('express')
const session = require('express-session')
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
 
app.use(express.static('app/public'), express.static(__dirname + '/public'))
app.use(express.static('public'))
app.set ('view engine', 'ejs')
app.set('views', './app/views')

var rotas = require('./app/routes/router')

app.use('/', rotas)
app.listen(port, ()=>{
    console.log(`Servidor online /nHttp://localhost:${port}`)
})