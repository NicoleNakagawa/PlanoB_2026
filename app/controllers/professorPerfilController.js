const db = require('../config/pool_conexoes')
const { uploadPerfilProfessor } = require('../config/uploads')

// =======================
// PERFIL DO PROFESSOR (ver, alterar dados e foto)
// =======================

exports.exibir = async (req, res) => {
    const idProfessor = req.session.professor.id

    try {
        const [professorRows] = await db.query(
            `SELECT id_professor, nome, email, cref, foto_perfil
             FROM professor
             WHERE id_professor = ?
             LIMIT 1`,
            [idProfessor]
        )

        const professorAtual = professorRows[0] || {
            id_professor: req.session.professor.id,
            nome: req.session.professor.nome,
            email: req.session.professor.email,
            cref: req.session.professor.cref,
            foto_perfil: req.session.professor.foto
        }

        req.session.professor.nome = professorAtual.nome
        req.session.professor.email = professorAtual.email
        req.session.professor.cref = professorAtual.cref
        req.session.professor.foto = professorAtual.foto_perfil

        const [estatisticasRows] = await db.query(
            `SELECT
                (
                    SELECT COUNT(DISTINCT af.id_aluno)
                    FROM aluno_ficha af
                    JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
                    WHERE ft.id_professor = ?
                    AND af.ativo = 1
                ) AS total_alunos,

                (
                    SELECT COUNT(*)
                    FROM video
                    WHERE id_professor = ?
                    AND ativo = 1
                ) AS total_videos,

                (
                    SELECT COUNT(*)
                    FROM chat_feedback cf
                    JOIN mensagem_feedback mf ON mf.id_chat = cf.id_chat
                    WHERE cf.id_professor = ?
                    AND mf.remetente = 'aluno'
                    AND mf.lida = 0
                ) AS feedbacks_pendentes,

                (
                    SELECT COUNT(*)
                    FROM sessao_treino st
                    JOIN aluno_ficha af ON af.id_aluno = st.id_aluno
                    JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
                    WHERE ft.id_professor = ?
                    AND af.ativo = 1
                ) AS aulas_realizadas,

                (
                    SELECT COALESCE(ROUND(AVG(
                        LEAST((COALESCE(ps.dias_treinados, 0) / NULLIF(COALESCE(ps.meta_dias, 5), 0)) * 100, 100)
                    )), 0)
                    FROM aluno_ficha af
                    JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
                    LEFT JOIN progresso_semanal ps
                      ON ps.id_aluno = af.id_aluno
                     AND ps.semana_inicio = (
                        SELECT MAX(ps2.semana_inicio)
                        FROM progresso_semanal ps2
                        WHERE ps2.id_aluno = af.id_aluno
                     )
                    WHERE ft.id_professor = ?
                    AND af.ativo = 1
                ) AS media_progressao`,
            [idProfessor, idProfessor, idProfessor, idProfessor, idProfessor]
        )

        const [alunosRows] = await db.query(
            `SELECT 
                a.id_aluno,
                a.nome,
                a.email,
                a.foto_perfil,
                p.nome AS plano,
                COALESCE(ps.dias_treinados, 0) AS dias_treinados,
                COALESCE(ps.meta_dias, 5) AS meta_dias,
                COALESCE(ps.tempo_total_min, 0) AS tempo_total_min
             FROM aluno_ficha af
             JOIN aluno a ON a.id_aluno = af.id_aluno
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             LEFT JOIN plano p ON p.id_plano = a.id_plano
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
                ps.dias_treinados,
                ps.meta_dias,
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

        const [feedbacksRows] = await db.query(
            `SELECT 
                mf.id_mensagem,
                mf.texto,
                mf.intensidade,
                mf.nivel_cansaco,
                mf.enviado_em,
                a.nome AS aluno,
                a.foto_perfil
             FROM chat_feedback cf
             JOIN aluno a ON a.id_aluno = cf.id_aluno
             JOIN mensagem_feedback mf ON mf.id_chat = cf.id_chat
             WHERE cf.id_professor = ?
             AND mf.remetente = 'aluno'
             ORDER BY mf.enviado_em DESC
             LIMIT 4`,
            [idProfessor]
        )

        res.render('perfilprofessor', {
            professor: {
                id: professorAtual.id_professor,
                nome: professorAtual.nome,
                email: professorAtual.email,
                cref: professorAtual.cref,
                foto: professorAtual.foto_perfil
            },
            estatisticas: estatisticasRows[0] || {
                total_alunos: 0,
                total_videos: 0,
                feedbacks_pendentes: 0,
                aulas_realizadas: 0,
                media_progressao: 0
            },
            alunos: alunosRows,
            videos: videosRows,
            feedbacksRecentes: feedbacksRows,
            sucesso: req.query.sucesso || null,
            erroPerfil: req.query.erroPerfil || null
        })
    } catch (err) {
        console.error('[perfilprofessor]', err)

        res.render('perfilprofessor', {
            professor: req.session.professor,
            estatisticas: {
                total_alunos: 0,
                total_videos: 0,
                feedbacks_pendentes: 0,
                aulas_realizadas: 0,
                media_progressao: 0
            },
            alunos: [],
            videos: [],
            feedbacksRecentes: [],
            sucesso: null,
            erroPerfil: 'Erro ao carregar o perfil do professor.'
        })
    }
}

exports.atualizarDados = async (req, res) => {
    const idProfessor = req.session.professor.id

    const nome = (req.body.nome || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()
    const cref = (req.body.cref || '').trim().toUpperCase()

    const regexCREF = /^[0-9]{4,6}-[A-Z]\/[A-Z]{2}$/

    if (!nome || !email || !cref) {
        return res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('Preencha nome, e-mail e CREF.'))
    }

    if (!email.includes('@') || !email.includes('.')) {
        return res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('Informe um e-mail válido.'))
    }

    if (!regexCREF.test(cref)) {
        return res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('CREF inválido. Use o formato 123456-G/SP.'))
    }

    try {
        const [emailProfessorRows] = await db.query(
            `SELECT id_professor
             FROM professor
             WHERE email = ?
             AND id_professor <> ?
             LIMIT 1`,
            [email, idProfessor]
        )

        if (emailProfessorRows.length > 0) {
            return res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('Este e-mail já está sendo usado por outro professor.'))
        }

        const [emailAlunoRows] = await db.query(
            `SELECT id_aluno
             FROM aluno
             WHERE email = ?
             LIMIT 1`,
            [email]
        )

        if (emailAlunoRows.length > 0) {
            return res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('Este e-mail já está sendo usado por um aluno.'))
        }

        const [crefRows] = await db.query(
            `SELECT id_professor
             FROM professor
             WHERE cref = ?
             AND id_professor <> ?
             LIMIT 1`,
            [cref, idProfessor]
        )

        if (crefRows.length > 0) {
            return res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('Este CREF já está sendo usado por outro professor.'))
        }

        await db.query(
            `UPDATE professor
             SET nome = ?,
                 email = ?,
                 cref = ?
             WHERE id_professor = ?`,
            [nome, email, cref, idProfessor]
        )

        req.session.professor.nome = nome
        req.session.professor.email = email
        req.session.professor.cref = cref

        res.redirect('/perfilprofessor?sucesso=' + encodeURIComponent('Dados profissionais atualizados com sucesso.'))
    } catch (err) {
        console.error('[perfilprofessor dados]', err)

        res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('Erro ao atualizar os dados profissionais.'))
    }
}

exports.atualizarFoto = (req, res) => {
    uploadPerfilProfessor.single('foto_perfil')(req, res, async (err) => {
        const idProfessor = req.session.professor.id

        if (err) {
            return res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent(err.message))
        }

        if (!req.file) {
            return res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('Selecione uma imagem para alterar a foto.'))
        }

        const fotoPerfil = `/uploads/professores/${req.file.filename}`

        try {
            await db.query(
                `UPDATE professor
                 SET foto_perfil = ?
                 WHERE id_professor = ?`,
                [fotoPerfil, idProfessor]
            )

            req.session.professor.foto = fotoPerfil

            res.redirect('/perfilprofessor?sucesso=' + encodeURIComponent('Foto de perfil atualizada com sucesso.'))
        } catch (err) {
            console.error('[perfilprofessor foto]', err)

            res.redirect('/perfilprofessor?erroPerfil=' + encodeURIComponent('Erro ao atualizar a foto de perfil.'))
        }
    })
}
