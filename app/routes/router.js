const express = require('express')
const bcrypt = require('bcrypt')
const multer = require('multer')
const path = require('path')

const router = express.Router()
const db = require('../config/pool_conexoes')

const SALT_ROUNDS = 12

// =======================
// UPLOAD DE VÍDEOS
// =======================

const storageVideos = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads', 'videos'))
    },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname)
        const nomeSeguro = file.originalname
            .replace(extensao, '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        cb(null, `${Date.now()}-${nomeSeguro}${extensao}`)
    }
})

const uploadVideo = multer({
    storage: storageVideos,
    limits: {
        fileSize: 300 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/quicktime'
        ]

        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error('Envie um vídeo nos formatos MP4, WEBM, OGG ou MOV.'))
        }

        cb(null, true)
    }
})

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

// =======================
// MIDDLEWARES
// =======================

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

    if (plano === 2) return '/painellazuli'
    if (plano === 3) return '/paineldiamante'

    return '/painelfree'
}

function redirecionarVideosAluno(idPlano) {
    const plano = Number(idPlano)

    if (plano >= 2) return '/videos'

    return '/videosfree'
}

async function obterColunasTabela(nomeTabela) {
    const [colunas] = await db.query(`SHOW COLUMNS FROM \`${nomeTabela}\``)
    return colunas.map(coluna => coluna.Field)
}

async function criarFichaParaProfessor(idProfessor, dados = {}) {
    const colunasFicha = await obterColunasTabela('ficha_treino')

    const campos = []
    const valores = []
    const params = []

    function adicionar(campo, valor) {
        if (colunasFicha.includes(campo)) {
            campos.push(`\`${campo}\``)
            valores.push('?')
            params.push(valor)
        }
    }

    adicionar('id_professor', idProfessor)
    adicionar('nome_ficha', dados.nomeFicha || 'Ficha principal')
    adicionar('nome', dados.nomeFicha || 'Ficha principal')
    adicionar('titulo', dados.nomeFicha || 'Ficha principal')
    adicionar('categoria', dados.categoria || 'Treino personalizado')
    adicionar('nivel', dados.nivel || 'iniciante')
    adicionar('descricao', 'Ficha criada automaticamente ao vincular aluno ao professor.')
    adicionar('objetivo', 'Acompanhamento personalizado')
    adicionar('ativo', 1)

    if (!campos.includes('`id_professor`')) {
        throw new Error('A tabela ficha_treino precisa ter a coluna id_professor.')
    }

    if (
        !campos.includes('`nome_ficha`') &&
        !campos.includes('`nome`') &&
        !campos.includes('`titulo`')
    ) {
        throw new Error('A tabela ficha_treino precisa ter uma coluna de nome da ficha: nome_ficha, nome ou titulo.')
    }

    const [resultado] = await db.query(
        `INSERT INTO ficha_treino (${campos.join(', ')})
         VALUES (${valores.join(', ')})`,
        params
    )

    return resultado.insertId
}

async function vincularAlunoAoProfessor(idProfessor, idAluno, dados = {}) {
    const colunasAlunoFicha = await obterColunasTabela('aluno_ficha')
    const temAtivo = colunasAlunoFicha.includes('ativo')
    const filtroAtivo = temAtivo ? 'AND af.ativo = 1' : ''

    const [vinculoExistente] = await db.query(
        `SELECT af.id_aluno, af.id_ficha
         FROM aluno_ficha af
         JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
         WHERE af.id_aluno = ?
         AND ft.id_professor = ?
         ${filtroAtivo}
         LIMIT 1`,
        [idAluno, idProfessor]
    )

    if (vinculoExistente.length > 0) {
        return {
            jaExistia: true,
            idFicha: vinculoExistente[0].id_ficha
        }
    }

    const idFicha = await criarFichaParaProfessor(idProfessor, dados)

    const campos = []
    const valores = []
    const params = []

    function adicionar(campo, valor) {
        if (colunasAlunoFicha.includes(campo)) {
            campos.push(`\`${campo}\``)
            valores.push('?')
            params.push(valor)
        }
    }

    adicionar('id_aluno', idAluno)
    adicionar('id_ficha', idFicha)
    adicionar('ativo', 1)

    if (colunasAlunoFicha.includes('data_inicio')) {
        campos.push('`data_inicio`')
        valores.push('CURDATE()')
    }

    if (colunasAlunoFicha.includes('criado_em')) {
        campos.push('`criado_em`')
        valores.push('NOW()')
    }

    if (colunasAlunoFicha.includes('atualizado_em')) {
        campos.push('`atualizado_em`')
        valores.push('NOW()')
    }

    if (colunasAlunoFicha.includes('status')) {
        campos.push('`status`')
        valores.push('?')
        params.push('ativo')
    }

    if (!campos.includes('`id_aluno`') || !campos.includes('`id_ficha`')) {
        throw new Error('A tabela aluno_ficha precisa ter as colunas id_aluno e id_ficha.')
    }

    await db.query(
        `INSERT INTO aluno_ficha (${campos.join(', ')})
         VALUES (${valores.join(', ')})`,
        params
    )

    return {
        jaExistia: false,
        idFicha
    }
}

