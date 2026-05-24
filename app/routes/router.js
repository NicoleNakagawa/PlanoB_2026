const express = require('express')
const bcrypt = require('bcrypt')
const router = express.Router()
const db = require('../config/pool_conexoes')

const SALT_ROUNDS = 12

const videosFree = [
    {
        slug: 'agachamento',
        titulo: 'Fundamentos do Agachamento',
        categoria: 'Fundamentos',
        nivel: 'Iniciante',
        duracao: '08:45',
        duracaoMin: 9,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDo-fkwrI2vN175z62Qq2gtPN-gdAd45gJquHcF0ZyrskfDFnSeAOf9qOhdizqb5DBMp13lLNffweE1YO5GUZ3viG9nx3MFst660mShuHltw7_RvBzPduY5hMovRZvbapvnBuzg-XYEdMKaWK9kN3V28Y2an46LQ9E2pTycTtnHgEHfZDIpEX568pGUlfrSTwT46rRNZXGn9VgpeNGF0sq_dR0rO3fExyys5u2-rmWN5MnFUS8r-kbm68aDMtPi_IV3RtycExLYFKWZ',
        descricao: 'Mantenha os pés afastados na largura dos ombros. Desça controladamente empurrando o quadril para trás como se fosse sentar em uma cadeira. Mantenha o peito aberto e o core engajado.',
        atencao1: 'Não deixe os joelhos entrarem durante o movimento.',
        atencao2: 'Evite curvar a região lombar excessivamente durante a descida.'
    },
    {
        slug: 'cardio-10-minutos',
        titulo: 'Cardio de 10 minutos',
        categoria: 'Cardio',
        nivel: 'Iniciante',
        duracao: '10:00',
        duracaoMin: 10,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjgvCFuIJdPrEMcolFmqhwO_PBewj-gbMz37PihA1HWzsWFP_PbNVgEQTi-OeHMr7imOcIebYDzZmlos5ZFu7gEVZT3Buue-qMWf6VjoNywEnrFfQ20PLGYKk5BGVGdoZXdmuIih5JJ2QtUgPlv-u4civPcntZgkgLa9-FRldHUsj0GNPdUsylv_RvoleCGxb3cF1wLrpG25h-zBmU7-tH4g7XcRjP7udlVDOvPOg9HAdXhy56YsgnyQ0sKyrhfUjXrZ09Q9YiKkci',
        descricao: 'Faça movimentos contínuos e controlados, mantendo a respiração constante. Respeite seu ritmo e aumente a intensidade aos poucos.',
        atencao1: 'Não prenda a respiração durante o exercício.',
        atencao2: 'Reduza o ritmo se sentir tontura ou dor.'
    },
    {
        slug: 'mobilidade-basica',
        titulo: 'Mobilidade Básica',
        categoria: 'Flexibilidade',
        nivel: 'Iniciante',
        duracao: '12:30',
        duracaoMin: 13,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBznhSUh7EuakqvmDPkaRGFV73qpdMbNqGjupfUsEPKslvaPKPMxVzKR_aJSFaeMmJ_2d5spIjxtp5u6OmeUgVi0r8nBTmiwTS-deyShfHpHjhV71lKrBcpzjbcUls7bAzawG7bYq2Ny5cObCsJIBmy3FaAdg6ZAEB6_V53u32BKizMc-hpx1CT3d27UQtgZG10Y50ZAGOHXFsnmw77CfTeEA0B52gG80kv8UZ6XLGwFN6NJyiZfTjlCYOxW-Wd42UbAXl_sBOxS3w5',
        descricao: 'Execute os movimentos com calma, buscando amplitude sem forçar demais. O objetivo é preparar o corpo e melhorar a mobilidade.',
        atencao1: 'Não force articulações além do confortável.',
        atencao2: 'Faça os movimentos de forma lenta e consciente.'
    },
    {
        slug: 'flexao-perfeita',
        titulo: 'Flexão Perfeita',
        categoria: 'Braços',
        nivel: 'Iniciante',
        duracao: '06:30',
        duracaoMin: 7,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2Te23qaQIP4sDEyhs5iPl36s9SMamoVzTUfKEV6GeYjwb8AkWCdFbdWUyjaVZEYOVXSz3w5XdWkMrYcX8fYu7_vtBSn2zUq62m9tNxd6QC-hSR-SXvTuewWJNXtE2ghd9-fK_g_A3kl4BNQ7l5HhM-CJjRSewpFwaM3YO_w_egiqP-jubNlDXGOqBokOdD6FDYThpRhuBOU4PqqWu2BEJd23D_NOM3uFVxS2pTQeTpg3QnJmG_0eG3MQScGOQSQNa1Yc86RQ6TVzR',
        descricao: 'Mantenha o corpo alinhado, contraia o abdômen e desça até próximo do chão. Empurre o corpo para cima sem perder o alinhamento.',
        atencao1: 'Não deixe o quadril cair.',
        atencao2: 'Não abra demais os cotovelos.'
    },
    {
        slug: 'afundo-explosivo',
        titulo: 'Afundo Explosivo',
        categoria: 'Pernas',
        nivel: 'Iniciante',
        duracao: '07:15',
        duracaoMin: 8,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNbv4owisX8CeqniNla6_8dRp3ZaqrmlC6ESnV5-hk_skn1D3HE7IsZkf-9wcqV9BLb570D23Oohasvrapm5J42VUEjGGHBBAt4rGsBn9remgGIVrQIXlYZmnpupLuGiRWZMhWH_0Yp2A6ZhSCIT9-6dMG5KWTefqWuF2JqoPbHWC45KBzqMa4QGbiYiX0FbVD_SSiB6VIodeltSt3cygjfVIAYGTLpzM66eSqxz4e1dy-Cn5aZlDTj21yBEt_SsJdSkj5CqZ02pME',
        descricao: 'Dê um passo à frente, flexione os joelhos e mantenha o tronco alinhado. Suba com força, controlando o retorno.',
        atencao1: 'Não deixe o joelho ultrapassar demais a ponta do pé.',
        atencao2: 'Mantenha o equilíbrio durante todo o movimento.'
    },
    {
        slug: 'prancha-isometrica',
        titulo: 'Prancha Isométrica',
        categoria: 'Core',
        nivel: 'Iniciante',
        duracao: '05:40',
        duracaoMin: 6,
        capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5Yw2rBZzu25lDVT60lbXslUxzdUVoYe9Z2NJW76C23iVOmyYbytq8CkMXEcSWqYf0CwINekPUaiNBZYJ5TuM_DSF3ww1jJkmDhH5QDRDqblhocwcfDeARboOYmc3_WEXV8utnL9nWyNjo9xBas7zsNkm2iERXNpXR1VjiXNGSw9PObHr03ce9pB5DEdcE-HT5ucROn8BOlPcFurHxdp8_AQNj4S4r8sbN6kpEaZZX1PQWZUDXxCnn6IfG_Ndvea4aXZF7vpz_uzgl',
        descricao: 'Apoie os antebraços no chão, mantenha o corpo reto e contraia o abdômen. Segure a posição sem deixar o quadril cair.',
        atencao1: 'Não levante demais o quadril.',
        atencao2: 'Não relaxe o abdômen durante a execução.'
    }
]

