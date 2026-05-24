const express = require('express')
const bcrypt = require('bcrypt')
const router = express.Router()
const db = require('../config/pool_conexoes')

const SALT_ROUNDS = 12

function authAluno(req, res, next) {
    if (req.session && req.session.aluno) return next()
    res.redirect('/loginaluno')
}

function authProfessor(req, res, next) {
    if (req.session && req.session.professor) return next()
    res.redirect('/loginprofessor')
}

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

router.get('/loginaluno', (req, res) => {
    res.render('loginaluno', {
        sucesso: req.query.sucesso ? 'Cadastro realizado! Agora faça login.' : null
    })
})

router.get('/loginprofessor', (req, res) => {
    res.render('loginprofessor', {
        sucesso: req.query.sucesso ? 'Cadastro realizado! Agora faça login.' : null
    })
})

// =======================
// PÁGINAS PROTEGIDAS - ALUNO
// =======================

router.get('/painelfree', authAluno, (req, res) => {
    res.render('painelfree', { aluno: req.session.aluno })
})

router.get('/videosfree', authAluno, (req, res) => {
    res.render('videosfree', { aluno: req.session.aluno })
})

router.get('/videos', authAluno, (req, res) => {
    res.render('videos', { aluno: req.session.aluno })
})

router.get('/progressosemanal', authAluno, (req, res) => {
    res.render('progressosemanal', { aluno: req.session.aluno })
})

router.get('/streakprogress', authAluno, (req, res) => {
    res.render('streakprogress', { aluno: req.session.aluno })
})

router.get('/feedbackaluno', authAluno, (req, res) => {
    res.render('feedbackaluno', { aluno: req.session.aluno })
})

router.get('/pagamento', authAluno, async (req, res) => {
    const idPlano = Number(req.query.plano) || 2

    try {
        const [rows] = await db.query(
            'SELECT id_plano, nome, valor_mensal, descricao FROM plano WHERE id_plano = ?',
            [idPlano]
        )

        res.render('pagamento', {
            aluno: req.session.aluno,
            planoSelecionado: rows[0] || {
                id_plano: 2,
                nome: 'Lazuli',
                valor_mensal: 59.00
            }
        })
    } catch (err) {
        console.error('[pagamento GET]', err)

        res.render('pagamento', {
            aluno: req.session.aluno,
            planoSelecionado: {
                id_plano: 2,
                nome: 'Lazuli',
                valor_mensal: 59.00
            },
            erro: 'Não foi possível carregar o plano. Tente novamente.'
        })
    }
})

// =======================
// PÁGINAS PROTEGIDAS - PROFESSOR
// =======================

router.get('/painelprofessor', authProfessor, (req, res) => {
    res.render('painelprofessor', { professor: req.session.professor })
})

router.get('/todosalunos', authProfessor, (req, res) => {
    res.render('todosalunos', { professor: req.session.professor })
})

router.get('/todosvideos', authProfessor, (req, res) => {
    res.render('todosvideos', { professor: req.session.professor })
})

router.get('/visaoperfilaluno', authProfessor, (req, res) => {
    res.render('visaoperfilaluno', { professor: req.session.professor })
})

router.get('/editarexercicios', authProfessor, (req, res) => {
    res.render('editarexercicios', { professor: req.session.professor })
})

router.get('/feedbackprofessor', authProfessor, (req, res) => {
    res.render('feedbackprofessor', { professor: req.session.professor })
})

router.get('/feedbackresposta', authProfessor, (req, res) => {
    res.render('feedbackresposta', {
        professor: req.session.professor,
        idAluno: req.query.aluno || req.query.id_aluno || ''
    })
})

// =======================
// CADASTRO ALUNO
// =======================

router.post('/cadastroaluno', async (req, res) => {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
        return res.render('cadastroaluno', {
            erro: 'Preencha nome, e-mail e senha.'
        })
    }

    try {
        const [rows] = await db.query(
            'SELECT id_aluno FROM aluno WHERE email = ?',
            [email]
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
            [name.trim(), email.trim().toLowerCase(), senhaHash]
        )

        await db.query(
            `INSERT INTO streak (id_aluno, streak_atual, streak_maximo)
             VALUES (?, 0, 0)`,
            [result.insertId]
        )

        res.redirect('/loginaluno?sucesso=1')
    } catch (err) {
        console.error('[cadastroaluno]', err)

        res.render('cadastroaluno', {
            erro: 'Erro interno. Tente novamente.'
        })
    }
})