async function buscarProfessorResponsavelDoAluno(idAluno) {
    const colunasAlunoFicha = await obterColunasTabela('aluno_ficha')
    const temAtivo = colunasAlunoFicha.includes('ativo')
    const filtroAtivo = temAtivo ? 'AND af.ativo = 1' : ''

    const [professorRows] = await db.query(
        `SELECT 
            p.id_professor,
            p.nome,
            p.email,
            p.cref,
            p.foto_perfil
         FROM aluno_ficha af
         JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
         JOIN professor p ON p.id_professor = ft.id_professor
         WHERE af.id_aluno = ?
         ${filtroAtivo}
         ORDER BY ft.id_ficha DESC
         LIMIT 1`,
        [idAluno]
    )

    return professorRows[0] || null
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
// ALUNO
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

router.get('/dadosaluno', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id

    try {
        const [rows] = await db.query(
            `SELECT 
                objetivo,
                tipo_treino,
                nivel_treino,
                local_treino,
                equipamentos,
                dias_semana,
                limitacoes,
                dados_completos
             FROM aluno
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        res.render('dadosaluno', {
            aluno: req.session.aluno,
            dadosAluno: rows[0] || null
        })
    } catch (err) {
        console.error('[dadosaluno GET]', err)

        res.render('dadosaluno', {
            aluno: req.session.aluno,
            dadosAluno: null,
            erro: 'Erro ao carregar seus dados.'
        })
    }
})

router.post('/dadosaluno', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id

    const objetivo = req.body.objetivo
    const tipoTreino = req.body.tipo_treino
    const nivelTreino = req.body.nivel_treino
    const localTreino = req.body.local_treino
    const diasSemana = Number(req.body.dias_semana)
    const limitacoes = req.body.limitacoes || null

    let equipamentos = req.body.equipamentos || []

    if (!Array.isArray(equipamentos)) {
        equipamentos = [equipamentos]
    }

    const equipamentosTexto = equipamentos.join(',')

    if (!objetivo || !tipoTreino || !nivelTreino || !localTreino || !diasSemana || equipamentos.length === 0) {
        return res.render('dadosaluno', {
            aluno: req.session.aluno,
            dadosAluno: {
                objetivo,
                tipo_treino: tipoTreino,
                nivel_treino: nivelTreino,
                local_treino: localTreino,
                equipamentos: equipamentosTexto,
                dias_semana: diasSemana,
                limitacoes
            },
            erro: 'Preencha todos os campos obrigatórios antes de continuar.'
        })
    }

    try {
        await db.query(
            `UPDATE aluno
             SET objetivo = ?,
                 tipo_treino = ?,
                 nivel_treino = ?,
                 local_treino = ?,
                 equipamentos = ?,
                 dias_semana = ?,
                 limitacoes = ?,
                 dados_completos = 1
             WHERE id_aluno = ?`,
            [
                objetivo,
                tipoTreino,
                nivelTreino,
                localTreino,
                equipamentosTexto,
                diasSemana,
                limitacoes,
                idAluno
            ]
        )

        req.session.aluno.dados_completos = 1

        res.redirect(redirecionarPainelAluno(req.session.aluno.id_plano))
    } catch (err) {
        console.error('[dadosaluno POST]', err)

        res.render('dadosaluno', {
            aluno: req.session.aluno,
            dadosAluno: {
                objetivo,
                tipo_treino: tipoTreino,
                nivel_treino: nivelTreino,
                local_treino: localTreino,
                equipamentos: equipamentosTexto,
                dias_semana: diasSemana,
                limitacoes
            },
            erro: 'Erro ao salvar seus dados. Tente novamente.'
        })
    }
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

        const [dadosAlunoRows] = await db.query(
            `SELECT 
                objetivo,
                tipo_treino,
                nivel_treino,
                local_treino,
                equipamentos,
                dias_semana,
                limitacoes,
                dados_completos
             FROM aluno
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
            dadosAluno: dadosAlunoRows[0] || null,
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
            dadosAluno: null,
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
        videosFree,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
})

router.get('/execucaoexercicios', authAluno, (req, res) => {
    const slug = req.query.video || 'agachamento'
    const videoSelecionado = videosFree.find(video => video.slug === slug) || videosFree[0]

    res.render('execucaoexercicios', {
        aluno: req.session.aluno,
        video: videoSelecionado,
        videosFree,
        linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
        linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
    })
})

router.get('/progressosemanal', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id

    try {
        const [resumoSemanaRows] = await db.query(
            `SELECT 
                COUNT(*) AS total_treinos,
                COUNT(DISTINCT data_treino) AS dias_treinados,
                COALESCE(SUM(duracao_min), 0) AS tempo_total_min,
                COALESCE(SUM(calorias), 0) AS calorias_total,
                COALESCE(MAX(bpm_maximo), 0) AS bpm_maximo
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)`,
            [idAluno]
        )

        const [resumoSemanaAnteriorRows] = await db.query(
            `SELECT COALESCE(SUM(duracao_min), 0) AS tempo_total_min
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
                AND DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 1 DAY)`,
            [idAluno]
        )

        const [treinosPorDiaRows] = await db.query(
            `SELECT 
                data_treino,
                WEEKDAY(data_treino) AS dia_semana,
                COUNT(*) AS total_treinos,
                COALESCE(SUM(duracao_min), 0) AS total_minutos
             FROM sessao_treino
             WHERE id_aluno = ?
             AND data_treino BETWEEN 
                DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)
             GROUP BY data_treino, WEEKDAY(data_treino)
             ORDER BY data_treino`,
            [idAluno]
        )

        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo, ultima_atividade
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        const [descontosRows] = await db.query(
            `SELECT codigo, percentual, dias_streak, usado, validade
             FROM desconto
             WHERE id_aluno = ?
             ORDER BY dias_streak ASC
             LIMIT 4`,
            [idAluno]
        )

        const resumoSemana = resumoSemanaRows[0] || {
            total_treinos: 0,
            dias_treinados: 0,
            tempo_total_min: 0,
            calorias_total: 0,
            bpm_maximo: 0
        }

        const tempoAtual = Number(resumoSemana.tempo_total_min) || 0
        const tempoAnterior = Number(resumoSemanaAnteriorRows[0]?.tempo_total_min) || 0

        let variacaoPct = 0

        if (tempoAnterior > 0) {
            variacaoPct = Math.round(((tempoAtual - tempoAnterior) / tempoAnterior) * 100)
        } else if (tempoAtual > 0) {
            variacaoPct = 100
        }

        const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

        const graficoSemana = diasSemana.map((dia, index) => {
            const encontrado = treinosPorDiaRows.find(item => Number(item.dia_semana) === index)

            return {
                dia,
                minutos: encontrado ? Number(encontrado.total_minutos) : 0,
                treinos: encontrado ? Number(encontrado.total_treinos) : 0
            }
        })

        const maiorMinuto = Math.max(...graficoSemana.map(item => item.minutos), 100)

        const graficoSemanaNormalizado = graficoSemana.map(item => {
            return {
                ...item,
                porcentagem: maiorMinuto > 0 ? Math.round((item.minutos / maiorMinuto) * 100) : 0
            }
        })

        const metaDias = 5
        const porcentagemMeta = Math.min(Math.round((Number(resumoSemana.dias_treinados) / metaDias) * 100), 100)
        const treinosRestantes = Math.max(metaDias - Number(resumoSemana.dias_treinados), 0)

        res.render('progressosemanal', {
            aluno: req.session.aluno,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            progresso: {
                resumoSemana,
                graficoSemana: graficoSemanaNormalizado,
                streak: streakRows[0] || {
                    streak_atual: 0,
                    streak_maximo: 0,
                    ultima_atividade: null
                },
                descontos: descontosRows,
                variacaoPct,
                metaDias,
                porcentagemMeta,
                treinosRestantes,
                tempoSemanaAnterior: tempoAnterior
            }
        })
    } catch (err) {
        console.error('[progressosemanal]', err)

        res.render('progressosemanal', {
            aluno: req.session.aluno,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            progresso: {
                resumoSemana: {
                    total_treinos: 0,
                    dias_treinados: 0,
                    tempo_total_min: 0,
                    calorias_total: 0,
                    bpm_maximo: 0
                },
                graficoSemana: [
                    { dia: 'Seg', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Ter', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Qua', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Qui', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Sex', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Sáb', minutos: 0, treinos: 0, porcentagem: 0 },
                    { dia: 'Dom', minutos: 0, treinos: 0, porcentagem: 0 }
                ],
                streak: {
                    streak_atual: 0,
                    streak_maximo: 0,
                    ultima_atividade: null
                },
                descontos: [],
                variacaoPct: 0,
                metaDias: 5,
                porcentagemMeta: 0,
                treinosRestantes: 5,
                tempoSemanaAnterior: 0
            },
            erro: 'Erro ao carregar progresso semanal.'
        })
    }
})

router.get('/streakprogress', authAluno, async (req, res) => {
    const idAluno = req.session.aluno.id

    const recompensasPadrao = [
        { dias: 10, percentual: 5, codigo: 'OFENSIVA10' },
        { dias: 40, percentual: 20, codigo: 'OFENSIVA40' },
        { dias: 50, percentual: 35, codigo: 'OFENSIVA50' },
        { dias: 90, percentual: 50, codigo: 'OFENSIVA90' }
    ]

    try {
        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo, ultima_atividade
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        const streak = streakRows[0] || {
            streak_atual: 0,
            streak_maximo: 0,
            ultima_atividade: null
        }

        for (const recompensa of recompensasPadrao) {
            if (Number(streak.streak_atual) >= recompensa.dias) {
                const [existe] = await db.query(
                    `SELECT id_desconto
                     FROM desconto
                     WHERE id_aluno = ?
                     AND codigo = ?
                     LIMIT 1`,
                    [idAluno, recompensa.codigo]
                )

                if (existe.length === 0) {
                    await db.query(
                        `INSERT INTO desconto
                         (id_aluno, codigo, percentual, dias_streak, usado, validade)
                         VALUES (?, ?, ?, ?, 0, DATE_ADD(CURDATE(), INTERVAL 30 DAY))`,
                        [
                            idAluno,
                            recompensa.codigo,
                            recompensa.percentual,
                            recompensa.dias
                        ]
                    )
                }
            }
        }

        const [descontosRows] = await db.query(
            `SELECT id_desconto, codigo, percentual, dias_streak, usado, validade
             FROM desconto
             WHERE id_aluno = ?
             ORDER BY dias_streak ASC`,
            [idAluno]
        )

        res.render('streakprogress', {
            aluno: req.session.aluno,
            streak,
            descontos: descontosRows,
            recompensas: recompensasPadrao,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
        })
    } catch (err) {
        console.error('[streakprogress]', err)

        res.render('streakprogress', {
            aluno: req.session.aluno,
            streak: {
                streak_atual: 0,
                streak_maximo: 0,
                ultima_atividade: null
            },
            descontos: [],
            recompensas: recompensasPadrao,
            erro: 'Erro ao carregar sua ofensiva.',
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
        })
    }
})

router.get('/feedbackaluno', authAluno, async (req, res) => {
    if (Number(req.session.aluno.id_plano) === 1) {
        return res.redirect('/perfilaluno')
    }

    try {
        const professorResponsavel = await buscarProfessorResponsavelDoAluno(req.session.aluno.id)

        res.render('feedbackaluno', {
            aluno: req.session.aluno,
            professorResponsavel,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
        })
    } catch (err) {
        console.error('[feedbackaluno GET]', err)

        res.render('feedbackaluno', {
            aluno: req.session.aluno,
            professorResponsavel: null,
            erro: 'Erro ao carregar professor responsável.',
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano)
        })
    }
})

router.post('/feedbackaluno', authAluno, async (req, res) => {
    if (Number(req.session.aluno.id_plano) === 1) {
        return res.redirect('/perfilaluno')
    }

    const idAluno = req.session.aluno.id
    const intensidade = req.body['intensity']
    const cansaco = Number(req.body['tiredness-range']) || null
    const texto = req.body['trainer-message']

    async function renderFeedback(payload = {}) {
        const professorResponsavel = await buscarProfessorResponsavelDoAluno(idAluno)

        return res.render('feedbackaluno', {
            aluno: req.session.aluno,
            professorResponsavel,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            ...payload
        })
    }

    if (!texto || !texto.trim()) {
        return renderFeedback({
            erro: 'Escreva uma mensagem para enviar ao professor.'
        })
    }

    try {
        const professorResponsavel = await buscarProfessorResponsavelDoAluno(idAluno)

        if (!professorResponsavel) {
            return renderFeedback({
                erro: 'Nenhum professor associado à sua conta ainda.'
            })
        }

        const idProfessor = professorResponsavel.id_professor
        let idChat

        const [chatRows] = await db.query(
            `SELECT id_chat
             FROM chat_feedback
             WHERE id_professor = ?
             AND id_aluno = ?
             LIMIT 1`,
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
            [idChat, intensidade || null, cansaco, texto.trim()]
        )

        return renderFeedback({
            sucesso: 'Feedback enviado ao seu professor!'
        })
    } catch (err) {
        console.error('[feedbackaluno POST]', err)

        return renderFeedback({
            erro: 'Erro ao enviar feedback: ' + err.message
        })
    }
})

// =======================
// PROFESSOR
// =======================

router.get('/painelprofessor', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id

    try {
        const [estatisticasAlunosRows] = await db.query(
            `SELECT COUNT(DISTINCT a.id_aluno) AS total_alunos
             FROM aluno_ficha af
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             JOIN aluno a ON a.id_aluno = af.id_aluno
             WHERE ft.id_professor = ?
             AND af.ativo = 1`,
            [idProfessor]
        )

        const [estatisticasVideosRows] = await db.query(
            `SELECT COUNT(*) AS total_videos
             FROM video
             WHERE id_professor = ?
             AND ativo = 1`,
            [idProfessor]
        )

        const [feedbackRows] = await db.query(
            `SELECT COUNT(*) AS feedbacks_pendentes
             FROM chat_feedback cf
             JOIN mensagem_feedback mf ON mf.id_chat = cf.id_chat
             WHERE cf.id_professor = ?
             AND mf.remetente = 'aluno'
             AND mf.lida = 0`,
            [idProfessor]
        )

        const [mediaProgressaoRows] = await db.query(
            `SELECT 
                COALESCE(ROUND(AVG(
                    CASE 
                        WHEN ps.meta_dias IS NOT NULL AND ps.meta_dias > 0 
                        THEN (ps.dias_treinados / ps.meta_dias) * 100
                        ELSE 0
                    END
                )), 0) AS media_progressao
             FROM aluno_ficha af
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             JOIN aluno a ON a.id_aluno = af.id_aluno
             LEFT JOIN progresso_semanal ps 
               ON ps.id_aluno = a.id_aluno
              AND ps.semana_inicio = (
                    SELECT MAX(ps2.semana_inicio)
                    FROM progresso_semanal ps2
                    WHERE ps2.id_aluno = a.id_aluno
                )
             WHERE ft.id_professor = ?
             AND af.ativo = 1`,
            [idProfessor]
        )

        const [alunosRows] = await db.query(
            `SELECT 
                a.id_aluno,
                a.nome,
                a.email,
                a.foto_perfil,
                p.nome AS plano,
                COALESCE(s.streak_atual, 0) AS streak_atual,
                COALESCE(ps.dias_treinados, 0) AS dias_treinados,
                COALESCE(ps.meta_dias, 5) AS meta_dias,
                COALESCE(ps.variacao_pct, 0) AS variacao_pct,
                COALESCE(ps.tempo_total_min, 0) AS tempo_total_min,
                (
                    SELECT COUNT(*)
                    FROM sessao_treino st
                    WHERE st.id_aluno = a.id_aluno
                ) AS total_treinos
             FROM aluno_ficha af
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             JOIN aluno a ON a.id_aluno = af.id_aluno
             LEFT JOIN plano p ON p.id_plano = a.id_plano
             LEFT JOIN streak s ON s.id_aluno = a.id_aluno
             LEFT JOIN progresso_semanal ps 
               ON ps.id_aluno = a.id_aluno
              AND ps.semana_inicio = (
                    SELECT MAX(ps2.semana_inicio)
                    FROM progresso_semanal ps2
                    WHERE ps2.id_aluno = a.id_aluno
                )
             WHERE ft.id_professor = ?
             AND af.ativo = 1
             GROUP BY 
                a.id_aluno,
                a.nome,
                a.email,
                a.foto_perfil,
                p.nome,
                s.streak_atual,
                ps.dias_treinados,
                ps.meta_dias,
                ps.variacao_pct,
                ps.tempo_total_min
             ORDER BY a.nome ASC
             LIMIT 6`,
            [idProfessor]
        )

        const [videosRows] = await db.query(
            `SELECT 
                id_video,
                titulo,
                descricao,
                thumbnail,
                duracao_seg,
                categoria,
                nivel,
                exclusivo,
                ativo,
                criado_em
             FROM video
             WHERE id_professor = ?
             AND ativo = 1
             ORDER BY criado_em DESC
             LIMIT 4`,
            [idProfessor]
        )

        res.render('painelprofessor', {
            professor: req.session.professor,
            estatisticas: {
                total_alunos: estatisticasAlunosRows[0]?.total_alunos || 0,
                total_videos: estatisticasVideosRows[0]?.total_videos || 0,
                feedbacks_pendentes: feedbackRows[0]?.feedbacks_pendentes || 0,
                media_progressao: mediaProgressaoRows[0]?.media_progressao || 0
            },
            alunos: alunosRows,
            videos: videosRows
        })
    } catch (err) {
        console.error('[painelprofessor]', err)

        res.render('painelprofessor', {
            professor: req.session.professor,
            estatisticas: {
                total_alunos: 0,
                total_videos: 0,
                feedbacks_pendentes: 0,
                media_progressao: 0
            },
            alunos: [],
            videos: [],
            erro: 'Erro ao carregar dados reais do painel.'
        })
    }
})