function authAluno(req, res, next) {
    if (req.session && req.session.aluno) return next()
    res.redirect('/loginaluno')
}

function authProfessor(req, res, next) {
    if (req.session && req.session.professor) return next()
    res.redirect('/loginprofessor')
}

function redirecionarPainelAluno(idPlano) {
    const plano = Number(idPlano)

    if (plano === 2) {
        return '/painellazuli'
    }

    if (plano === 3) {
        return '/paineldiamante'
    }

    return '/painelfree'
}

function redirecionarVideosAluno(idPlano) {
    const plano = Number(idPlano)

    if (plano >= 2) {
        return '/videos'
    }

    return '/videosfree'
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
    if (Number(req.session.aluno.id_plano) !== 1) {
        return res.redirect(redirecionarPainelAluno(req.session.aluno.id_plano))
    }

    res.render('painelfree', { aluno: req.session.aluno })
})

router.get('/painellazuli', authAluno, (req, res) => {
    if (Number(req.session.aluno.id_plano) < 2) {
        return res.redirect('/painelfree')
    }

    res.render('painellazuli', {
        aluno: req.session.aluno,
        videosFree
    })
})

router.get('/paineldiamante', authAluno, (req, res) => {
    if (Number(req.session.aluno.id_plano) < 3) {
        return res.redirect(redirecionarPainelAluno(req.session.aluno.id_plano))
    }

    res.render('paineldiamante', {
        aluno: req.session.aluno,
        videosFree
    })
})