// =======================
// CADASTRO PROFESSOR COM VALIDAÇÃO DE CREF
// =======================

router.post('/cadastroprofessor', async (req, res) => {
    const { name, email, cref, password } = req.body

    if (!name || !email || !cref || !password) {
        return res.render('cadastroprofessor', {
            erro: 'Preencha nome, e-mail, CREF e senha.'
        })
    }

    const nomeLimpo = name.trim()
    const emailLimpo = email.trim().toLowerCase()
    const crefLimpo = cref.trim().toUpperCase()

    /*
        Formato aceito:
        1234-G/SP
        12345-G/SP
        123456-G/SP
        000123-G/RJ
        987654-P/MG
    */

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

        await db.query(
            `INSERT INTO professor (nome, email, senha_hash, cref)
             VALUES (?, ?, ?, ?)`,
            [nomeLimpo, emailLimpo, senhaHash, crefLimpo]
        )

        res.redirect('/loginprofessor?sucesso=1')
    } catch (err) {
        console.error('[cadastroprofessor]', err)

        res.render('cadastroprofessor', {
            erro: 'Erro interno. Tente novamente.'
        })
    }
})

// =======================
// LOGIN ALUNO
// =======================

router.post('/loginaluno', async (req, res) => {
    const { email, password, remember } = req.body

    if (!email || !password) {
        return res.render('loginaluno', {
            erro: 'Informe e-mail e senha.'
        })
    }

    try {
        const [rows] = await db.query(
            `SELECT id_aluno, nome, email, senha_hash, id_plano, foto_perfil
             FROM aluno 
             WHERE email = ?`,
            [email.trim().toLowerCase()]
        )

        if (rows.length === 0) {
            return res.render('loginaluno', {
                erro: 'E-mail ou senha inválidos.'
            })
        }

        const aluno = rows[0]
        const senhaCorreta = await bcrypt.compare(password, aluno.senha_hash)

        if (!senhaCorreta) {
            return res.render('loginaluno', {
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
            foto: aluno.foto_perfil
        }

        res.redirect('/painelfree')
    } catch (err) {
        console.error('[loginaluno]', err)

        res.render('loginaluno', {
            erro: 'Erro interno. Tente novamente.'
        })
    }
})

// =======================
// LOGIN PROFESSOR
// =======================

router.post('/loginprofessor', async (req, res) => {
    const { email, password, remember } = req.body

    if (!email || !password) {
        return res.render('loginprofessor', {
            erro: 'Informe e-mail e senha.'
        })
    }

    try {
        const [rows] = await db.query(
            `SELECT id_professor, nome, email, senha_hash, cref, foto_perfil
             FROM professor 
             WHERE email = ?`,
            [email.trim().toLowerCase()]
        )

        if (rows.length === 0) {
            return res.render('loginprofessor', {
                erro: 'E-mail ou senha inválidos.'
            })
        }

        const professor = rows[0]
        const senhaCorreta = await bcrypt.compare(password, professor.senha_hash)

        if (!senhaCorreta) {
            return res.render('loginprofessor', {
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

        res.redirect('/painelprofessor')
    } catch (err) {
        console.error('[loginprofessor]', err)

        res.render('loginprofessor', {
            erro: 'Erro interno. Tente novamente.'
        })
    }
})

// =======================
// LOGOUT
// =======================

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/home')
    })
})

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/home')
    })
})

// =======================
// PAGAMENTO
// =======================

