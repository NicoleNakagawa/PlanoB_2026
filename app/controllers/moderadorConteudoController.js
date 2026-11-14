const path = require('path')
const fs = require('fs')
const db = require('../config/pool_conexoes')
const {
    paginar,
    destinoSeguro,
    registrarLog,
    renderizarModerador
} = require('../utils/moderacao')
const { buscarAtividades, TIPOS } = require('../utils/moderacaoAtividades')
const { descreverFonte } = require('../utils/videos')

const POR_PAGINA = 12

// =======================
// VÍDEOS (MODERAÇÃO)
// =======================

exports.videos = async (req, res) => {
    const busca = (req.query.busca || '').trim()
    const status = ['ativo', 'oculto'].includes(req.query.status) ? req.query.status : ''

    const condicoes = []
    const parametros = []

    if (busca) {
        condicoes.push('(v.titulo LIKE ? OR p.nome LIKE ?)')
        parametros.push('%' + busca + '%', '%' + busca + '%')
    }

    if (status) {
        condicoes.push('v.ativo = ?')
        parametros.push(status === 'ativo' ? 1 : 0)
    }

    const where = condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''

    const [[contagem]] = await db.query(
        `SELECT COUNT(*) AS total FROM video v JOIN professor p ON p.id_professor = v.id_professor ${where}`,
        parametros
    )

    const paginacao = paginar(contagem.total, req.query.pagina, POR_PAGINA)

    const [videos] = await db.query(
        `SELECT v.id_video, v.titulo, v.categoria, v.nivel, v.exclusivo, v.id_plano_min, v.ativo,
                v.link_video, v.thumbnail, v.criado_em, p.id_professor, p.nome AS professor
         FROM video v
         JOIN professor p ON p.id_professor = v.id_professor
         ${where}
         ORDER BY v.criado_em DESC
         LIMIT ? OFFSET ?`,
        [...parametros, paginacao.porPagina, paginacao.offset]
    )

    const [[resumo]] = await db.query(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(ativo = 1), 0) AS ativos,
                COALESCE(SUM(ativo = 0), 0) AS ocultos
         FROM video`
    )

    await renderizarModerador(req, res, 'moderador/videos', {
        videos: videos.map(v => {
            const fonte = descreverFonte(v.link_video)
            return { ...v, fonte: fonte.tipo, capa: v.thumbnail || fonte.miniatura }
        }),
        resumo: { total: Number(resumo.total), ativos: Number(resumo.ativos), ocultos: Number(resumo.ocultos) },
        filtros: { busca, status },
        paginacao
    }, 'videos')
}

exports.alterarStatusVideo = async (req, res) => {
    const id = Number(req.params.id)
    const ativo = req.body.ativo === '1' ? 1 : 0
    const voltar = destinoSeguro(req.body.voltar, '/moderador/videos')

    if (!id) return res.redirect(voltar)

    const [videos] = await db.query('SELECT titulo FROM video WHERE id_video = ?', [id])

    if (videos.length === 0) {
        return res.redirect('/moderador/videos?erro=' + encodeURIComponent('Vídeo não encontrado.'))
    }

    await db.query('UPDATE video SET ativo = ? WHERE id_video = ?', [ativo, id])

    await registrarLog(req.session.moderador, ativo ? 'reativou vídeo' : 'ocultou vídeo', 'video', id, videos[0].titulo)

    const separador = voltar.includes('?') ? '&' : '?'

    res.redirect(voltar + separador + 'sucesso=' + encodeURIComponent(
        ativo ? 'Vídeo reativado.' : 'Vídeo ocultado. Ele deixa de aparecer para os alunos.'
    ))
}

// Exclui o vídeo de vez (diferente de ocultar, que só tira dos alunos).
// Se o vídeo for um arquivo enviado para o servidor, o arquivo também é apagado.
exports.excluirVideo = async (req, res) => {
    const id = Number(req.params.id)
    const voltar = destinoSeguro((req.body || {}).voltar, '/moderador/videos')
    const separador = voltar.includes('?') ? '&' : '?'

    if (!id) return res.redirect(voltar)

    const [videos] = await db.query('SELECT titulo, link_video, thumbnail FROM video WHERE id_video = ?', [id])

    if (videos.length === 0) {
        return res.redirect('/moderador/videos?erro=' + encodeURIComponent('Vídeo não encontrado.'))
    }

    try {
        await db.query('DELETE FROM video WHERE id_video = ?', [id])
    } catch (err) {
        console.error('[moderador excluir video]', err)

        return res.redirect(voltar + separador + 'erro=' + encodeURIComponent(
            'Não foi possível excluir o vídeo. Você pode ocultá-lo para os alunos.'
        ))
    }

    // Apaga o arquivo físico só se estiver dentro de public/uploads (nunca fora dela)
    const pastaUploads = path.join(__dirname, '..', 'public', 'uploads')

    for (const caminho of [videos[0].link_video, videos[0].thumbnail]) {
        if (!caminho || !String(caminho).startsWith('/uploads/')) continue

        const arquivo = path.join(pastaUploads, path.normalize(String(caminho).slice('/uploads/'.length)))

        if (!arquivo.startsWith(pastaUploads + path.sep)) continue

        fs.unlink(arquivo, () => {})
    }

    await registrarLog(req.session.moderador, 'excluiu vídeo', 'video', id, videos[0].titulo)

    res.redirect(voltar + separador + 'sucesso=' + encodeURIComponent('Vídeo excluído definitivamente.'))
}

// =======================
// SUPORTE
// =======================

const STATUS_SUPORTE = ['aberto', 'em_atendimento', 'resolvido', 'fechado']

exports.suporte = async (req, res) => {
    const status = STATUS_SUPORTE.includes(req.query.status) ? req.query.status : ''
    const parametros = []
    let where = ''

    if (status) {
        where = 'WHERE s.status = ?'
        parametros.push(status)
    }

    const [[contagem]] = await db.query(`SELECT COUNT(*) AS total FROM suporte s ${where}`, parametros)
    const paginacao = paginar(contagem.total, req.query.pagina, POR_PAGINA)

    const [chamados] = await db.query(
        `SELECT s.id_suporte, s.id_aluno, s.id_professor, s.tipo_usuario, s.nome, s.email, s.assunto,
                s.mensagem, s.status, s.criado_em, s.atualizado_em,
                (SELECT COUNT(*) FROM suporte_mensagem m WHERE m.id_suporte = s.id_suporte) AS total_mensagens,
                (SELECT m.autor FROM suporte_mensagem m WHERE m.id_suporte = s.id_suporte
                 ORDER BY m.criado_em DESC, m.id_mensagem DESC LIMIT 1) AS ultimo_autor
         FROM suporte s
         ${where}
         ORDER BY FIELD(s.status, 'aberto', 'em_atendimento', 'resolvido', 'fechado'), s.atualizado_em DESC
         LIMIT ? OFFSET ?`,
        [...parametros, paginacao.porPagina, paginacao.offset]
    )

    const [porStatus] = await db.query('SELECT status, COUNT(*) AS total FROM suporte GROUP BY status')

    const contagens = Object.fromEntries(STATUS_SUPORTE.map(s => [s, 0]))
    porStatus.forEach(linha => { contagens[linha.status] = Number(linha.total) })

    await renderizarModerador(req, res, 'moderador/suporte', {
        chamados,
        contagens,
        statusLista: STATUS_SUPORTE,
        filtros: { status },
        paginacao
    }, 'suporte')
}

// Tela de um chamado: quem enviou, a conversa inteira e o formulário de resposta
exports.chamado = async (req, res) => {
    const id = Number(req.params.id)

    if (!id) return res.redirect('/moderador/suporte')

    const [chamados] = await db.query(
        `SELECT s.id_suporte, s.id_aluno, s.id_professor, s.tipo_usuario, s.nome, s.email, s.assunto,
                s.mensagem, s.status, s.criado_em, s.atualizado_em,
                a.id_plano AS plano_aluno, pl.nome AS nome_plano, p.cref AS cref_professor
         FROM suporte s
         LEFT JOIN aluno a ON a.id_aluno = s.id_aluno
         LEFT JOIN plano pl ON pl.id_plano = a.id_plano
         LEFT JOIN professor p ON p.id_professor = s.id_professor
         WHERE s.id_suporte = ?
         LIMIT 1`,
        [id]
    )

    if (chamados.length === 0) {
        return res.redirect('/moderador/suporte?erro=' + encodeURIComponent('Chamado não encontrado.'))
    }

    const [mensagens] = await db.query(
        `SELECT autor, nome_autor, mensagem, criado_em
         FROM suporte_mensagem
         WHERE id_suporte = ?
         ORDER BY criado_em ASC, id_mensagem ASC`,
        [id]
    )

    await renderizarModerador(req, res, 'moderador/suporte-chamado', {
        chamado: chamados[0],
        mensagens,
        statusLista: STATUS_SUPORTE
    }, 'suporte')
}

// O moderador responde: a resposta aparece para o usuário em "Meus chamados"
exports.responderChamado = async (req, res) => {
    const id = Number(req.params.id)
    const mensagem = String(req.body.mensagem || '').trim()
    const marcarResolvido = req.body.resolver === '1'
    const voltar = '/moderador/suporte/' + id

    if (!id) return res.redirect('/moderador/suporte')

    if (mensagem.length < 2 || mensagem.length > 3000) {
        return res.redirect(voltar + '?erro=' + encodeURIComponent('Escreva uma resposta de até 3000 caracteres.'))
    }

    const [chamados] = await db.query('SELECT id_suporte, status, assunto FROM suporte WHERE id_suporte = ? LIMIT 1', [id])

    if (chamados.length === 0) {
        return res.redirect('/moderador/suporte?erro=' + encodeURIComponent('Chamado não encontrado.'))
    }

    const novoStatus = marcarResolvido
        ? 'resolvido'
        : (chamados[0].status === 'aberto' || chamados[0].status === 'resolvido' ? 'em_atendimento' : chamados[0].status)

    await db.query(
        `INSERT INTO suporte_mensagem (id_suporte, autor, id_moderador, nome_autor, mensagem)
         VALUES (?, 'moderador', ?, ?, ?)`,
        [id, req.session.moderador.id || null, String(req.session.moderador.nome || 'Equipe PlanoB').slice(0, 100), mensagem]
    )

    await db.query(
        `UPDATE suporte
         SET status = ?, resposta_nao_lida = 1, atualizado_em = NOW()
         WHERE id_suporte = ?`,
        [novoStatus, id]
    )

    await registrarLog(req.session.moderador, 'respondeu chamado', 'suporte', id, chamados[0].assunto || 'Sem assunto')

    res.redirect(voltar + '?sucesso=' + encodeURIComponent(
        marcarResolvido ? 'Resposta enviada e chamado marcado como resolvido.' : 'Resposta enviada ao usuário.'
    ))
}

exports.alterarStatusSuporte = async (req, res) => {
    const id = Number(req.params.id)
    const status = req.body.status
    const voltar = destinoSeguro(req.body.voltar, '/moderador/suporte')

    if (!id || !STATUS_SUPORTE.includes(status)) {
        return res.redirect('/moderador/suporte?erro=' + encodeURIComponent('Dados inválidos.'))
    }

    const [resultado] = await db.query('UPDATE suporte SET status = ? WHERE id_suporte = ?', [status, id])

    if (resultado.affectedRows === 0) {
        return res.redirect('/moderador/suporte?erro=' + encodeURIComponent('Chamado não encontrado.'))
    }

    await registrarLog(req.session.moderador, 'mudou status do chamado', 'suporte', id, 'Novo status: ' + status)

    const separador = voltar.includes('?') ? '&' : '?'

    res.redirect(voltar + separador + 'sucesso=' + encodeURIComponent('Status do chamado atualizado.'))
}

// =======================
// ATIVIDADES (LINHA DO TEMPO)
// =======================

exports.atividades = async (req, res) => {
    const tipo = TIPOS.includes(req.query.tipo) ? req.query.tipo : ''
    const atividades = await buscarAtividades({ tipo, limite: 60 })

    await renderizarModerador(req, res, 'moderador/atividades', {
        atividades,
        tipos: TIPOS,
        filtros: { tipo }
    }, 'atividades')
}
