const db = require('../config/pool_conexoes')

// =======================
// SUPORTE - LADO DO USUÁRIO (aluno ou professor)
// =======================
// Quem não está logado é levado ao login e volta para /suporte depois.
// O chamado criado aqui aparece na tela de suporte do moderador, e as
// respostas do moderador chegam em "Meus chamados".

const ASSUNTOS = [
    'Dúvida sobre como usar o site',
    'Problema de acesso ou login',
    'Pagamento ou plano',
    'Treinos e vídeos',
    'Professores e feedback',
    'Sugestão ou elogio',
    'Outro assunto'
]

// Descobre quem está logado: aluno ou professor (moderador não abre chamado)
function usuarioDaSessao(req) {
    if (req.session && req.session.aluno) {
        const a = req.session.aluno
        return { tipo: 'aluno', id: a.id, nome: a.nome, email: a.email }
    }

    if (req.session && req.session.professor) {
        const p = req.session.professor
        return { tipo: 'professor', id: p.id, nome: p.nome, email: p.email }
    }

    return null
}

// Filtro SQL "este chamado é desta pessoa"
function filtroDono(usuario) {
    return usuario.tipo === 'aluno'
        ? { sql: 's.id_aluno = ?', valor: usuario.id }
        : { sql: 's.id_professor = ?', valor: usuario.id }
}

async function contarRespostasNovas(usuario) {
    if (!usuario) return 0

    const dono = filtroDono(usuario)

    const [[linha]] = await db.query(
        `SELECT COUNT(*) AS total FROM suporte s WHERE ${dono.sql} AND s.resposta_nao_lida = 1`,
        [dono.valor]
    )

    return Number(linha.total)
}

function renderSuporte(req, res, extra = {}) {
    return contarRespostasNovas(usuarioDaSessao(req))
        .catch(err => {
            console.error('[suporte contador]', err.message)
            return 0
        })
        .then(respostasNovas => {
            const usuario = usuarioDaSessao(req)

            res.render('suporte', {
                usuarioSuporte: usuario,
                respostasNovas,
                assuntos: ASSUNTOS,
                erro: req.query.erro || null,
                sucesso: req.query.sucesso || null,
                ...extra
            })
        })
}

exports.exibir = (req, res) => renderSuporte(req, res)