router.post('/pagamento', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id
    const idPlano = Number(req.body['id-plano']) || 2

    const nomeTitular = req.body['card-name']
    const numeroRaw = req.body['card-number'] || ''
    const cpfTitular = req.body['card-cpf'] || ''
    const ultimos4 = numeroRaw.replace(/\D/g, '').slice(-4)

    if (!nomeTitular || !numeroRaw || !cpfTitular || ultimos4.length !== 4) {
        return res.render('pagamento', {
            aluno: req.session.aluno,
            planoSelecionado: {
                id_plano: idPlano,
                nome: idPlano === 3 ? 'Diamante' : 'Lazuli',
                valor_mensal: idPlano === 3 ? 149.00 : 59.00
            },
            erro: 'Preencha corretamente os dados do cartão.'
        })
    }

    const primeiroDigito = numeroRaw.trim()[0]

    const bandeira = primeiroDigito === '4'
        ? 'visa'
        : primeiroDigito === '5'
            ? 'mastercard'
            : 'outro'

    try {
        const [planoRows] = await db.query(
            'SELECT id_plano, nome, valor_mensal FROM plano WHERE id_plano = ?',
            [idPlano]
        )

        if (planoRows.length === 0) {
            return res.render('pagamento', {
                aluno: req.session.aluno,
                planoSelecionado: {
                    id_plano: idPlano,
                    nome: 'Plano inválido',
                    valor_mensal: 0
                },
                erro: 'Plano inválido.'
            })
        }

        const plano = planoRows[0]
        const valorPlano = parseFloat(plano.valor_mensal)

        const [descontoRows] = await db.query(
            `SELECT id_desconto, percentual 
             FROM desconto
             WHERE id_aluno = ? 
             AND usado = 0
             AND (validade IS NULL OR validade >= CURDATE())
             ORDER BY percentual DESC 
             LIMIT 1`,
            [idAluno]
        )

        let valorFinal = valorPlano
        let idDesconto = null

        if (descontoRows.length > 0) {
            const percentual = parseFloat(descontoRows[0].percentual)
            valorFinal = valorPlano * (1 - percentual / 100)
            idDesconto = descontoRows[0].id_desconto
        }

        const dataInicio = new Date().toISOString().slice(0, 10)

        const [assinaturaResult] = await db.query(
            `INSERT INTO assinatura
             (id_aluno, id_plano, status, valor_cobrado, data_inicio, periodicidade)
             VALUES (?, ?, 'ativa', ?, ?, 'mensal')`,
            [idAluno, idPlano, valorFinal.toFixed(2), dataInicio]
        )

        const idAssinatura = assinaturaResult.insertId

        await db.query(
            `INSERT INTO pagamento
             (id_assinatura, id_aluno, valor, status, metodo, nome_titular, ultimos_4, bandeira)
             VALUES (?, ?, ?, 'aprovado', 'cartao_credito', ?, ?, ?)`,
            [idAssinatura, idAluno, valorFinal.toFixed(2), nomeTitular.trim(), ultimos4, bandeira]
        )

        await db.query(
            'UPDATE aluno SET id_plano = ?, cpf = ? WHERE id_aluno = ?',
            [idPlano, cpfTitular, idAluno]
        )

        if (idDesconto) {
            await db.query(
                'UPDATE desconto SET usado = 1, id_assinatura = ? WHERE id_desconto = ?',
                [idAssinatura, idDesconto]
            )
        }

        req.session.aluno.id_plano = idPlano

        res.redirect('/painelfree')
    } catch (err) {
        console.error('[pagamento]', err)

        res.render('pagamento', {
            aluno: req.session.aluno,
            planoSelecionado: {
                id_plano: idPlano,
                nome: idPlano === 3 ? 'Diamante' : 'Lazuli',
                valor_mensal: idPlano === 3 ? 149.00 : 59.00
            },
            erro: 'Erro ao processar pagamento.'
        })
    }
})

// =======================
// SUPORTE
// =======================

router.post('/suporte', async (req, res) => {
    const { nome, email, assunto, mensagem } = req.body
    const idAluno = req.session.aluno ? req.session.aluno.id : null

    if (!nome || !email || !mensagem) {
        return res.render('suporte', {
            erro: 'Preencha nome, e-mail e mensagem.'
        })
    }

    try {
        await db.query(
            `INSERT INTO suporte (id_aluno, nome, email, assunto, mensagem)
             VALUES (?, ?, ?, ?, ?)`,
            [idAluno, nome.trim(), email.trim().toLowerCase(), assunto || null, mensagem.trim()]
        )

        res.render('suporte', {
            sucesso: 'Mensagem enviada! Responderemos em até 24h.'
        })
    } catch (err) {
        console.error('[suporte]', err)

        res.render('suporte', {
            erro: 'Erro ao enviar mensagem. Tente novamente.'
        })
    }
})

// =======================
// FEEDBACK ALUNO
// =======================

