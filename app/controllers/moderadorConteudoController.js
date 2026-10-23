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
        `SELECT s.id_suporte, s.id_aluno, s.nome, s.email, s.assunto, s.mensagem, s.status, s.criado_em
         FROM suporte s
         ${where}
         ORDER BY FIELD(s.status, 'aberto', 'em_atendimento', 'resolvido', 'fechado'), s.criado_em DESC
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
