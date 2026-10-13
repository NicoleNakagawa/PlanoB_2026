const db = require('../config/pool_conexoes')
const {
    obterColunasTabela,
    vincularAlunoAoProfessor
} = require('../utils/professorAluno')

// =======================
// PAINEL DO PROFESSOR E VÍNCULO COM ALUNOS
// =======================

exports.painel = async (req, res) => {
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
}

exports.todosAlunos = async (req, res) => {
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
}

exports.vincularAluno = async (req, res) => {
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
}

exports.vincularAlunosDisponiveis = async (req, res) => {
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
}

exports.desvincularAluno = async (req, res) => {
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
}

