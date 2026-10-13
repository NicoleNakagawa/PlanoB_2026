const db = require('../config/pool_conexoes')

// =======================
// VISÃO DO PERFIL DO ALUNO PARA O PROFESSOR
// =======================

exports.exibir = async (req, res) => {
    const idProfessor = req.session.professor.id
    const idAluno = Number(req.params.id || req.query.id_aluno || req.query.aluno || req.query.id)

    if (!idAluno) {
        return res.redirect('/todosalunos?erro=' + encodeURIComponent('Aluno não informado.'))
    }

    try {
        const [vinculoRows] = await db.query(
            `SELECT af.id_aluno
             FROM aluno_ficha af
             JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
             WHERE af.id_aluno = ?
             AND ft.id_professor = ?
             AND af.ativo = 1
             LIMIT 1`,
            [idAluno, idProfessor]
        )

        if (vinculoRows.length === 0) {
            return res.redirect('/todosalunos?erro=' + encodeURIComponent('Este aluno não está vinculado ao seu perfil.'))
        }

        const [alunoRows] = await db.query(
            `SELECT 
                a.id_aluno,
                a.nome,
                a.email,
                a.foto_perfil,
                a.id_plano,
                a.objetivo,
                a.tipo_treino,
                a.nivel_treino,
                a.local_treino,
                a.equipamentos,
                a.dias_semana,
                a.limitacoes,
                a.dados_completos,
                a.criado_em,
                COALESCE(p.nome, 'Free') AS plano
             FROM aluno a
             LEFT JOIN plano p ON p.id_plano = a.id_plano
             WHERE a.id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        if (alunoRows.length === 0) {
            return res.redirect('/todosalunos?erro=' + encodeURIComponent('Aluno não encontrado.'))
        }

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
                COALESCE(ROUND(AVG(duracao_min)), 0) AS tempo_medio,
                COALESCE(SUM(calorias), 0) AS calorias_total,
                COALESCE(MAX(bpm_maximo), 0) AS bpm_maximo
             FROM sessao_treino
             WHERE id_aluno = ?`,
            [idAluno]
        )

        const [streakRows] = await db.query(
            `SELECT streak_atual, streak_maximo, ultima_atividade
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        )

        const [progressoRows] = await db.query(
            `SELECT 
                semana_inicio,
                dias_treinados,
                meta_dias,
                tempo_total_min,
                calorias_total,
                bpm_maximo,
                variacao_pct,
                LEAST(ROUND((COALESCE(dias_treinados, 0) / NULLIF(COALESCE(meta_dias, 5), 0)) * 100), 100) AS porcentagem
             FROM progresso_semanal
             WHERE id_aluno = ?
             ORDER BY semana_inicio DESC
             LIMIT 5`,
            [idAluno]
        ).catch(async () => {
            return [[]]
        })

        let progressoSemana = progressoRows[0] || null

        let frequenciaSemanas = progressoRows.slice().reverse().map((item, index) => ({
            ...item,
            rotulo: index === progressoRows.length - 1 ? 'Atual' : `Sem ${index + 1}`
        }))

        if (!progressoSemana) {
            const [semanaAtualRows] = await db.query(
                `SELECT 
                    COUNT(DISTINCT data_treino) AS dias_treinados,
                    ? AS meta_dias,
                    COALESCE(SUM(duracao_min), 0) AS tempo_total_min,
                    COALESCE(SUM(calorias), 0) AS calorias_total,
                    COALESCE(MAX(bpm_maximo), 0) AS bpm_maximo
                 FROM sessao_treino
                 WHERE id_aluno = ?
                 AND data_treino BETWEEN 
                    DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                    AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)`,
                [alunoRows[0].dias_semana || 5, idAluno]
            )

            const semanaAtual = semanaAtualRows[0] || {
                dias_treinados: 0,
                meta_dias: alunoRows[0].dias_semana || 5,
                tempo_total_min: 0,
                calorias_total: 0,
                bpm_maximo: 0
            }

            const metaDias = Number(semanaAtual.meta_dias || 5) || 5
            const diasTreinados = Number(semanaAtual.dias_treinados || 0) || 0

            progressoSemana = {
                ...semanaAtual,
                variacao_pct: 0,
                porcentagem: Math.min(Math.round((diasTreinados / metaDias) * 100), 100)
            }

            frequenciaSemanas = [
                {
                    ...progressoSemana,
                    rotulo: 'Atual'
                }
            ]
        }

        const [feedbacksAluno] = await db.query(
            `SELECT 
                mf.id_mensagem,
                mf.texto,
                mf.intensidade,
                mf.nivel_cansaco,
                mf.enviado_em,
                mf.lida
             FROM chat_feedback cf
             JOIN mensagem_feedback mf ON mf.id_chat = cf.id_chat
             WHERE cf.id_professor = ?
             AND cf.id_aluno = ?
             AND mf.remetente = 'aluno'
             ORDER BY mf.enviado_em DESC
             LIMIT 6`,
            [idProfessor, idAluno]
        ).catch(async () => {
            return [[]]
        })

        res.render('visaoperfilaluno', {
            professor: req.session.professor,
            alunoPerfil: alunoRows[0],
            historicoTreinos,
            resumoTreinos: resumoRows[0] || {
                total_treinos: 0,
                tempo_total: 0,
                tempo_medio: 0,
                calorias_total: 0,
                bpm_maximo: 0
            },
            streak: streakRows[0] || {
                streak_atual: 0,
                streak_maximo: 0,
                ultima_atividade: null
            },
            progressoSemana,
            frequenciaSemanas,
            feedbacksAluno,
            erro: req.query.erro || null
        })
    } catch (err) {
        console.error('[visaoperfilaluno]', err)

        res.redirect('/todosalunos?erro=' + encodeURIComponent('Erro ao carregar perfil do aluno.'))
    }
}
