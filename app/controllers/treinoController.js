const db = require('../config/pool_conexoes')
const { redirecionarPainelAluno } = require('../utils/redirecionamentos')

exports.registrar = async (req, res) => {
    const idAluno = req.session.aluno.id
    const duracaoMin = Number(req.body.duracao_min) || 0
    const observacao = req.body.observacao || 'Exercício concluído.'
    // Só aceita caminho do próprio site (evita redirecionar o aluno para outro endereço)
    const destinoPedido = String(req.body.redirect_to || '')
    const destinoSeguro = destinoPedido.startsWith('/') && !destinoPedido.startsWith('//') && !destinoPedido.includes('\\')
    const redirectTo = destinoSeguro ? destinoPedido : redirecionarPainelAluno(req.session.aluno.id_plano)

    try {
        let idFicha = null

        const [fichaRows] = await db.query(
            `SELECT af.id_ficha
             FROM aluno_ficha af
             WHERE af.id_aluno = ?
             AND af.ativo = 1
             ORDER BY af.atribuido_em DESC
             LIMIT 1`,
            [idAluno]
        ).catch(async () => {
            return [[]]
        })

        if (fichaRows.length > 0) {
            idFicha = fichaRows[0].id_ficha
        }

        // Exercício do treino montado pelo professor: confere que ele é mesmo do aluno,
        // usa a ficha certa e guarda que foi concluído hoje (alimenta o "treino do dia").
        const idExercicio = Number(req.body.id_exercicio)

        if (Number.isInteger(idExercicio) && idExercicio > 0) {
            try {
                const [exercicioRows] = await db.query(
                    `SELECT e.id_exercicio, e.id_ficha, e.dia_treino
                     FROM exercicio e
                     JOIN aluno_ficha af ON af.id_ficha = e.id_ficha
                     WHERE e.id_exercicio = ?
                     AND af.id_aluno = ?
                     AND af.ativo = 1
                     LIMIT 1`,
                    [idExercicio, idAluno]
                )

                if (exercicioRows.length > 0) {
                    const exercicio = exercicioRows[0]

                    idFicha = exercicio.id_ficha

                    await db.query(
                        `INSERT INTO exercicio_concluido (id_aluno, id_exercicio, id_ficha, dia_treino, data_conclusao)
                         VALUES (?, ?, ?, ?, CURDATE())
                         ON DUPLICATE KEY UPDATE concluido_em = NOW()`,
                        [idAluno, exercicio.id_exercicio, exercicio.id_ficha, exercicio.dia_treino || 'A']
                    )
                }
            } catch (err) {
                console.error('[registrar treino] exercício do professor:', err.message)
            }
        }

        await db.query(
            `INSERT INTO sessao_treino
             (id_aluno, id_ficha, data_treino, duracao_min, calorias, bpm_maximo, observacao)
             VALUES (?, ?, CURDATE(), ?, 0, 0, ?)`,
            [idAluno, idFicha, duracaoMin, observacao]
        )

        const [streakRows] = await db.query(
            `SELECT id_streak, streak_atual, streak_maximo, ultima_atividade
             FROM streak
             WHERE id_aluno = ?
             LIMIT 1`,
            [idAluno]
        ).catch(async () => {
            return [[]]
        })

        if (streakRows.length > 0) {
            const streak = streakRows[0]
            const ultimaAtividade = streak.ultima_atividade ? new Date(streak.ultima_atividade) : null
            const hoje = new Date()
            hoje.setHours(0, 0, 0, 0)

            let novoStreak = Number(streak.streak_atual) || 0

            if (!ultimaAtividade) {
                novoStreak = 1
            } else {
                const ultima = new Date(ultimaAtividade)
                ultima.setHours(0, 0, 0, 0)

                const diferencaDias = Math.round((hoje - ultima) / (1000 * 60 * 60 * 24))

                if (diferencaDias === 0) {
                    novoStreak = Number(streak.streak_atual) || 1
                } else if (diferencaDias === 1) {
                    novoStreak = (Number(streak.streak_atual) || 0) + 1
                } else {
                    novoStreak = 1
                }
            }

            const novoMaximo = Math.max(novoStreak, Number(streak.streak_maximo) || 0)

            await db.query(
                `UPDATE streak
                 SET streak_atual = ?,
                     streak_maximo = ?,
                     ultima_atividade = CURDATE()
                 WHERE id_aluno = ?`,
                [novoStreak, novoMaximo, idAluno]
            )
        } else {
            await db.query(
                `INSERT INTO streak
                 (id_aluno, streak_atual, streak_maximo, ultima_atividade)
                 VALUES (?, 1, 1, CURDATE())`,
                [idAluno]
            ).catch(async () => {})
        }

        return res.redirect(redirectTo)
    } catch (err) {
        console.error('[registrar treino]', err)

        return res.redirect(redirectTo)
    }
}