router.get('/perfilaluno', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id

    try {
        const [historicoTreinos] = await db.query(
            `SELECT 
                st.id_sessao,
                st.data_treino,
                st.duracao_min,
                st.calorias,
                st.bpm_maximo,
                st.observacao,
                ft.nome_ficha,
                ft.categoria,
                ft.nivel
             FROM sessao_treino st
             LEFT JOIN ficha_treino ft ON ft.id_ficha = st.id_ficha
             WHERE st.id_aluno = ?
             ORDER BY st.data_treino DESC, st.id_sessao DESC
             LIMIT 8`,
            [idAluno]
        )

        const [resumoRows] = await db.query(
            `SELECT 
                COUNT(*) AS total_treinos,
                COALESCE(SUM(duracao_min), 0) AS tempo_total,
                COALESCE(ROUND(AVG(duracao_min)), 0) AS tempo_medio
             FROM sessao_treino
             WHERE id_aluno = ?`,
            [idAluno]
        )

        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        res.render('perfilaluno', {
            aluno: req.session.aluno,
            historicoTreinos,
            resumoTreinos: resumoRows[0] || {
                total_treinos: 0,
                tempo_total: 0,
                tempo_medio: 0
            },
            streak: streakRows[0] || {
                streak_atual: 0,
                streak_maximo: 0
            },
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
        })
    } catch (err) {
        console.error('[perfilaluno]', err)

        res.render('perfilaluno', {
            aluno: req.session.aluno,
            historicoTreinos: [],
            resumoTreinos: {
                total_treinos: 0,
                tempo_total: 0,
                tempo_medio: 0
            },
            streak: {
                streak_atual: 0,
                streak_maximo: 0
            },
            erro: 'Erro ao carregar o perfil.',
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
        })
    }
})

router.get('/perfilprofparaaluno', authAluno, (req, res) => {
    res.render('perfilprofparaaluno', { aluno: req.session.aluno })
})

router.get('/videosfree', authAluno, (req, res) => {
    if (Number(req.session.aluno.id_plano) >= 2) {
        return res.redirect('/videos')
    }

    res.render('videosfree', {
        aluno: req.session.aluno,
        videosFree
    })
})

router.get('/videos', authAluno, (req, res) => {
    if (Number(req.session.aluno.id_plano) < 2) {
        return res.redirect('/videosfree')
    }

    res.render('videos', {
        aluno: req.session.aluno,
        videosFree
    })
})

router.get('/execucaoexercicios', authAluno, (req, res) => {
    const slug = req.query.video || 'agachamento'
    const videoSelecionado = videosFree.find(video => video.slug === slug) || videosFree[0]

    res.render('execucaoexercicios', {
        aluno: req.session.aluno,
        video: videoSelecionado,
        videosFree
    })
})

router.get('/progressosemanal', authAluno, (req, res) => {
    res.render('progressosemanal', { aluno: req.session.aluno })
})

router.get('/streakprogress', authAluno, (req, res) => {
    res.render('streakprogress', { aluno: req.session.aluno })
})

