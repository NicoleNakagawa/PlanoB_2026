const db = require('../config/pool_conexoes')

// =======================
// TUTORIAL DE PRIMEIRO ACESSO
// =======================
// O tutorial aparece uma única vez para cada conta nova (aluno ou professor).
// Quando a pessoa conclui ou pula, gravamos tutorial_visto = 1 no banco e na
// sessão, e o site passa a funcionar normalmente.

exports.concluir = async (req, res) => {
    try {
        if (req.session && req.session.aluno) {
            await db.query('UPDATE aluno SET tutorial_visto = 1 WHERE id_aluno = ?', [req.session.aluno.id])
            req.session.aluno.tutorial_visto = 1
            return res.json({ ok: true })
        }

        if (req.session && req.session.professor) {
            await db.query('UPDATE professor SET tutorial_visto = 1 WHERE id_professor = ?', [req.session.professor.id])
            req.session.professor.tutorial_visto = 1
            return res.json({ ok: true })
        }

        res.status(401).json({ ok: false })
    } catch (err) {
        console.error('[tutorial concluir]', err)
        res.status(500).json({ ok: false })
    }
}