router.get('/todosalunos', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id

    const busca = (req.query.busca || '').trim()
    const planoFiltro = (req.query.plano || 'todos').trim()
    const paginaAtual = Math.max(Number(req.query.page) || 1, 1)
    const porPagina = 8

    try {
        const parametros = [idProfessor]
        let filtroSql = ''

        if (busca) {
            filtroSql += ` AND (a.nome LIKE ? OR a.email LIKE ?)`
            parametros.push(`%${busca}%`, `%${busca}%`)
        }

        if (planoFiltro !== 'todos') {
            filtroSql += ` AND p.nome = ?`
            parametros.push(planoFiltro)
        }

        const [alunosRows] = await db.query(
            `SELECT 
                a.id_aluno,
                a.nome,
                a.email,
                a.foto_perfil,
                a.id_plano,
                COALESCE(p.nome, 'Free') AS plano,
                COALESCE(s.streak_atual, 0) AS streak_atual,
                COALESCE(s.streak_maximo, 0) AS streak_maximo,

                COUNT(DISTINCT st_semana.id_sessao) AS treinos_semana,
                COUNT(DISTINCT st_semana.data_treino) AS dias_treinados_semana,
                COALESCE(SUM(st_semana.duracao_min), 0) AS tempo_semana,

                (
                    SELECT COUNT(*)
                    FROM sessao_treino st_total
                    WHERE st_total.id_aluno = a.id_aluno
                ) AS total_treinos,

                (
                    SELECT MAX(st_ultimo.data_treino)
                    FROM sessao_treino st_ultimo
                    WHERE st_ultimo.id_aluno = a.id_aluno
                ) AS ultimo_treino,

                ft.id_ficha,
                ft.nome_ficha,
                ft.categoria,
                ft.nivel

             FROM aluno_ficha af
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             JOIN aluno a ON a.id_aluno = af.id_aluno
             LEFT JOIN plano p ON p.id_plano = a.id_plano
             LEFT JOIN streak s ON s.id_aluno = a.id_aluno
             LEFT JOIN sessao_treino st_semana 
               ON st_semana.id_aluno = a.id_aluno
              AND st_semana.data_treino BETWEEN 
                    DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                    AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)

             WHERE ft.id_professor = ?
             AND af.ativo = 1
             ${filtroSql}

             GROUP BY 
                a.id_aluno,
                a.nome,
                a.email,
                a.foto_perfil,
                a.id_plano,
                p.nome,
                s.streak_atual,
                s.streak_maximo,
                ft.id_ficha,
                ft.nome_ficha,
                ft.categoria,
                ft.nivel

             ORDER BY a.nome ASC`,
            parametros
        )

        const alunosComProgresso = alunosRows.map((aluno) => {
            const metaDias = 5
            const diasTreinados = Number(aluno.dias_treinados_semana) || 0
            const totalTreinos = Number(aluno.total_treinos) || 0

            let status = 'Novo'

            if (diasTreinados > 0) {
                status = 'Ativo'
            } else if (totalTreinos > 0) {
                status = 'Em pausa'
            }

            const progresso = Math.min(Math.round((diasTreinados / metaDias) * 100), 100)

            return {
                ...aluno,
                meta_dias_aluno: metaDias,
                progresso,
                status
            }
        })

        const totalAlunos = alunosComProgresso.length
        const totalPaginas = Math.max(Math.ceil(totalAlunos / porPagina), 1)
        const inicio = (paginaAtual - 1) * porPagina
        const alunosPaginados = alunosComProgresso.slice(inicio, inicio + porPagina)

        const totalAtivos = alunosComProgresso.filter(aluno => aluno.status === 'Ativo').length
        const totalLazuli = alunosComProgresso.filter(aluno => aluno.plano === 'Lazuli').length
        const totalDiamante = alunosComProgresso.filter(aluno => aluno.plano === 'Diamante').length

        const mediaProgresso = totalAlunos > 0
            ? Math.round(alunosComProgresso.reduce((acc, aluno) => acc + aluno.progresso, 0) / totalAlunos)
            : 0

        const [alunosDisponiveisRows] = await db.query(
            `SELECT 
                a.id_aluno,
                a.nome,
                a.email,
                a.foto_perfil,
                COALESCE(p.nome, 'Free') AS plano
             FROM aluno a
             LEFT JOIN plano p ON p.id_plano = a.id_plano
             WHERE NOT EXISTS (
                SELECT 1
                FROM aluno_ficha af
                JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
                WHERE af.id_aluno = a.id_aluno
                AND ft.id_professor = ?
                AND af.ativo = 1
             )
             ORDER BY a.nome ASC
             LIMIT 100`,
            [idProfessor]
        )

        res.render('todosalunos', {
            professor: req.session.professor,
            alunos: alunosPaginados,
            alunosDisponiveis: alunosDisponiveisRows,
            estatisticas: {
                totalAlunos,
                totalAtivos,
                totalLazuli,
                totalDiamante,
                mediaProgresso
            },
            filtros: {
                busca,
                plano: planoFiltro,
                paginaAtual,
                totalPaginas,
                porPagina
            },
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[todosalunos]', err)

        res.render('todosalunos', {
            professor: req.session.professor,
            alunos: [],
            alunosDisponiveis: [],
            estatisticas: {
                totalAlunos: 0,
                totalAtivos: 0,
                totalLazuli: 0,
                totalDiamante: 0,
                mediaProgresso: 0
            },
            filtros: {
                busca,
                plano: planoFiltro,
                paginaAtual: 1,
                totalPaginas: 1,
                porPagina
            },
            erro: 'Erro ao carregar alunos do professor.',
            sucesso: null
        })
    }
})

router.post('/professor/vincular-aluno', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id
    const idAluno = Number(req.body.id_aluno)

    const nomeFicha = req.body.nome_ficha || 'Ficha principal'
    const categoria = req.body.categoria || 'Treino personalizado'
    const nivel = req.body.nivel || 'iniciante'

    if (!idAluno) {
        return res.redirect('/todosalunos?erro=' + encodeURIComponent('Selecione um aluno para vincular.'))
    }

    try {
        const [alunoRows] = await db.query(
            `SELECT id_aluno, nome
             FROM aluno
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        if (alunoRows.length === 0) {
            return res.redirect('/todosalunos?erro=' + encodeURIComponent('Aluno não encontrado.'))
        }

        const resultado = await vincularAlunoAoProfessor(idProfessor, idAluno, {
            nomeFicha,
            categoria,
            nivel
        })

        if (resultado.jaExistia) {
            return res.redirect('/todosalunos?erro=' + encodeURIComponent('Este aluno já está vinculado a você.'))
        }

        res.redirect('/todosalunos?sucesso=' + encodeURIComponent('Aluno vinculado com sucesso.'))
    } catch (err) {
        console.error('[vincular-aluno]', err)

        res.redirect('/todosalunos?erro=' + encodeURIComponent('Erro ao vincular aluno: ' + err.message))
    }
})

router.post('/professor/vincular-alunos-disponiveis', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id

    try {
        const colunasAlunoFicha = await obterColunasTabela('aluno_ficha')
        const temAtivo = colunasAlunoFicha.includes('ativo')
        const filtroAtivo = temAtivo ? 'AND af.ativo = 1' : ''

        const [alunosRows] = await db.query(
            `SELECT a.id_aluno, a.nome
             FROM aluno a
             WHERE NOT EXISTS (
                SELECT 1
                FROM aluno_ficha af
                JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
                WHERE af.id_aluno = a.id_aluno
                AND ft.id_professor = ?
                ${filtroAtivo}
             )
             ORDER BY a.nome ASC`,
            [idProfessor]
        )

        if (alunosRows.length === 0) {
            return res.redirect('/todosalunos?erro=' + encodeURIComponent('Nenhum aluno disponível para vincular.'))
        }

        let vinculados = 0

        for (const aluno of alunosRows) {
            const resultado = await vincularAlunoAoProfessor(idProfessor, aluno.id_aluno, {
                nomeFicha: `Ficha principal - ${aluno.nome}`,
                categoria: 'Treino personalizado',
                nivel: 'iniciante'
            })

            if (!resultado.jaExistia) {
                vinculados++
            }
        }

        res.redirect('/todosalunos?sucesso=' + encodeURIComponent(`${vinculados} aluno(s) vinculado(s) com sucesso.`))
    } catch (err) {
        console.error('[vincular-alunos-disponiveis]', err)

        res.redirect('/todosalunos?erro=' + encodeURIComponent('Erro ao vincular alunos disponíveis: ' + err.message))
    }
})

router.post('/professor/desvincular-aluno', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id
    const idAluno = Number(req.body.id_aluno)

    if (!idAluno) {
        return res.redirect('/todosalunos?erro=' + encodeURIComponent('Aluno inválido.'))
    }

    try {
        await db.query(
            `UPDATE aluno_ficha af
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             SET af.ativo = 0
             WHERE af.id_aluno = ?
             AND ft.id_professor = ?`,
            [idAluno, idProfessor]
        )

        res.redirect('/todosalunos?sucesso=' + encodeURIComponent('Aluno desvinculado com sucesso.'))
    } catch (err) {
        console.error('[desvincular-aluno]', err)
        res.redirect('/todosalunos?erro=' + encodeURIComponent('Erro ao desvincular aluno: ' + err.message))
    }
})

// =======================
// VÍDEOS DO PROFESSOR
// =======================

router.get('/todosvideos', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id
    const busca = (req.query.busca || '').trim()
    const categoria = (req.query.categoria || 'todos').trim()

    try {
        const params = [idProfessor]
        let filtroSql = ''

        if (busca) {
            filtroSql += ' AND (titulo LIKE ? OR descricao LIKE ? OR categoria LIKE ?)'
            params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
        }

        if (categoria !== 'todos') {
            filtroSql += ' AND categoria = ?'
            params.push(categoria)
        }

        const [videos] = await db.query(
            `SELECT 
                id_video,
                titulo,
                descricao,
                video_url,
                thumbnail,
                duracao_seg,
                categoria,
                nivel,
                exclusivo,
                ativo,
                criado_em,
                atualizado_em
             FROM video
             WHERE id_professor = ?
             AND ativo = 1
             ${filtroSql}
             ORDER BY criado_em DESC`,
            params
        )

        const [categorias] = await db.query(
            `SELECT DISTINCT categoria
             FROM video
             WHERE id_professor = ?
             AND ativo = 1
             AND categoria IS NOT NULL
             AND categoria <> ''
             ORDER BY categoria ASC`,
            [idProfessor]
        )

        const [estatisticasRows] = await db.query(
            `SELECT
                COUNT(*) AS total_videos,
                COALESCE(SUM(duracao_seg), 0) AS duracao_total,
                SUM(CASE WHEN exclusivo = 1 THEN 1 ELSE 0 END) AS total_exclusivos
             FROM video
             WHERE id_professor = ?
             AND ativo = 1`,
            [idProfessor]
        )

        res.render('todosvideos', {
            professor: req.session.professor,
            videos,
            categorias,
            estatisticas: estatisticasRows[0] || {
                total_videos: 0,
                duracao_total: 0,
                total_exclusivos: 0
            },
            filtros: {
                busca,
                categoria
            },
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[todosvideos]', err)

        res.render('todosvideos', {
            professor: req.session.professor,
            videos: [],
            categorias: [],
            estatisticas: {
                total_videos: 0,
                duracao_total: 0,
                total_exclusivos: 0
            },
            filtros: {
                busca,
                categoria
            },
            erro: 'Erro ao carregar vídeos: ' + err.message,
            sucesso: null
        })
    }
})

router.post('/professor/videos/criar', authProfessor, uploadVideo.single('arquivo_video'), async (req, res) => {
    const idProfessor = req.session.professor.id

    const titulo = (req.body.titulo || '').trim()
    const descricao = (req.body.descricao || '').trim()
    const videoUrlDigitado = (req.body.video_url || '').trim()
    const thumbnail = (req.body.thumbnail || '').trim()
    const categoria = (req.body.categoria || 'Treino').trim()
    const nivel = req.body.nivel || 'iniciante'
    const duracaoSeg = Number(req.body.duracao_seg) || null
    const exclusivo = req.body.exclusivo ? 1 : 0

    const videoUrl = req.file
        ? `/uploads/videos/${req.file.filename}`
        : videoUrlDigitado

    if (!titulo) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Informe o título do vídeo.'))
    }

    if (!videoUrl) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Envie um arquivo de vídeo ou informe uma URL do vídeo.'))
    }

    try {
        await db.query(
            `INSERT INTO video
             (id_professor, titulo, descricao, video_url, thumbnail, duracao_seg, categoria, nivel, exclusivo, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                idProfessor,
                titulo,
                descricao || null,
                videoUrl,
                thumbnail || null,
                duracaoSeg,
                categoria || null,
                nivel,
                exclusivo
            ]
        )

        res.redirect('/todosvideos?sucesso=' + encodeURIComponent('Vídeo adicionado com sucesso.'))
    } catch (err) {
        console.error('[criar video]', err)
        res.redirect('/todosvideos?erro=' + encodeURIComponent('Erro ao adicionar vídeo: ' + err.message))
    }
})

