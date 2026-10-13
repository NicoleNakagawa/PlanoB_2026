const bcrypt = require('bcrypt')
const db = require('../config/pool_conexoes')
const { redirecionarPainelAluno } = require('../utils/redirecionamentos')

const SALT_ROUNDS = 12

// =======================
// LOGIN ÚNICO (aluno, professor e moderador)
// =======================

exports.exibirLogin = (req, res) => {
    res.render('login', {
        sucesso: req.query.sucesso ? 'Cadastro realizado! Agora faça login.' : null
    })
}

// /loginaluno, /loginprofessor e /loginmoderador (GET) apontam para o login único
exports.redirecionarParaLogin = (req, res) => {
    res.redirect('/login')
}

// /loginaluno e /loginprofessor (POST) repassam o envio para o login único
exports.redirecionarParaLoginPost = (req, res) => {
    res.redirect(307, '/login')
}

exports.login = async (req, res) => {
    const { email, password, remember } = req.body

    if (!email || !password) {
        return res.render('login', {
            erro: 'Informe e-mail e senha.'
        })
    }

    const emailLimpo = email.trim().toLowerCase()

    try {
        // TENTA LOGIN COMO ALUNO
        const [alunoRows] = await db.query(
            `SELECT 
                id_aluno,
                nome,
                email,
                senha_hash,
                id_plano,
                foto_perfil,
                dados_completos
             FROM aluno
             WHERE email = ?
             LIMIT 1`,
            [emailLimpo]
        )

        if (alunoRows.length > 0) {
            const aluno = alunoRows[0]
            const senhaCorreta = await bcrypt.compare(password, aluno.senha_hash)

            if (!senhaCorreta) {
                return res.render('login', {
                    erro: 'E-mail ou senha inválidos.'
                })
            }

            if (remember) {
                req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000
            }

            req.session.aluno = {
                id: aluno.id_aluno,
                nome: aluno.nome,
                email: aluno.email,
                id_plano: aluno.id_plano,
                foto: aluno.foto_perfil,
                dados_completos: aluno.dados_completos
            }

            if (!aluno.dados_completos) {
                return res.redirect('/dadosaluno')
            }

            return res.redirect(redirecionarPainelAluno(aluno.id_plano))
        }

        // TENTA LOGIN COMO PROFESSOR
        const [professorRows] = await db.query(
            `SELECT 
                id_professor,
                nome,
                email,
                senha_hash,
                cref,
                foto_perfil
             FROM professor
             WHERE email = ?
             LIMIT 1`,
            [emailLimpo]
        )

        if (professorRows.length > 0) {
            const professor = professorRows[0]
            const senhaCorreta = await bcrypt.compare(password, professor.senha_hash)

            if (!senhaCorreta) {
                return res.render('login', {
                    erro: 'E-mail ou senha inválidos.'
                })
            }

            if (remember) {
                req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000
            }

            req.session.professor = {
                id: professor.id_professor,
                nome: professor.nome,
                email: professor.email,
                cref: professor.cref,
                foto: professor.foto_perfil
            }

            return res.redirect('/painelprofessor')
        }

        // TENTA LOGIN COMO MODERADOR
        const [moderadorRows] = await db.query(
            `SELECT 
                id_moderador,
                nome,
                email,
                senha_hash,
                nivel,
                foto_perfil,
                ativo
             FROM moderador
             WHERE email = ?
             LIMIT 1`,
            [emailLimpo]
        )

        if (moderadorRows.length > 0) {
            const moderador = moderadorRows[0]

            if (Number(moderador.ativo) !== 1) {
                return res.render('login', {
                    erro: 'Este moderador está desativado.'
                })
            }

            const senhaCorreta = await bcrypt.compare(password, moderador.senha_hash)

            if (!senhaCorreta) {
                return res.render('login', {
                    erro: 'E-mail ou senha inválidos.'
                })
            }

            if (remember) {
                req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000
            }

            req.session.moderador = {
                id: moderador.id_moderador,
                nome: moderador.nome,
                email: moderador.email,
                nivel: moderador.nivel,
                foto: moderador.foto_perfil
            }

            return res.redirect('/moderador')
        }

        return res.render('login', {
            erro: 'E-mail ou senha inválidos.'
        })
    } catch (err) {
        console.error('[login único]', err)

        return res.render('login', {
            erro: 'Erro interno. Tente novamente.'
        })
    }
}

