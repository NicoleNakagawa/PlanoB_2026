const express = require('express')

const router = express.Router()

const { uploadVideo } = require('../config/uploads')

// =======================
// MIDDLEWARES
// =======================
// authAluno, authProfessor e authModerador agora vivem em
// app/middlewares/auth.js

const { authAluno, authProfessor, authModerador } = require('../middlewares/auth')

// =======================
// PÁGINAS PÚBLICAS
// =======================

router.get('/', (req, res) => {
    res.render('home')
})

router.get('/home', (req, res) => {
    res.render('home')
})

router.get('/planos', (req, res) => {
    res.render('planos')
})

router.get('/suporte', (req, res) => {
    res.render('suporte')
})

router.get('/cadastroaluno', (req, res) => {
    res.render('cadastroaluno')
})

router.get('/cadastroprofessor', (req, res) => {
    res.render('cadastroprofessor')
})

// =======================
// LOGIN ÚNICO
// =======================

const authController = require('../controllers/authController')

router.get('/login', authController.exibirLogin)
router.get('/loginaluno', authController.redirecionarParaLogin)
router.get('/loginprofessor', authController.redirecionarParaLogin)
router.get('/loginmoderador', authController.redirecionarParaLogin)

router.post('/login', authController.login)
router.post('/loginaluno', authController.redirecionarParaLoginPost)
router.post('/loginprofessor', authController.redirecionarParaLoginPost)

// =======================
// ALUNO
// =======================

const alunoController = require('../controllers/alunoController')

router.get('/painelfree', authAluno, alunoController.painelFree)
router.get('/painellazuli', authAluno, alunoController.painelLazuli)
router.get('/paineldiamante', authAluno, alunoController.painelDiamante)
router.get('/dadosaluno', authAluno, alunoController.dadosAlunoForm)
router.post('/dadosaluno', authAluno, alunoController.dadosAlunoSalvar)
router.get('/perfilaluno', authAluno, alunoController.perfilAluno)

// =======================
// ALUNO - PERFIL, VÍDEOS E PROGRESSO
// =======================

router.post('/perfilaluno/dados', authAluno, alunoController.atualizarDados)
router.post('/perfilaluno/foto', authAluno, alunoController.atualizarFoto)
router.get('/perfilprofparaaluno', authAluno, alunoController.perfilProfParaAluno)
router.get('/videosfree', authAluno, alunoController.videosFreePagina)
router.get('/videos', authAluno, alunoController.videosPagina)
router.get('/execucaoexercicios', authAluno, alunoController.execucaoExercicios)
router.get('/progressosemanal', authAluno, alunoController.progressoSemanal)
router.get('/streakprogress', authAluno, alunoController.streakProgress)

// =======================
// PROFESSOR
// =======================

const professorController = require('../controllers/professorController')

router.get('/painelprofessor', authProfessor, professorController.painel)
router.get('/todosalunos', authProfessor, professorController.todosAlunos)
router.post('/professor/vincular-aluno', authProfessor, professorController.vincularAluno)
router.post('/professor/vincular-alunos-disponiveis', authProfessor, professorController.vincularAlunosDisponiveis)
router.post('/professor/desvincular-aluno', authProfessor, professorController.desvincularAluno)

// =======================
// VÍDEOS DO PROFESSOR
// =======================

const professorVideoController = require('../controllers/professorVideoController')

router.get('/todosvideos', authProfessor, professorVideoController.todosVideos)
router.post('/professor/videos/criar', authProfessor, uploadVideo.single('arquivo_video'), professorVideoController.criar)
router.get('/editarvideos/:id', authProfessor, professorVideoController.editarForm)
router.post('/editarvideos/:id', authProfessor, professorVideoController.editarSalvar)
router.post('/professor/videos/:id/excluir', authProfessor, professorVideoController.excluir)
router.get('/editarexercicios', authProfessor, professorVideoController.editarExercicios)

// =======================
// FEEDBACK PROFESSOR
// =======================

const professorFeedbackController = require('../controllers/professorFeedbackController')

router.get('/feedbackprofessor', authProfessor, professorFeedbackController.exibir)
router.post('/feedbackresposta', authProfessor, professorFeedbackController.responder)

// =======================
// CADASTRO ALUNO / CADASTRO PROFESSOR / LOGOUT
// =======================

router.post('/cadastroaluno', authController.cadastrarAluno)
router.post('/cadastroprofessor', authController.cadastrarProfessor)
router.post('/logout', authController.logout)
router.get('/logout', authController.logout)

// =======================
// PAGAMENTO
// =======================

const pagamentoController = require('../controllers/pagamentoController')

router.get('/pagamento', authAluno, pagamentoController.exibir)
router.post('/pagamento', authAluno, pagamentoController.processar)

// =======================
// SUPORTE / REGISTRAR TREINO
// =======================

const suporteController = require('../controllers/suporteController')
const treinoController = require('../controllers/treinoController')

router.post('/suporte', suporteController.enviar)
router.post('/api/aluno/registrar-treino', authAluno, treinoController.registrar)

// =======================
// APIs JSON - ALUNO / PROFESSOR
// =======================

const alunoApiController = require('../controllers/alunoApiController')
const professorApiController = require('../controllers/professorApiController')

router.get('/api/aluno/progresso', authAluno, alunoApiController.progresso)
router.get('/api/aluno/streak', authAluno, alunoApiController.streak)

router.get('/api/professor/alunos', authProfessor, professorApiController.alunos)
router.get('/api/professor/videos', authProfessor, professorApiController.videos)
router.get('/api/professor/feedbacks', authProfessor, professorApiController.feedbacks)

// =======================
// PERFIL DO PROFESSOR
// =======================

const professorPerfilController = require('../controllers/professorPerfilController')

router.get('/perfilprofessor', authProfessor, professorPerfilController.exibir)
router.post('/perfilprofessor/dados', authProfessor, professorPerfilController.atualizarDados)
router.post('/perfilprofessor/foto', authProfessor, professorPerfilController.atualizarFoto)

// =======================
// VISÃO DO PERFIL DO ALUNO PARA O PROFESSOR
// =======================

const professorVisaoAlunoController = require('../controllers/professorVisaoAlunoController')

router.get(['/visaoperfilaluno', '/visaoperfilaluno/:id'], authProfessor, professorVisaoAlunoController.exibir)

// =======================
// FEEDBACK ALUNO COM CHAT COMPLETO
// =======================

const alunoFeedbackController = require('../controllers/alunoFeedbackController')

router.get('/feedbackaluno', authAluno, alunoFeedbackController.exibir)
router.post('/feedbackaluno', authAluno, alunoFeedbackController.enviar)
router.post('/feedbackaluno/responder', authAluno, alunoFeedbackController.responder)

// =======================
// MODERADOR
// =======================

const moderadorController = require('../controllers/moderadorController')

router.get('/loginmoderador', moderadorController.loginForm)
router.post('/loginmoderador', moderadorController.login)
router.get('/moderador', authModerador, moderadorController.painel)
router.post('/moderador/excluir/:tipo/:id', authModerador, moderadorController.excluir)
router.get('/moderador/exportar', authModerador, moderadorController.exportar)

// =======================
// 404
// =======================

router.use((req, res) => {
    res.status(404).send(`
        <style>
            body {
                font-family: sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background: #f7f5ff;
                color: #232c51;
                gap: 16px;
            }

            h1 {
                font-size: 4rem;
                margin: 0;
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

        <h1>404</h1>
        <p>A página <strong>${req.originalUrl}</strong> não existe.</p>
        <a href="/home">Voltar para Home</a>
    `)
})

module.exports = router