router.get('/editarvideos/:id', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id
    const idVideo = Number(req.params.id)

    if (!idVideo) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo inválido.'))
    }

    try {
        const [rows] = await db.query(
            `SELECT 
                id_video,
                titulo,
                descricao,
                video_url,
                thumbnail,
                duracao_seg,
                categoria,
                nivel,
                exclusivo,
                ativo,
                criado_em,
                atualizado_em
             FROM video
             WHERE id_video = ?
             AND id_professor = ?
             LIMIT 1`,
            [idVideo, idProfessor]
        )

        if (rows.length === 0) {
            return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo não encontrado.'))
        }

        res.render('editarvideos', {
            professor: req.session.professor,
            video: rows[0],
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[editarvideos GET]', err)
        res.redirect('/todosvideos?erro=' + encodeURIComponent('Erro ao abrir vídeo: ' + err.message))
    }
})

router.post('/editarvideos/:id', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id
    const idVideo = Number(req.params.id)

    const titulo = (req.body.titulo || '').trim()
    const descricao = (req.body.descricao || '').trim()
    const videoUrl = (req.body.video_url || '').trim()
    const thumbnail = (req.body.thumbnail || '').trim()
    const categoria = (req.body.categoria || '').trim()
    const nivel = req.body.nivel || 'iniciante'
    const duracaoSeg = Number(req.body.duracao_seg) || null
    const exclusivo = req.body.exclusivo ? 1 : 0

    if (!idVideo) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo inválido.'))
    }

    if (!titulo) {
        return res.redirect('/editarvideos/' + idVideo + '?erro=' + encodeURIComponent('Informe o título do vídeo.'))
    }

    try {
        const [result] = await db.query(
            `UPDATE video
             SET titulo = ?,
                 descricao = ?,
                 video_url = ?,
                 thumbnail = ?,
                 duracao_seg = ?,
                 categoria = ?,
                 nivel = ?,
                 exclusivo = ?,
                 atualizado_em = NOW()
             WHERE id_video = ?
             AND id_professor = ?`,
            [
                titulo,
                descricao || null,
                videoUrl || null,
                thumbnail || null,
                duracaoSeg,
                categoria || null,
                nivel,
                exclusivo,
                idVideo,
                idProfessor
            ]
        )

        if (result.affectedRows === 0) {
            return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo não encontrado ou sem permissão.'))
        }

        res.redirect('/editarvideos/' + idVideo + '?sucesso=' + encodeURIComponent('Alterações salvas com sucesso.'))
    } catch (err) {
        console.error('[editarvideos POST]', err)
        res.redirect('/editarvideos/' + idVideo + '?erro=' + encodeURIComponent('Erro ao salvar vídeo: ' + err.message))
    }
})

