const express = require('express')
const router = express.Router()

// =======================
// ROTAS EJS
// =======================

router.get('/', (req, res) => {
    res.render('home')
})

router.get('/home', (req, res) => {
    res.render('home')
})

router.get('/cadastroaluno', (req, res) => {
    res.render('cadastroaluno')
})

router.get('/cadastroprofessor', (req, res) => {
    res.render('cadastroprofessor')
})

router.get('/editarexercicios', (req, res) => {
    res.render('editarexercicios')
})

router.get('/feedbackaluno', (req, res) => {
    res.render('feedbackaluno')
})

router.get('/feedbackprofessor', (req, res) => {
    res.render('feedbackprofessor')
})

router.get('/feedbackresposta', (req, res) => {
    res.render('feedbackresposta')
})

router.get('/loginaluno', (req, res) => {
    res.render('loginaluno')
})

router.get('/loginprofessor', (req, res) => {
    res.render('loginprofessor')
})

router.get('/pagamento', (req, res) => {
    res.render('pagamento')
})

router.get('/painelfree', (req, res) => {
    res.render('painelfree')
})

router.get('/painelprofessor', (req, res) => {
    res.render('painelprofessor')
})

router.get('/planos', (req, res) => {
    res.render('planos')
})

router.get('/progressoremanal', (req, res) => {
    res.render('progressoremanal')
})

router.get('/streakprogress', (req, res) => {
    res.render('streakprogress')
})

router.get('/suporte', (req, res) => {
    res.render('suporte')
})

router.get('/todosalunos', (req, res) => {
    res.render('todosalunos')
})

router.get('/videos', (req, res) => {
    res.render('videos')
})

router.get('/videosfree', (req, res) => {
    res.render('videosfree')
})

// =======================
// ROTAS POST SIMPLES
// =======================

router.post('/loginaluno', (req, res) => {
    console.log('Login aluno:', req.body)
    res.redirect('/painelfree')
})

router.post('/loginprofessor', (req, res) => {
    console.log('Login professor:', req.body)
    res.redirect('/painelprofessor')
})

router.post('/cadastroaluno', (req, res) => {
    console.log('Cadastro aluno:', req.body)
    res.redirect('/loginaluno')
})

router.post('/cadastroprofessor', (req, res) => {
    console.log('Cadastro professor:', req.body)
    res.redirect('/loginprofessor')
})

// =======================
// ROTA 404
// =======================

router.use((req, res) => {
    res.status(404).send(`
        <h1>Página não encontrada</h1>
        <p>A rota <strong>${req.originalUrl}</strong> não existe.</p>
        <a href="/home">Voltar para home</a>
    `)
})

module.exports = router