const db = require('../config/pool_conexoes')

exports.alunos = async (req, res) => {
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
}

exports.videos = async (req, res) => {
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
}

exports.feedbacks = async (req, res) => {
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
}