router.post('/professor/videos/:id/excluir', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id
    const idVideo = Number(req.params.id)

    if (!idVideo) {
        return res.redirect('/todosvideos?erro=' + encodeURIComponent('Vídeo inválido.'))
    }

    try {
        await db.query(
            `UPDATE video
             SET ativo = 0,
                 atualizado_em = NOW()
             WHERE id_video = ?
             AND id_professor = ?`,
            [idVideo, idProfessor]
        )

        res.redirect('/todosvideos?sucesso=' + encodeURIComponent('Vídeo removido com sucesso.'))
    } catch (err) {
        console.error('[excluir video]', err)
        res.redirect('/todosvideos?erro=' + encodeURIComponent('Erro ao remover vídeo: ' + err.message))
    }
})

router.get('/editarexercicios', authProfessor, (req, res) => {
    res.redirect('/todosvideos')
})

router.get('/visaoperfilaluno', authProfessor, (req, res) => {
    res.render('visaoperfilaluno', { professor: req.session.professor })
})

router.get('/feedbackprofessor', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id

    const busca = (req.query.busca || '').trim()
    const status = (req.query.status || 'pendentes').trim()
    const idAlunoSelecionado = Number(req.query.aluno) || null

    try {
        const paramsFeedbacks = [idProfessor]
        let filtroSql = ''

        if (busca) {
            filtroSql += ` AND (a.nome LIKE ? OR a.email LIKE ? OR mf.texto LIKE ?)`
            paramsFeedbacks.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
        }

        if (status === 'pendentes') {
            filtroSql += ` AND mf.remetente = 'aluno' AND mf.lida = 0`
        }

        if (status === 'respondidos') {
            filtroSql += ` AND EXISTS (
                SELECT 1
                FROM mensagem_feedback mf_prof
                WHERE mf_prof.id_chat = cf.id_chat
                AND mf_prof.remetente = 'professor'
            )`
        }

        const [feedbacksRows] = await db.query(
            `SELECT 
                cf.id_chat,
                a.id_aluno,
                a.nome AS aluno_nome,
                a.email AS aluno_email,
                a.foto_perfil,
                COALESCE(p.nome, 'Free') AS plano,
                mf.id_mensagem,
                mf.texto,
                mf.intensidade,
                mf.nivel_cansaco,
                mf.remetente,
                mf.lida,
                mf.enviado_em,
                (
                    SELECT COUNT(*)
                    FROM mensagem_feedback mf_pendente
                    WHERE mf_pendente.id_chat = cf.id_chat
                    AND mf_pendente.remetente = 'aluno'
                    AND mf_pendente.lida = 0
                ) AS mensagens_pendentes,
                (
                    SELECT mf_ultima.texto
                    FROM mensagem_feedback mf_ultima
                    WHERE mf_ultima.id_chat = cf.id_chat
                    ORDER BY mf_ultima.enviado_em DESC, mf_ultima.id_mensagem DESC
                    LIMIT 1
                ) AS ultima_mensagem,
                (
                    SELECT mf_ultima.enviado_em
                    FROM mensagem_feedback mf_ultima
                    WHERE mf_ultima.id_chat = cf.id_chat
                    ORDER BY mf_ultima.enviado_em DESC, mf_ultima.id_mensagem DESC
                    LIMIT 1
                ) AS ultima_data
             FROM chat_feedback cf
             JOIN aluno a ON a.id_aluno = cf.id_aluno
             LEFT JOIN plano p ON p.id_plano = a.id_plano
             JOIN mensagem_feedback mf ON mf.id_chat = cf.id_chat
             WHERE cf.id_professor = ?
             ${filtroSql}
             ORDER BY ultima_data DESC`,
            paramsFeedbacks
        )

        const conversasMap = new Map()

        feedbacksRows.forEach((item) => {
            if (!conversasMap.has(item.id_chat)) {
                conversasMap.set(item.id_chat, item)
            }
        })

        const conversas = Array.from(conversasMap.values())
        const alunoAtivo = idAlunoSelecionado || (conversas[0] ? conversas[0].id_aluno : null)

        let conversaAtual = null
        let mensagens = []

        if (alunoAtivo) {
            const [chatRows] = await db.query(
                `SELECT 
                    cf.id_chat,
                    a.id_aluno,
                    a.nome AS aluno_nome,
                    a.email AS aluno_email,
                    a.foto_perfil,
                    COALESCE(p.nome, 'Free') AS plano
                 FROM chat_feedback cf
                 JOIN aluno a ON a.id_aluno = cf.id_aluno
                 LEFT JOIN plano p ON p.id_plano = a.id_plano
                 WHERE cf.id_professor = ?
                 AND cf.id_aluno = ?
                 LIMIT 1`,
                [idProfessor, alunoAtivo]
            )

            conversaAtual = chatRows[0] || null

            if (conversaAtual) {
                const [mensagensRows] = await db.query(
                    `SELECT 
                        id_mensagem,
                        remetente,
                        intensidade,
                        nivel_cansaco,
                        texto,
                        lida,
                        enviado_em
                     FROM mensagem_feedback
                     WHERE id_chat = ?
                     ORDER BY enviado_em ASC, id_mensagem ASC`,
                    [conversaAtual.id_chat]
                )

                mensagens = mensagensRows
            }
        }

        const [estatisticasRows] = await db.query(
            `SELECT
                COUNT(DISTINCT cf.id_chat) AS total_conversas,
                COUNT(CASE WHEN mf.remetente = 'aluno' AND mf.lida = 0 THEN 1 END) AS pendentes,
                COUNT(CASE WHEN mf.remetente = 'aluno' THEN 1 END) AS total_feedbacks,
                COUNT(CASE WHEN mf.remetente = 'professor' THEN 1 END) AS total_respostas
             FROM chat_feedback cf
             LEFT JOIN mensagem_feedback mf ON mf.id_chat = cf.id_chat
             WHERE cf.id_professor = ?`,
            [idProfessor]
        )

        res.render('feedbackprofessor', {
            professor: req.session.professor,
            conversas,
            conversaAtual,
            mensagens,
            estatisticas: estatisticasRows[0] || {
                total_conversas: 0,
                pendentes: 0,
                total_feedbacks: 0,
                total_respostas: 0
            },
            filtros: {
                busca,
                status
            },
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[feedbackprofessor]', err)

        res.render('feedbackprofessor', {
            professor: req.session.professor,
            conversas: [],
            conversaAtual: null,
            mensagens: [],
            estatisticas: {
                total_conversas: 0,
                pendentes: 0,
                total_feedbacks: 0,
                total_respostas: 0
            },
            filtros: {
                busca,
                status
            },
            erro: 'Erro ao carregar feedbacks: ' + err.message,
            sucesso: null
        })
    }
})

router.post('/feedbackresposta', authProfessor, async (req, res) => {
    const idProfessor = req.session.professor.id
    const idAluno = Number(req.body['id-aluno'])
    const texto = req.body['resposta']

    if (!idAluno || !texto || !texto.trim()) {
        return res.redirect('/feedbackprofessor?erro=' + encodeURIComponent('Escolha um aluno e escreva uma resposta.'))
    }

    try {
        const [chatRows] = await db.query(
            `SELECT id_chat 
             FROM chat_feedback
             WHERE id_professor = ? 
             AND id_aluno = ?
             LIMIT 1`,
            [idProfessor, idAluno]
        )

        if (chatRows.length === 0) {
            return res.redirect('/feedbackprofessor?erro=' + encodeURIComponent('Conversa não encontrada.'))
        }

        const idChat = chatRows[0].id_chat

        await db.query(
            `INSERT INTO mensagem_feedback 
             (id_chat, remetente, texto, lida)
             VALUES (?, 'professor', ?, 1)`,
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

        res.redirect('/feedbackprofessor?aluno=' + idAluno + '&sucesso=' + encodeURIComponent('Resposta enviada com sucesso.'))
    } catch (err) {
        console.error('[feedbackresposta]', err)

        res.redirect('/feedbackprofessor?erro=' + encodeURIComponent('Erro ao enviar resposta: ' + err.message))
    }
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
            [email.trim().toLowerCase()]
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
            `SELECT 
                id_aluno, 
                nome, 
                email, 
                senha_hash, 
                id_plano, 
                foto_perfil,
                dados_completos
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
            foto: aluno.foto_perfil,
            dados_completos: aluno.dados_completos
        }

        if (!aluno.dados_completos) {
            return res.redirect('/dadosaluno')
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
             AND ativo = 1
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