router.post('/feedbackaluno', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id
    const intensidade = req.body['intensity']
    const cansaco = req.body['tiredness-range']
    const texto = req.body['trainer-message']

    if (!texto) {
        return res.render('feedbackaluno', {
            aluno: req.session.aluno,
            erro: 'Escreva uma mensagem para enviar ao professor.'
        })
    }

    try {
        const [fichaRows] = await db.query(
            `SELECT ft.id_professor 
             FROM aluno_ficha af
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             WHERE af.id_aluno = ? 
             AND af.ativo = 1
             LIMIT 1`,
            [idAluno]
        )

        if (fichaRows.length === 0) {
            return res.render('feedbackaluno', {
                aluno: req.session.aluno,
                erro: 'Nenhum professor associado à sua conta ainda.'
            })
        }

        const idProfessor = fichaRows[0].id_professor
        let idChat

        const [chatRows] = await db.query(
            `SELECT id_chat 
             FROM chat_feedback
             WHERE id_professor = ? 
             AND id_aluno = ?`,
            [idProfessor, idAluno]
        )

        if (chatRows.length > 0) {
            idChat = chatRows[0].id_chat
        } else {
            const [chatResult] = await db.query(
                `INSERT INTO chat_feedback (id_professor, id_aluno)
                 VALUES (?, ?)`,
                [idProfessor, idAluno]
            )

            idChat = chatResult.insertId
        }

        await db.query(
            `INSERT INTO mensagem_feedback
             (id_chat, remetente, intensidade, nivel_cansaco, texto)
             VALUES (?, 'aluno', ?, ?, ?)`,
            [idChat, intensidade || null, cansaco || null, texto.trim()]
        )

        res.render('feedbackaluno', {
            aluno: req.session.aluno,
            sucesso: 'Feedback enviado ao seu professor!'
        })
    } catch (err) {
        console.error('[feedbackaluno]', err)

        res.render('feedbackaluno', {
            aluno: req.session.aluno,
            erro: 'Erro ao enviar feedback.'
        })
    }
})

// =======================
// RESPOSTA PROFESSOR
// =======================

router.post('/feedbackresposta', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id
    const idAluno = Number(req.body['id-aluno'])
    const texto = req.body['resposta']

    if (!idAluno || !texto) {
        return res.render('feedbackresposta', {
            professor: req.session.professor,
            idAluno: req.body['id-aluno'] || '',
            erro: 'Escolha um aluno e escreva uma resposta.'
        })
    }

    try {
        const [chatRows] = await db.query(
            `SELECT id_chat 
             FROM chat_feedback
             WHERE id_professor = ? 
             AND id_aluno = ?`,
            [idProfessor, idAluno]
        )

        if (chatRows.length === 0) {
            return res.render('feedbackresposta', {
                professor: req.session.professor,
                idAluno,
                erro: 'Conversa não encontrada.'
            })
        }

        const idChat = chatRows[0].id_chat

        await db.query(
            `INSERT INTO mensagem_feedback (id_chat, remetente, texto)
             VALUES (?, 'professor', ?)`,
            [idChat, texto.trim()]
        )

        await db.query(
            `UPDATE mensagem_feedback 
             SET lida = 1
             WHERE id_chat = ? 
             AND remetente = 'aluno' 
             AND lida = 0`,
            [idChat]
        )

        res.redirect('/feedbackprofessor')
    } catch (err) {
        console.error('[feedbackresposta]', err)

        res.render('feedbackresposta', {
            professor: req.session.professor,
            idAluno,
            erro: 'Erro ao enviar resposta.'
        })
    }
})

// =======================
// EDITAR EXERCÍCIOS
// =======================

router.post('/editarexercicios', authProfessor, async (req, res) => {
    const idExercicio = Number(req.body['id-exercicio'])
    const titulo = req.body['exercise-title']
    const descricao = req.body['exercise-description']
    const categoria = req.body['exercise-category']
    const duracao = Number(req.body['exercise-duration']) || null
    const nivel = req.body['difficulty'] || 'intermediario'

    if (!idExercicio || !titulo) {
        return res.render('editarexercicios', {
            professor: req.session.professor,
            erro: 'Informe o exercício e o título.'
        })
    }

    try {
        await db.query(
            `UPDATE exercicio
             SET titulo = ?, 
                 descricao = ?, 
                 categoria = ?,
                 duracao_segundos = ?, 
                 nivel = ?
             WHERE id_exercicio = ?`,
            [titulo.trim(), descricao || null, categoria || null, duracao, nivel, idExercicio]
        )

        res.redirect('/todosvideos')
    } catch (err) {
        console.error('[editarexercicios]', err)

        res.render('editarexercicios', {
            professor: req.session.professor,
            erro: 'Erro ao salvar exercício.'
        })
    }
})

