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

module.exports = {
    authAluno,
    authProfessor,
    authModerador
}
