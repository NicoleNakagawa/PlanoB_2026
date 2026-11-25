const db = require('../config/pool_conexoes')
const notificacoes = require('../utils/notificacaoAluno')

exports.progresso = async (req, res) => {
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
}

exports.streak = async (req, res) => {
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
}

exports.notificacoes = async (req, res) => {
    try {
        const dados = await notificacoes.listarNotificacoes(req.session.aluno.id)

        res.json({ ok: true, ...dados })
    } catch (err) {
        console.error('[notificacoes aluno]', err.message)

        res.status(500).json({ ok: false, erro: 'Não foi possível carregar as notificações.' })
    }
}

exports.notificacaoLida = async (req, res) => {
    const idNotificacao = Number(req.params.id)

    if (!Number.isInteger(idNotificacao) || idNotificacao <= 0) {
        return res.status(400).json({ ok: false, erro: 'Notificação inválida.' })
    }

    try {
        await notificacoes.marcarLida(req.session.aluno.id, idNotificacao)

        res.json({ ok: true })
    } catch (err) {
        console.error('[notificacao lida]', err.message)

        res.status(500).json({ ok: false, erro: 'Não foi possível atualizar a notificação.' })
    }
}

exports.notificacoesLidas = async (req, res) => {
    try {
        await notificacoes.marcarTodasLidas(req.session.aluno.id)

        res.json({ ok: true })
    } catch (err) {
        console.error('[notificacoes lidas]', err.message)

        res.status(500).json({ ok: false, erro: 'Não foi possível atualizar as notificações.' })
    }
}