// =======================
// APIs JSON - ALUNO
// =======================

router.get('/api/aluno/progresso', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id

    try {
        const [rows] = await db.query(
            `SELECT semana_inicio, dias_treinados, meta_dias,
                    tempo_total_min, calorias_total, bpm_maximo, variacao_pct
             FROM progresso_semanal
             WHERE id_aluno = ?
             ORDER BY semana_inicio DESC 
             LIMIT 8`,
            [idAluno]
        )

        res.json({ ok: true, data: rows })
    } catch (err) {
        res.status(500).json({ ok: false, erro: err.message })
    }
})

router.get('/api/aluno/streak', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id

    try {
        const [rows] = await db.query(
            `SELECT streak_atual, streak_maximo, ultima_atividade 
             FROM streak
             WHERE id_aluno = ?`,
            [idAluno]
        )

        const [descontos] = await db.query(
            `SELECT codigo, percentual, dias_streak, usado
             FROM desconto 
             WHERE id_aluno = ? 
             ORDER BY dias_streak`,
            [idAluno]
        )

        res.json({
            ok: true,
            streak: rows[0] || null,
            descontos
        })
    } catch (err) {
        res.status(500).json({ ok: false, erro: err.message })
    }
})

// =======================
// APIs JSON - PROFESSOR
// =======================

router.get('/api/professor/alunos', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id

    try {
        const [rows] = await db.query(
            `SELECT a.id_aluno, 
                    a.nome, 
                    a.email, 
                    a.foto_perfil,
                    p.nome AS plano,
                    s.streak_atual,
                    ps.variacao_pct
             FROM aluno_ficha af
             JOIN aluno a ON a.id_aluno = af.id_aluno
             JOIN plano p ON p.id_plano = a.id_plano
             LEFT JOIN streak s ON s.id_aluno = a.id_aluno
             LEFT JOIN progresso_semanal ps
               ON ps.id_aluno = a.id_aluno
              AND ps.semana_inicio = (
                    SELECT MAX(semana_inicio) 
                    FROM progresso_semanal
                    WHERE id_aluno = a.id_aluno
                  )
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             WHERE ft.id_professor = ? 
             AND af.ativo = 1
             GROUP BY a.id_aluno`,
            [idProfessor]
        )

        res.json({ ok: true, data: rows })
    } catch (err) {
        res.status(500).json({ ok: false, erro: err.message })
    }
})

router.get('/api/professor/videos', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id

    try {
        const [rows] = await db.query(
            `SELECT id_video, titulo, descricao, thumbnail,
                    duracao_seg, categoria, nivel, exclusivo, ativo, criado_em
             FROM video 
             WHERE id_professor = ?
             ORDER BY criado_em DESC`,
            [idProfessor]
        )

        res.json({ ok: true, data: rows })
    } catch (err) {
        res.status(500).json({ ok: false, erro: err.message })
    }
})

router.get('/api/professor/feedbacks', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id

    try {
        const [rows] = await db.query(
            `SELECT cf.id_chat, 
                    a.id_aluno,
                    a.nome AS aluno, 
                    a.foto_perfil,
                    mf.texto, 
                    mf.intensidade, 
                    mf.nivel_cansaco, 
                    mf.enviado_em
             FROM chat_feedback cf
             JOIN aluno a ON a.id_aluno = cf.id_aluno
             JOIN mensagem_feedback mf ON mf.id_chat = cf.id_chat
             WHERE cf.id_professor = ?
             AND mf.remetente = 'aluno'
             AND mf.lida = 0
             ORDER BY mf.enviado_em DESC`,
            [idProfessor]
        )

        res.json({ ok: true, data: rows })
    } catch (err) {
        res.status(500).json({ ok: false, erro: err.message })
    }
})

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