// =======================
// CADASTRO ALUNO
// =======================

exports.cadastrarAluno = async (req, res) => {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
        return res.render('cadastroaluno', {
            erro: 'Preencha nome, e-mail e senha.'
        })
    }

    const nomeLimpo = name.trim()
    const emailLimpo = email.trim().toLowerCase()

    try {
        const [rows] = await db.query(
            'SELECT id_aluno FROM aluno WHERE email = ?',
            [emailLimpo]
        )

        if (rows.length > 0) {
            return res.render('cadastroaluno', {
                erro: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.'
            })
        }

        const senhaHash = await bcrypt.hash(password, SALT_ROUNDS)

        const [result] = await db.query(
            `INSERT INTO aluno (nome, email, senha_hash, id_plano)
             VALUES (?, ?, ?, 1)`,
            [nomeLimpo, emailLimpo, senhaHash]
        )

        const idAluno = result.insertId

        await db.query(
            `INSERT INTO streak (id_aluno, streak_atual, streak_maximo)
             VALUES (?, 0, 0)`,
            [idAluno]
        )

        req.session.aluno = {
            id: idAluno,
            nome: nomeLimpo,
            email: emailLimpo,
            id_plano: 1,
            foto: null,
            dados_completos: 0
        }

        res.redirect('/dadosaluno')
    } catch (err) {
        console.error('[cadastroaluno]', err)

        res.render('cadastroaluno', {
            erro: 'Erro interno. Tente novamente.'
        })
    }
}

// =======================
// CADASTRO PROFESSOR
// =======================

exports.cadastrarProfessor = async (req, res) => {
    const { name, email, cref, password } = req.body

    if (!name || !email || !cref || !password) {
        return res.render('cadastroprofessor', {
            erro: 'Preencha nome, e-mail, CREF e senha.'
        })
    }

    const nomeLimpo = name.trim()
    const emailLimpo = email.trim().toLowerCase()
    const crefLimpo = cref.trim().toUpperCase()

    const regexCREF = /^[0-9]{4,6}-[A-Z]\/[A-Z]{2}$/

    if (!regexCREF.test(crefLimpo)) {
        return res.render('cadastroprofessor', {
            erro: 'CREF inválido. Use o formato 123456-G/SP.'
        })
    }

    try {
        const [emailRows] = await db.query(
            'SELECT id_professor FROM professor WHERE email = ?',
            [emailLimpo]
        )

        if (emailRows.length > 0) {
            return res.render('cadastroprofessor', {
                erro: 'Este e-mail já está cadastrado.'
            })
        }

        const [crefRows] = await db.query(
            'SELECT id_professor FROM professor WHERE cref = ?',
            [crefLimpo]
        )

        if (crefRows.length > 0) {
            return res.render('cadastroprofessor', {
                erro: 'Este CREF já está cadastrado.'
            })
        }

        const senhaHash = await bcrypt.hash(password, SALT_ROUNDS)

        const [result] = await db.query(
            `INSERT INTO professor (nome, email, senha_hash, cref)
             VALUES (?, ?, ?, ?)`,
            [nomeLimpo, emailLimpo, senhaHash, crefLimpo]
        )

        const idProfessor = result.insertId

        req.session.professor = {
            id: idProfessor,
            nome: nomeLimpo,
            email: emailLimpo,
            cref: crefLimpo,
            foto: null
        }

        res.redirect('/painelprofessor')
    } catch (err) {
        console.error('[cadastroprofessor]', err)

        res.render('cadastroprofessor', {
            erro: 'Erro interno. Tente novamente.'
        })
    }
}

// =======================
// LOGOUT
// =======================
// Mesmo comportamento para GET e POST, por isso uma função só
// atende as duas rotas no router.js.

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/home')
    })
}
