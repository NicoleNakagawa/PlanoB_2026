const { ehAdmin } = require('../utils/moderacao')

// =======================
// MIDDLEWARES DE AUTENTICAÇÃO
// =======================
// Extraído do router.js. Cada função só deixa a requisição passar
// se existir a sessão correspondente; senão, redireciona para o login.

function authAluno(req, res, next) {
    if (req.session && req.session.aluno) return next()
    res.redirect('/login')
}

function authProfessor(req, res, next) {
    if (req.session && req.session.professor) return next()
    res.redirect('/login')
}

function authModerador(req, res, next) {
    if (req.session && req.session.moderador) return next()
    res.redirect('/loginmoderador')
}

// Ações que alteram ou apagam dados (excluir cadastro, mudar plano) só para moderador admin.
// A verificação fica aqui, no servidor, e não só escondendo o botão na tela.
function exigirAdmin(req, res, next) {
    if (ehAdmin(req.session.moderador)) return next()

    res.redirect('/moderador?erro=' + encodeURIComponent('Seu nível de moderador não permite essa ação.'))
}

module.exports = {
    authAluno,
    authProfessor,
    authModerador,
    exigirAdmin
}
