const express = require('express')

const router = express.Router()

const { uploadVideo } = require('../config/uploads')
const naoEncontrado = require('../utils/naoEncontrado')

// =======================
// MIDDLEWARES
// =======================
// authAluno, authProfessor, authModerador e exigirAdmin agora vivem em
// app/middlewares/auth.js

const { authAluno, authProfessor, authModerador, exigirAdmin } = require('../middlewares/auth')

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
    res.render('planos', { erro: req.query.erro || null })
})

router.get('/cadastroaluno', (req, res) => {
    res.render('cadastroaluno')
})

router.get('/cadastroprofessor', (req, res) => {
    res.render('cadastroprofessor')
})

// Páginas legais (linkadas no login, nos cadastros, no checkout e no rodapé)
router.get('/termos', (req, res) => {
    res.render('legal', { documento: 'termos' })
})

router.get('/privacidade', (req, res) => {
    res.render('legal', { documento: 'privacidade' })
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

// Recuperação de senha (aluno, professor e moderador)
const senhaController = require('../controllers/senhaController')

router.get('/esqueci-senha', senhaController.exibirEsqueci)
router.post('/esqueci-senha', senhaController.enviarEsqueci)
router.get('/redefinir-senha', senhaController.exibirRedefinir)
router.post('/redefinir-senha', senhaController.processarRedefinir)

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
router.post('/perfilaluno/cancelar-plano', authAluno, alunoController.cancelarPlano)
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

// Suporte: a página é pública, mas abrir chamado e ver respostas exige login (aluno ou professor)
router.get('/suporte', suporteController.exibir)
router.post('/suporte', suporteController.enviar)
router.get('/suporte/chamados', suporteController.meusChamados)
router.post('/suporte/chamados/:id/responder', suporteController.responder)

// Tutorial de primeiro acesso (aluno e professor)
const tutorialController = require('../controllers/tutorialController')

router.post('/api/tutorial/concluir', tutorialController.concluir)
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
const moderadorUsuariosController = require('../controllers/moderadorUsuariosController')
const moderadorFinanceiroController = require('../controllers/moderadorFinanceiroController')
const moderadorConteudoController = require('../controllers/moderadorConteudoController')

router.get('/loginmoderador', moderadorController.loginForm)
router.post('/loginmoderador', moderadorController.login)

// Visão geral
router.get('/moderador', authModerador, moderadorController.painel)
router.get('/moderador/exportar', authModerador, moderadorController.exportar)

// Alunos e professores (excluir e mudar plano exigem moderador admin)
router.get('/moderador/alunos', authModerador, moderadorUsuariosController.alunos)
router.get('/moderador/alunos/:id', authModerador, moderadorUsuariosController.perfilAluno)
router.post('/moderador/alunos/:id/plano', authModerador, exigirAdmin, moderadorUsuariosController.alterarPlano)
router.get('/moderador/professores', authModerador, moderadorUsuariosController.professores)
router.get('/moderador/professores/:id', authModerador, moderadorUsuariosController.perfilProfessor)
router.post('/moderador/excluir/:tipo/:id', authModerador, exigirAdmin, moderadorController.excluir)

// Financeiro
router.get('/moderador/financeiro', authModerador, moderadorFinanceiroController.financeiro)
router.get('/moderador/financeiro/exportar', authModerador, moderadorFinanceiroController.exportar)

// Vídeos, suporte e atividades
router.get('/moderador/videos', authModerador, moderadorConteudoController.videos)
router.post('/moderador/videos/:id/status', authModerador, moderadorConteudoController.alterarStatusVideo)
router.post('/moderador/videos/:id/excluir', authModerador, moderadorConteudoController.excluirVideo)
router.get('/moderador/suporte', authModerador, moderadorConteudoController.suporte)
router.get('/moderador/suporte/:id', authModerador, moderadorConteudoController.chamado)
router.post('/moderador/suporte/:id/responder', authModerador, moderadorConteudoController.responderChamado)
router.post('/moderador/suporte/:id/status', authModerador, moderadorConteudoController.alterarStatusSuporte)
router.get('/moderador/atividades', authModerador, moderadorConteudoController.atividades)

// =======================
// 404
// =======================

router.use((req, res) => {
    naoEncontrado(req, res)
})

module.exports = router

