const db = require('../config/pool_conexoes')

exports.enviar = async (req, res) => {
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
}
