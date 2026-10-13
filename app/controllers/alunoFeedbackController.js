const db = require('../config/pool_conexoes')
const { buscarProfessorResponsavelDoAluno } = require('../utils/professorAluno')
const { redirecionarPainelAluno, redirecionarVideosAluno } = require('../utils/redirecionamentos')

// =======================
// FEEDBACK DO ALUNO COM CHAT
// =======================

async function buscarOuCriarChatFeedback(idProfessor, idAluno) {
    const [chatRows] = await db.query(
        `SELECT id_chat
         FROM chat_feedback
         WHERE id_professor = ?
         AND id_aluno = ?
         LIMIT 1`,
        [idProfessor, idAluno]
    )

    if (chatRows.length > 0) {
        return chatRows[0].id_chat
    }

    const [chatResult] = await db.query(
        `INSERT INTO chat_feedback (id_professor, id_aluno)
         VALUES (?, ?)`,
        [idProfessor, idAluno]
    )

    return chatResult.insertId
}

exports.exibir = async (req, res) => {
    if (Number(req.session.aluno.id_plano) === 1) {
        return res.redirect('/perfilaluno')
    }

    const idAluno = req.session.aluno.id

    try {
        const professorResponsavel = await buscarProfessorResponsavelDoAluno(idAluno)

        let mensagens = []

        if (professorResponsavel) {
            const [chatRows] = await db.query(
                `SELECT id_chat
                 FROM chat_feedback
                 WHERE id_professor = ?
                 AND id_aluno = ?
                 LIMIT 1`,
                [professorResponsavel.id_professor, idAluno]
            )

            if (chatRows.length > 0) {
                const idChat = chatRows[0].id_chat

                await db.query(
                    `UPDATE mensagem_feedback
                     SET lida = 1
                     WHERE id_chat = ?
                     AND remetente = 'professor'
                     AND lida = 0`,
                    [idChat]
                )

                const [mensagensRows] = await db.query(
                    `SELECT 
                        id_mensagem,
                        remetente,
                        intensidade,
                        nivel_cansaco,
                        texto,
                        enviado_em,
                        lida
                     FROM mensagem_feedback
                     WHERE id_chat = ?
                     ORDER BY enviado_em ASC, id_mensagem ASC`,
                    [idChat]
                )

                mensagens = mensagensRows
            }
        }

        res.render('feedbackaluno', {
            aluno: req.session.aluno,
            professorResponsavel,
            mensagens,
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[feedbackaluno GET]', err)

        res.render('feedbackaluno', {
            aluno: req.session.aluno,
            professorResponsavel: null,
            mensagens: [],
            linkPainelAluno: redirecionarPainelAluno(req.session.aluno.id_plano),
            linkVideosAluno: redirecionarVideosAluno(req.session.aluno.id_plano),
            sucesso: null,
            erro: 'Erro ao carregar a conversa com o professor.'
        })
    }
}

exports.enviar = async (req, res) => {
    if (Number(req.session.aluno.id_plano) === 1) {
        return res.redirect('/perfilaluno')
    }

    const idAluno = req.session.aluno.id
    const intensidade = req.body['intensity'] || null
    const cansaco = req.body['tiredness-range'] || null
    const texto = (req.body['trainer-message'] || '').trim()

    if (!texto) {
        return res.redirect('/feedbackaluno?erro=' + encodeURIComponent('Escreva uma mensagem para enviar ao professor.') + '#feedback-dia')
    }

    try {
        const professorResponsavel = await buscarProfessorResponsavelDoAluno(idAluno)

        if (!professorResponsavel) {
            return res.redirect('/feedbackaluno?erro=' + encodeURIComponent('Nenhum professor associado à sua conta ainda.') + '#feedback-dia')
        }

        const idChat = await buscarOuCriarChatFeedback(professorResponsavel.id_professor, idAluno)

        await db.query(
            `INSERT INTO mensagem_feedback
             (id_chat, remetente, intensidade, nivel_cansaco, texto, lida)
             VALUES (?, 'aluno', ?, ?, ?, 0)`,
            [idChat, intensidade, cansaco, texto]
        )

        res.redirect('/feedbackaluno?sucesso=' + encodeURIComponent('Feedback do dia enviado e adicionado à conversa!') + '#conversa-professor')
    } catch (err) {
        console.error('[feedbackaluno POST]', err)

        res.redirect('/feedbackaluno?erro=' + encodeURIComponent('Erro ao enviar feedback do dia.') + '#feedback-dia')
    }
}

exports.responder = async (req, res) => {
    if (Number(req.session.aluno.id_plano) === 1) {
        return res.redirect('/perfilaluno')
    }

    const idAluno = req.session.aluno.id
    const mensagem = (req.body.mensagem || '').trim()

    if (!mensagem) {
        return res.redirect('/feedbackaluno?erro=' + encodeURIComponent('Escreva uma resposta antes de enviar.') + '#conversa-professor')
    }

    try {
        const professorResponsavel = await buscarProfessorResponsavelDoAluno(idAluno)

        if (!professorResponsavel) {
            return res.redirect('/feedbackaluno?erro=' + encodeURIComponent('Nenhum professor associado à sua conta ainda.') + '#conversa-professor')
        }

        const idChat = await buscarOuCriarChatFeedback(professorResponsavel.id_professor, idAluno)

        await db.query(
            `INSERT INTO mensagem_feedback
             (id_chat, remetente, texto, lida)
             VALUES (?, 'aluno', ?, 0)`,
            [idChat, mensagem]
        )

        res.redirect('/feedbackaluno?sucesso=' + encodeURIComponent('Resposta enviada ao professor!') + '#conversa-professor')
    } catch (err) {
        console.error('[feedbackaluno responder]', err)

        res.redirect('/feedbackaluno?erro=' + encodeURIComponent('Erro ao responder o professor.') + '#conversa-professor')
    }
}
