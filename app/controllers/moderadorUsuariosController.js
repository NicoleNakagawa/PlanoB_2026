const db = require('../config/pool_conexoes')
const { paginar, registrarLog, renderizarModerador } = require('../utils/moderacao')
const { descreverFonte } = require('../utils/videos')

const POR_PAGINA = 15

// =======================
// ALUNOS - LISTA
// =======================

const ORDENS_ALUNO = {
    recentes: 'a.id_aluno DESC',
    nome: 'a.nome ASC',
    atividade: 'ultimo_treino IS NULL, ultimo_treino DESC, a.id_aluno DESC'
}

exports.alunos = async (req, res) => {
    const busca = (req.query.busca || '').trim()
    const plano = Number(req.query.plano) || 0
    const ordem = ORDENS_ALUNO[req.query.ordem] ? req.query.ordem : 'recentes'

    const condicoes = []
    const parametros = []

    if (busca) {
        condicoes.push('(a.nome LIKE ? OR a.email LIKE ?)')
        parametros.push('%' + busca + '%', '%' + busca + '%')
    }

    if (plano) {
        condicoes.push('a.id_plano = ?')
        parametros.push(plano)
    }

    const where = condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''

    const [[contagem]] = await db.query(`SELECT COUNT(*) AS total FROM aluno a ${where}`, parametros)
    const paginacao = paginar(contagem.total, req.query.pagina, POR_PAGINA)

    const [alunos] = await db.query(
        `SELECT a.id_aluno, a.nome, a.email, a.foto_perfil, a.id_plano, pl.nome AS plano,
                a.criado_em, a.dados_completos,
                (SELECT s.streak_atual FROM streak s WHERE s.id_aluno = a.id_aluno LIMIT 1) AS streak_atual,
                (SELECT COUNT(*) FROM sessao_treino st WHERE st.id_aluno = a.id_aluno) AS total_treinos,
                (SELECT MAX(st.data_treino) FROM sessao_treino st WHERE st.id_aluno = a.id_aluno) AS ultimo_treino
         FROM aluno a
         JOIN plano pl ON pl.id_plano = a.id_plano
         ${where}
         ORDER BY ${ORDENS_ALUNO[ordem]}
         LIMIT ? OFFSET ?`,
        [...parametros, paginacao.porPagina, paginacao.offset]
    )

    const [planos] = await db.query(
        `SELECT p.id_plano, p.nome, COUNT(a.id_aluno) AS total
         FROM plano p
         LEFT JOIN aluno a ON a.id_plano = p.id_plano
         GROUP BY p.id_plano, p.nome
         ORDER BY p.id_plano`
    )

    await renderizarModerador(req, res, 'moderador/alunos', {
        alunos,
        planos,
        totalGeral: planos.reduce((soma, p) => soma + Number(p.total), 0),
        filtros: { busca, plano: plano || '', ordem },
        paginacao
    }, 'alunos')
}

// =======================
// ALUNO - PERFIL COMPLETO
// =======================