// POST /suporte  -> abre um chamado
exports.enviar = async (req, res) => {
    const usuario = usuarioDaSessao(req)

    if (!usuario) {
        return res.redirect('/login?next=' + encodeURIComponent('/suporte#chamado'))
    }

    const assunto = String(req.body.assunto || '').trim().slice(0, 150)
    const mensagem = String(req.body.mensagem || '').trim()

    if (!assunto || !ASSUNTOS.includes(assunto)) {
        return renderSuporte(req, res, { erro: 'Escolha o assunto do chamado.', mensagemDigitada: mensagem })
    }

    if (mensagem.length < 10) {
        return renderSuporte(req, res, {
            erro: 'Descreva melhor o que aconteceu (mínimo de 10 caracteres).',
            assuntoEscolhido: assunto,
            mensagemDigitada: mensagem
        })
    }

    if (mensagem.length > 3000) {
        return renderSuporte(req, res, {
            erro: 'A mensagem está muito longa (máximo de 3000 caracteres).',
            assuntoEscolhido: assunto,
            mensagemDigitada: mensagem
        })
    }

    try {
        await db.query(
            `INSERT INTO suporte (id_aluno, id_professor, tipo_usuario, nome, email, assunto, mensagem)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                usuario.tipo === 'aluno' ? usuario.id : null,
                usuario.tipo === 'professor' ? usuario.id : null,
                usuario.tipo,
                String(usuario.nome || '').slice(0, 100),
                String(usuario.email || '').toLowerCase().slice(0, 100),
                assunto,
                mensagem
            ]
        )

        res.redirect('/suporte/chamados?sucesso=' + encodeURIComponent('Chamado enviado! Nossa equipe responde por aqui, em "Meus chamados".'))
    } catch (err) {
        console.error('[suporte enviar]', err)

        renderSuporte(req, res, {
            erro: 'Não foi possível enviar o chamado agora. Tente novamente.',
            assuntoEscolhido: assunto,
            mensagemDigitada: mensagem
        })
    }
}

// GET /suporte/chamados  -> chamados da pessoa com a conversa de cada um
exports.meusChamados = async (req, res) => {
    const usuario = usuarioDaSessao(req)

    if (!usuario) {
        return res.redirect('/login?next=' + encodeURIComponent('/suporte/chamados'))
    }

    const dono = filtroDono(usuario)

    try {
        const [chamados] = await db.query(
            `SELECT s.id_suporte, s.assunto, s.mensagem, s.status, s.resposta_nao_lida, s.criado_em, s.atualizado_em
             FROM suporte s
             WHERE ${dono.sql}
             ORDER BY s.resposta_nao_lida DESC, s.atualizado_em DESC
             LIMIT 100`,
            [dono.valor]
        )

        const ids = chamados.map(c => c.id_suporte)
        const conversas = {}

        if (ids.length > 0) {
            const [mensagens] = await db.query(
                `SELECT id_suporte, autor, nome_autor, mensagem, criado_em
                 FROM suporte_mensagem
                 WHERE id_suporte IN (?)
                 ORDER BY criado_em ASC, id_mensagem ASC`,
                [ids]
            )

            mensagens.forEach(m => {
                if (!conversas[m.id_suporte]) conversas[m.id_suporte] = []
                conversas[m.id_suporte].push(m)
            })
        }

        // Abriu a tela = leu as respostas. O destaque "Nova resposta" desta
        // visita usa o valor lido acima, antes de zerar.
        const novas = chamados.filter(c => Number(c.resposta_nao_lida) === 1).map(c => c.id_suporte)

        if (novas.length > 0) {
            await db.query('UPDATE suporte SET resposta_nao_lida = 0, atualizado_em = atualizado_em WHERE id_suporte IN (?)', [novas])
        }

        res.render('meuschamados', {
            usuarioSuporte: usuario,
            chamados,
            conversas,
            erro: req.query.erro || null,
            sucesso: req.query.sucesso || null
        })
    } catch (err) {
        console.error('[suporte meus chamados]', err)

        res.render('meuschamados', {
            usuarioSuporte: usuario,
            chamados: [],
            conversas: {},
            erro: 'Não foi possível carregar seus chamados agora.',
            sucesso: null
        })
    }
}

// POST /suporte/chamados/:id/responder  -> a pessoa responde dentro do chamado
exports.responder = async (req, res) => {
    const usuario = usuarioDaSessao(req)

    if (!usuario) {
        return res.redirect('/login?next=' + encodeURIComponent('/suporte/chamados'))
    }

    const id = Number(req.params.id)
    const mensagem = String(req.body.mensagem || '').trim()
    const voltar = '/suporte/chamados'

    if (!id || mensagem.length < 2 || mensagem.length > 3000) {
        return res.redirect(voltar + '?erro=' + encodeURIComponent('Escreva uma mensagem de até 3000 caracteres.'))
    }

    const dono = filtroDono(usuario)

    try {
        const [chamados] = await db.query(
            `SELECT s.id_suporte, s.status FROM suporte s WHERE s.id_suporte = ? AND ${dono.sql} LIMIT 1`,
            [id, dono.valor]
        )

        if (chamados.length === 0) {
            return res.redirect(voltar + '?erro=' + encodeURIComponent('Chamado não encontrado.'))
        }

        if (chamados[0].status === 'fechado') {
            return res.redirect(voltar + '?erro=' + encodeURIComponent('Este chamado foi fechado. Abra um novo chamado se precisar de ajuda.'))
        }

        await db.query(
            `INSERT INTO suporte_mensagem (id_suporte, autor, nome_autor, mensagem)
             VALUES (?, 'usuario', ?, ?)`,
            [id, String(usuario.nome || '').slice(0, 100), mensagem]
        )

        // Respondeu um chamado já resolvido: ele volta para a fila da equipe
        await db.query(
            `UPDATE suporte
             SET status = IF(status = 'resolvido', 'aberto', status),
                 atualizado_em = NOW()
             WHERE id_suporte = ?`,
            [id]
        )

        res.redirect(voltar + '?sucesso=' + encodeURIComponent('Mensagem enviada para a equipe.') + '#chamado-' + id)
    } catch (err) {
        console.error('[suporte responder]', err)
        res.redirect(voltar + '?erro=' + encodeURIComponent('Não foi possível enviar a mensagem. Tente novamente.'))
    }
}

exports.ASSUNTOS = ASSUNTOS
