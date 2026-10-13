const db = require('../config/pool_conexoes')

// =======================
// FEEDBACK DO PROFESSOR (ver feedbacks e responder)
// =======================

exports.exibir = async (req, res) => {
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
}

exports.responder = async (req, res) => {
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
}