exports.perfilAluno = async (req, res) => {
    const id = Number(req.params.id)

    if (!id) return res.redirect('/moderador/alunos?erro=' + encodeURIComponent('Aluno inválido.'))

    // Colunas escolhidas uma a uma de propósito: o hash da senha nunca chega à tela
    const [alunos] = await db.query(
        `SELECT a.id_aluno, a.nome, a.email, a.cpf, a.cep, a.rua, a.bairro, a.cidade, a.uf,
                a.foto_perfil, a.id_plano, a.objetivo, a.tipo_treino, a.nivel_treino, a.local_treino,
                a.equipamentos, a.dias_semana, a.limitacoes, a.dados_completos, a.criado_em,
                pl.nome AS plano, pl.valor_mensal
         FROM aluno a
         JOIN plano pl ON pl.id_plano = a.id_plano
         WHERE a.id_aluno = ?`,
        [id]
    )

    if (alunos.length === 0) {
        return res.redirect('/moderador/alunos?erro=' + encodeURIComponent('Aluno não encontrado.'))
    }

    const [professores] = await db.query(
        `SELECT pr.id_professor, pr.nome, pr.email, pr.cref, ft.nome_ficha, af.data_inicio
         FROM aluno_ficha af
         JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
         JOIN professor pr ON pr.id_professor = ft.id_professor
         WHERE af.id_aluno = ? AND af.ativo = 1
         ORDER BY af.atribuido_em DESC
         LIMIT 1`,
        [id]
    )

    const [assinaturas] = await db.query(
        `SELECT s.id_assinatura, pl.nome AS plano, s.status, s.valor_cobrado, s.data_inicio, s.data_fim, s.periodicidade
         FROM assinatura s
         JOIN plano pl ON pl.id_plano = s.id_plano
         WHERE s.id_aluno = ?
         ORDER BY s.id_assinatura DESC
         LIMIT 10`,
        [id]
    )

    const [pagamentos] = await db.query(
        `SELECT id_pagamento, valor, status, metodo, bandeira, ultimos_4, data_pagamento
         FROM pagamento
         WHERE id_aluno = ?
         ORDER BY data_pagamento DESC
         LIMIT 10`,
        [id]
    )

    const [[totalPago]] = await db.query(
        `SELECT COALESCE(SUM(valor), 0) AS total FROM pagamento WHERE id_aluno = ? AND status = 'aprovado'`,
        [id]
    )

    const [streaks] = await db.query(
        `SELECT streak_atual, streak_maximo, ultima_atividade FROM streak WHERE id_aluno = ? LIMIT 1`,
        [id]
    )

    const [descontos] = await db.query(
        `SELECT codigo, percentual, dias_streak, usado, validade
         FROM desconto WHERE id_aluno = ? ORDER BY dias_streak`,
        [id]
    )

    const [[treinos]] = await db.query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(duracao_min), 0) AS minutos,
                COALESCE(SUM(calorias), 0) AS calorias, MAX(data_treino) AS ultimo
         FROM sessao_treino WHERE id_aluno = ?`,
        [id]
    )

    const [sessoes] = await db.query(
        `SELECT st.data_treino, st.duracao_min, st.calorias, st.observacao, ft.nome_ficha
         FROM sessao_treino st
         LEFT JOIN ficha_treino ft ON ft.id_ficha = st.id_ficha
         WHERE st.id_aluno = ?
         ORDER BY st.data_treino DESC, st.id_sessao DESC
         LIMIT 8`,
        [id]
    )

    const [semanas] = await db.query(
        `SELECT semana_inicio, dias_treinados, meta_dias, tempo_total_min
         FROM progresso_semanal
         WHERE id_aluno = ?
         ORDER BY semana_inicio DESC
         LIMIT 8`,
        [id]
    )

    const [[feedback]] = await db.query(
        `SELECT COUNT(*) AS total, MAX(mf.enviado_em) AS ultima
         FROM mensagem_feedback mf
         JOIN chat_feedback cf ON cf.id_chat = mf.id_chat
         WHERE cf.id_aluno = ? AND mf.remetente = 'aluno'`,
        [id]
    )

    const [chamados] = await db.query(
        `SELECT id_suporte, assunto, status, criado_em
         FROM suporte WHERE id_aluno = ? ORDER BY criado_em DESC LIMIT 5`,
        [id]
    )

    const [todosPlanos] = await db.query('SELECT id_plano, nome, valor_mensal FROM plano ORDER BY id_plano')

    await renderizarModerador(req, res, 'moderador/aluno-perfil', {
        aluno: alunos[0],
        professor: professores[0] || null,
        assinaturas,
        pagamentos,
        totalPago: Number(totalPago.total),
        streak: streaks[0] || null,
        descontos,
        treinos,
        sessoes,
        semanas: semanas.reverse(),
        feedback,
        chamados,
        todosPlanos
    }, 'alunos')
}

// =======================
// ALUNO - ALTERAR PLANO (ajuste manual)
// =======================

exports.alterarPlano = async (req, res) => {
    const id = Number(req.params.id)
    const novoPlano = Number(req.body.id_plano)
    const voltar = '/moderador/alunos/' + id

    if (!id || !novoPlano) {
        return res.redirect('/moderador/alunos?erro=' + encodeURIComponent('Dados inválidos.'))
    }

    const [planos] = await db.query('SELECT id_plano, nome FROM plano WHERE id_plano = ?', [novoPlano])
    const [alunos] = await db.query(
        `SELECT a.nome, pl.nome AS plano_atual
         FROM aluno a JOIN plano pl ON pl.id_plano = a.id_plano
         WHERE a.id_aluno = ?`,
        [id]
    )

    if (planos.length === 0 || alunos.length === 0) {
        return res.redirect('/moderador/alunos?erro=' + encodeURIComponent('Aluno ou plano não encontrado.'))
    }

    await db.query('UPDATE aluno SET id_plano = ? WHERE id_aluno = ?', [novoPlano, id])

    await registrarLog(
        req.session.moderador,
        'alterou plano',
        'aluno',
        id,
        alunos[0].nome + ': ' + alunos[0].plano_atual + ' → ' + planos[0].nome
    )

    res.redirect(voltar + '?sucesso=' + encodeURIComponent('Plano alterado para ' + planos[0].nome + '. Nenhuma cobrança foi gerada.'))
}

// =======================
// PROFESSORES - LISTA
// =======================

const ORDENS_PROFESSOR = {
    recentes: 'pr.id_professor DESC',
    nome: 'pr.nome ASC',
    alunos: 'alunos DESC, pr.nome ASC',
    videos: 'videos DESC, pr.nome ASC'
}

exports.professores = async (req, res) => {
    const busca = (req.query.busca || '').trim()
    const ordem = ORDENS_PROFESSOR[req.query.ordem] ? req.query.ordem : 'recentes'

    const parametros = []
    let where = ''

    if (busca) {
        where = 'WHERE (pr.nome LIKE ? OR pr.email LIKE ? OR pr.cref LIKE ?)'
        parametros.push('%' + busca + '%', '%' + busca + '%', '%' + busca + '%')
    }

    const [[contagem]] = await db.query(`SELECT COUNT(*) AS total FROM professor pr ${where}`, parametros)
    const paginacao = paginar(contagem.total, req.query.pagina, POR_PAGINA)

    const [professores] = await db.query(
        `SELECT pr.id_professor, pr.nome, pr.email, pr.cref, pr.foto_perfil, pr.criado_em,
                (SELECT COUNT(*) FROM video v WHERE v.id_professor = pr.id_professor AND v.ativo = 1) AS videos,
                (SELECT COUNT(DISTINCT af.id_aluno)
                   FROM aluno_ficha af
                   JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
                  WHERE ft.id_professor = pr.id_professor AND af.ativo = 1) AS alunos,
                (SELECT COUNT(*) FROM ficha_treino ft WHERE ft.id_professor = pr.id_professor AND ft.ativo = 1) AS fichas
         FROM professor pr
         ${where}
         ORDER BY ${ORDENS_PROFESSOR[ordem]}
         LIMIT ? OFFSET ?`,
        [...parametros, paginacao.porPagina, paginacao.offset]
    )

    await renderizarModerador(req, res, 'moderador/professores', {
        professores,
        filtros: { busca, ordem },
        paginacao
    }, 'professores')
}

// =======================
// PROFESSOR - PERFIL COMPLETO
// =======================

exports.perfilProfessor = async (req, res) => {
    const id = Number(req.params.id)

    if (!id) return res.redirect('/moderador/professores?erro=' + encodeURIComponent('Professor inválido.'))

    const [professores] = await db.query(
        `SELECT id_professor, nome, email, cref, foto_perfil, criado_em
         FROM professor WHERE id_professor = ?`,
        [id]
    )

    if (professores.length === 0) {
        return res.redirect('/moderador/professores?erro=' + encodeURIComponent('Professor não encontrado.'))
    }

    const [[numeros]] = await db.query(
        `SELECT
            (SELECT COUNT(*) FROM video WHERE id_professor = ? AND ativo = 1) AS videos_ativos,
            (SELECT COUNT(*) FROM video WHERE id_professor = ? AND ativo = 0) AS videos_ocultos,
            (SELECT COUNT(*) FROM ficha_treino WHERE id_professor = ? AND ativo = 1) AS fichas,
            (SELECT COUNT(DISTINCT af.id_aluno)
               FROM aluno_ficha af
               JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
              WHERE ft.id_professor = ? AND af.ativo = 1) AS alunos,
            (SELECT COUNT(*)
               FROM mensagem_feedback mf
               JOIN chat_feedback cf ON cf.id_chat = mf.id_chat
              WHERE cf.id_professor = ? AND mf.remetente = 'professor') AS feedbacks_respondidos`,
        [id, id, id, id, id]
    )

    const [videos] = await db.query(
        `SELECT id_video, titulo, categoria, nivel, exclusivo, ativo, link_video, criado_em
         FROM video WHERE id_professor = ?
         ORDER BY criado_em DESC
         LIMIT 10`,
        [id]
    )

    const [alunosVinculados] = await db.query(
        `SELECT a.id_aluno, a.nome, a.email, pl.nome AS plano, MIN(af.data_inicio) AS desde
         FROM aluno_ficha af
         JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha
         JOIN aluno a ON a.id_aluno = af.id_aluno
         JOIN plano pl ON pl.id_plano = a.id_plano
         WHERE ft.id_professor = ? AND af.ativo = 1
         GROUP BY a.id_aluno, a.nome, a.email, pl.nome
         ORDER BY a.nome ASC
         LIMIT 20`,
        [id]
    )

    await renderizarModerador(req, res, 'moderador/professor-perfil', {
        professor: professores[0],
        numeros,
        videos: videos.map(v => ({ ...v, fonte: descreverFonte(v.link_video).tipo })),
        alunosVinculados
    }, 'professores')
}