router.get('/feedbackaluno', authAluno, (req, res) => {
    if (Number(req.session.aluno.id_plano) === 1) {
        return res.redirect('/perfilaluno')
    }

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
// CADASTRO PROFESSOR
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

        res.redirect(redirecionarPainelAluno(aluno.id_plano))
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

    const nomeTitular = req.body['card-name'] || ''
    const numeroRaw = req.body['card-number'] || ''
    const cpfTitular = req.body['card-cpf'] || ''
    const validade = req.body['card-expiry'] || ''
    const cvvRaw = req.body['card-cvv'] || ''

    const numeroLimpo = numeroRaw.replace(/\D/g, '')
    const cpfLimpo = cpfTitular.replace(/\D/g, '')
    const cvvLimpo = cvvRaw.replace(/\D/g, '')
    const ultimos4 = numeroLimpo.slice(-4)

    function cpfValido(cpf) {
        if (!cpf || cpf.length !== 11) return false
        if (/^(\d)\1+$/.test(cpf)) return false

        let soma = 0

        for (let i = 0; i < 9; i++) {
            soma += Number(cpf.charAt(i)) * (10 - i)
        }

        let resto = (soma * 10) % 11

        if (resto === 10 || resto === 11) resto = 0
        if (resto !== Number(cpf.charAt(9))) return false

        soma = 0

        for (let i = 0; i < 10; i++) {
            soma += Number(cpf.charAt(i)) * (11 - i)
        }

        resto = (soma * 10) % 11

        if (resto === 10 || resto === 11) resto = 0

        return resto === Number(cpf.charAt(10))
    }

    function validadeValida(valor) {
        if (!/^\d{2}\/\d{2}$/.test(valor)) return false

        const partes = valor.split('/')
        const mes = Number(partes[0])
        const ano = Number('20' + partes[1])

        if (!mes || !ano) return false
        if (mes < 1 || mes > 12) return false

        const hoje = new Date()
        const anoAtual = hoje.getFullYear()
        const mesAtual = hoje.getMonth() + 1

        if (ano < anoAtual) return false
        if (ano === anoAtual && mes < mesAtual) return false

        return true
    }

    async function renderizarErroPagamento(mensagem) {
        try {
            const [rows] = await db.query(
                'SELECT id_plano, nome, valor_mensal, descricao FROM plano WHERE id_plano = ?',
                [idPlano]
            )

            return res.render('pagamento', {
                aluno: req.session.aluno,
                planoSelecionado: rows[0] || {
                    id_plano: idPlano,
                    nome: idPlano === 3 ? 'Diamante' : 'Lazuli',
                    valor_mensal: idPlano === 3 ? 149.00 : 59.00
                },
                erro: mensagem
            })
        } catch (err) {
            console.error('[pagamento erro render]', err)

            return res.render('pagamento', {
                aluno: req.session.aluno,
                planoSelecionado: {
                    id_plano: idPlano,
                    nome: idPlano === 3 ? 'Diamante' : 'Lazuli',
                    valor_mensal: idPlano === 3 ? 149.00 : 59.00
                },
                erro: mensagem
            })
        }
    }

    if (![2, 3].includes(idPlano)) {
        return renderizarErroPagamento('Plano inválido.')
    }

    if (!nomeTitular.trim() || nomeTitular.trim().length < 5 || !nomeTitular.trim().includes(' ')) {
        return renderizarErroPagamento('Informe o nome completo do titular do cartão.')
    }

    if (!cpfValido(cpfLimpo)) {
        return renderizarErroPagamento('CPF inválido.')
    }

    if (numeroLimpo.length < 13 || numeroLimpo.length > 16) {
        return renderizarErroPagamento('Número do cartão inválido.')
    }

    if (!validadeValida(validade)) {
        return renderizarErroPagamento('Validade do cartão inválida ou vencida.')
    }

    if (cvvLimpo.length < 3 || cvvLimpo.length > 4) {
        return renderizarErroPagamento('CVV inválido.')
    }

    const primeiroDigito = numeroLimpo[0]

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
            return renderizarErroPagamento('Plano inválido.')
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
            [idPlano, cpfLimpo, idAluno]
        )

        if (idDesconto) {
            await db.query(
                'UPDATE desconto SET usado = 1, id_assinatura = ? WHERE id_desconto = ?',
                [idAssinatura, idDesconto]
            )
        }

        req.session.aluno.id_plano = idPlano

        res.redirect(redirecionarPainelAluno(idPlano))
    } catch (err) {
        console.error('[pagamento]', err)

        return renderizarErroPagamento('Erro ao processar pagamento.')
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
    if (Number(req.session.aluno.id_plano) === 1) {
        return res.redirect('/perfilaluno')
    }

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
// REGISTRAR TREINO
// =======================

router.post('/api/aluno/registrar-treino', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id
    const idFicha = req.body.id_ficha || null
    const duracaoMin = Number(req.body.duracao_min) || 0
    const calorias = req.body.calorias || null
    const bpmMaximo = req.body.bpm_maximo || null
    const observacao = req.body.observacao || null

    try {
        await db.query(
            `INSERT INTO sessao_treino
             (id_aluno, id_ficha, data_treino, duracao_min, calorias, bpm_maximo, observacao)
             VALUES (?, ?, CURDATE(), ?, ?, ?, ?)`,
            [idAluno, idFicha, duracaoMin, calorias, bpmMaximo, observacao]
        )

        await db.query(
            `UPDATE streak
             SET streak_atual = streak_atual + 1,
                 streak_maximo = GREATEST(streak_maximo, streak_atual + 1),
                 ultima_atividade = CURDATE()
             WHERE id_aluno = ?`,
            [idAluno]
        )

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ ok: true })
        }

        res.redirect('/perfilaluno')
    } catch (err) {
        console.error('[registrar-treino]', err)

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({
                ok: false,
                erro: 'Erro ao registrar treino.'
            })
        }

        res.redirect('/execucaoexercicios')
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