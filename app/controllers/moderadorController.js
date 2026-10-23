const bcrypt = require('bcrypt')
const db = require('../config/pool_conexoes')
const {
    fmt,
    ultimosMeses,
    serieMensal,
    variacaoPct,
    tabelaExiste,
    registrarLog,
    renderizarModerador
} = require('../utils/moderacao')
const { buscarAtividades } = require('../utils/moderacaoAtividades')

// =======================
// LOGIN DO MODERADOR
// =======================

exports.loginForm = (req, res) => {
    res.render('loginmoderador', {
        erro: null,
        sucesso: null
    })
}

exports.login = async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase()
    const senha = req.body.password || req.body.senha || ''

    if (!email || !senha) {
        return res.render('loginmoderador', {
            erro: 'Informe e-mail e senha.',
            sucesso: null
        })
    }

    try {
        const [rows] = await db.query(
            `SELECT id_moderador, nome, email, senha_hash, nivel, foto_perfil, ativo
             FROM moderador
             WHERE email = ?
             LIMIT 1`,
            [email]
        )

        if (rows.length === 0) {
            return res.render('loginmoderador', {
                erro: 'E-mail ou senha inválidos.',
                sucesso: null
            })
        }

        const moderador = rows[0]

        if (Number(moderador.ativo) !== 1) {
            return res.render('loginmoderador', {
                erro: 'Este moderador está desativado.',
                sucesso: null
            })
        }

        const senhaCorreta = await bcrypt.compare(senha, moderador.senha_hash)

        if (!senhaCorreta) {
            return res.render('loginmoderador', {
                erro: 'E-mail ou senha inválidos.',
                sucesso: null
            })
        }

        req.session.moderador = {
            id: moderador.id_moderador,
            nome: moderador.nome,
            email: moderador.email,
            nivel: moderador.nivel,
            foto: moderador.foto_perfil
        }

        res.redirect('/moderador')
    } catch (err) {
        console.error('[loginmoderador]', err)

        res.render('loginmoderador', {
            erro: 'Erro interno ao fazer login de moderador.',
            sucesso: null
        })
    }
}

// =======================
// VISÃO GERAL (DASHBOARD)
// =======================

exports.painel = async (req, res) => {
    // Links antigos do painel (?tipo=alunos&busca=...) continuam funcionando
    if (req.query.tipo === 'alunos' || req.query.tipo === 'professores') {
        return res.redirect('/moderador/' + req.query.tipo + fmt.qs({ busca: req.query.busca }))
    }

    const meses = ultimosMeses(6)

    const [[resumo]] = await db.query(
        `SELECT
            (SELECT COUNT(*) FROM aluno) AS alunos,
            (SELECT COUNT(*) FROM professor) AS professores,
            (SELECT COUNT(*) FROM aluno WHERE criado_em >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS novos_mes,
            (SELECT COUNT(*) FROM aluno
              WHERE criado_em >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
                AND criado_em < DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS novos_mes_anterior,
            (SELECT COUNT(*) FROM aluno WHERE DATE(criado_em) = CURDATE()) AS novos_hoje,
            (SELECT COUNT(*) FROM video WHERE ativo = 1) AS videos,
            (SELECT COUNT(*) FROM sessao_treino WHERE data_treino >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) AS treinos_7d`
    )

    const [planos] = await db.query(
        `SELECT p.id_plano, p.nome, p.valor_mensal, COUNT(a.id_aluno) AS total
         FROM plano p
         LEFT JOIN aluno a ON a.id_plano = p.id_plano
         GROUP BY p.id_plano, p.nome, p.valor_mensal
         ORDER BY p.id_plano`
    )

    const [[receita]] = await db.query(
        `SELECT
            COALESCE(SUM(CASE WHEN DATE_FORMAT(data_pagamento, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
                              THEN valor END), 0) AS mes_atual,
            COALESCE(SUM(CASE WHEN DATE_FORMAT(data_pagamento, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')
                              THEN valor END), 0) AS mes_anterior
         FROM pagamento
         WHERE status = 'aprovado'`
    )

    // Receita recorrente estimada: quanto entra por mês se todo aluno pagante renovar
    const [[recorrente]] = await db.query(
        `SELECT COALESCE(SUM(p.valor_mensal), 0) AS mrr, COUNT(*) AS pagantes
         FROM aluno a
         JOIN plano p ON p.id_plano = a.id_plano
         WHERE p.valor_mensal > 0`
    )

    const [receitaMeses] = await db.query(
        `SELECT DATE_FORMAT(data_pagamento, '%Y-%m') AS mes, SUM(valor) AS total
         FROM pagamento
         WHERE status = 'aprovado'
           AND data_pagamento >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
         GROUP BY DATE_FORMAT(data_pagamento, '%Y-%m')`
    )

    const [cadastroMeses] = await db.query(
        `SELECT DATE_FORMAT(criado_em, '%Y-%m') AS mes, COUNT(*) AS total
         FROM aluno
         WHERE criado_em >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
         GROUP BY DATE_FORMAT(criado_em, '%Y-%m')`
    )

    let suporteAberto = 0

    if (await tabelaExiste('suporte')) {
        const [[linha]] = await db.query(
            `SELECT COUNT(*) AS total FROM suporte WHERE status IN ('aberto', 'em_atendimento')`
        )
        suporteAberto = linha.total
    }

    const [[recusados]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM pagamento
         WHERE status = 'recusado'
           AND data_pagamento >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
    )

    const atividades = await buscarAtividades({ limite: 8 })
    const totalAlunos = Number(resumo.alunos) || 0

    await renderizarModerador(req, res, 'moderador/visaogeral', {
        resumo,
        planos: planos.map(p => ({
            ...p,
            pct: totalAlunos ? Math.round((Number(p.total) / totalAlunos) * 100) : 0
        })),
        receita: {
            mesAtual: Number(receita.mes_atual),
            mesAnterior: Number(receita.mes_anterior),
            variacao: variacaoPct(receita.mes_atual, receita.mes_anterior),
            mrr: Number(recorrente.mrr),
            pagantes: Number(recorrente.pagantes)
        },
        novosVariacao: variacaoPct(resumo.novos_mes, resumo.novos_mes_anterior),
        serieReceita: serieMensal(meses, receitaMeses),
        serieCadastros: serieMensal(meses, cadastroMeses),
        alertas: { suporteAberto, pagamentosRecusados: recusados.total },
        atividades
    }, 'visaogeral')
}

// =======================
// EXCLUIR CADASTRO
// =======================

// Ordem importa: filhos antes dos pais (o banco não tem ON DELETE CASCADE).
const PASSOS_EXCLUIR = {
    aluno: [
        ['mensagem_feedback', `DELETE mf FROM mensagem_feedback mf JOIN chat_feedback cf ON cf.id_chat = mf.id_chat WHERE cf.id_aluno = ?`],
        ['chat_feedback', `DELETE FROM chat_feedback WHERE id_aluno = ?`],
        ['aluno_ficha', `DELETE FROM aluno_ficha WHERE id_aluno = ?`],
        ['sessao_treino', `DELETE FROM sessao_treino WHERE id_aluno = ?`],
        ['progresso_semanal', `DELETE FROM progresso_semanal WHERE id_aluno = ?`],
        ['streak', `DELETE FROM streak WHERE id_aluno = ?`],
        ['desconto', `DELETE FROM desconto WHERE id_aluno = ?`],
        ['pagamento', `DELETE FROM pagamento WHERE id_aluno = ?`],
        ['assinatura', `DELETE FROM assinatura WHERE id_aluno = ?`],
        ['suporte', `DELETE FROM suporte WHERE id_aluno = ?`],
        ['aluno', `DELETE FROM aluno WHERE id_aluno = ?`]
    ],
    professor: [
        ['mensagem_feedback', `DELETE mf FROM mensagem_feedback mf JOIN chat_feedback cf ON cf.id_chat = mf.id_chat WHERE cf.id_professor = ?`],
        ['chat_feedback', `DELETE FROM chat_feedback WHERE id_professor = ?`],
        ['aluno_ficha', `DELETE af FROM aluno_ficha af JOIN ficha_treino ft ON ft.id_ficha = af.id_ficha WHERE ft.id_professor = ?`],
        // os treinos dos alunos continuam existindo, só perdem o vínculo com a ficha apagada
        ['sessao_treino', `UPDATE sessao_treino st JOIN ficha_treino ft ON ft.id_ficha = st.id_ficha SET st.id_ficha = NULL WHERE ft.id_professor = ?`],
        ['exercicio', `DELETE e FROM exercicio e JOIN ficha_treino ft ON ft.id_ficha = e.id_ficha WHERE ft.id_professor = ?`],
        ['video', `DELETE FROM video WHERE id_professor = ?`],
        ['ficha_treino', `DELETE FROM ficha_treino WHERE id_professor = ?`],
        ['professor', `DELETE FROM professor WHERE id_professor = ?`]
    ]
}

exports.excluir = async (req, res) => {
    const tipo = req.params.tipo
    const id = Number(req.params.id)
    const lista = tipo === 'professor' ? 'professores' : 'alunos'

    if (!id || !PASSOS_EXCLUIR[tipo]) {
        return res.redirect('/moderador?erro=' + encodeURIComponent('Cadastro inválido.'))
    }

    const tabelaPrincipal = tipo === 'professor' ? 'professor' : 'aluno'
    const colunaId = tipo === 'professor' ? 'id_professor' : 'id_aluno'

    const [alvo] = await db.query(
        `SELECT nome, email FROM ${tabelaPrincipal} WHERE ${colunaId} = ?`,
        [id]
    )

    if (alvo.length === 0) {
        return res.redirect('/moderador/' + lista + '?erro=' + encodeURIComponent('Cadastro não encontrado.'))
    }

    // Uma única conexão: START TRANSACTION e COMMIT precisam acontecer na mesma conexão do pool,
    // senão a transação não protege nada e um erro no meio deixaria o cadastro pela metade.
    const conexao = await db.getConnection()

    try {
        await conexao.beginTransaction()

        for (const [tabela, sql] of PASSOS_EXCLUIR[tipo]) {
            if (await tabelaExiste(tabela, conexao)) {
                await conexao.query(sql, [id])
            }
        }

        await conexao.commit()
    } catch (err) {
        await conexao.rollback()
        console.error('[moderador excluir]', err)

        return res.redirect('/moderador/' + lista + '?erro=' + encodeURIComponent('Erro ao excluir cadastro: ' + err.message))
    } finally {
        conexao.release()
    }

    await registrarLog(req.session.moderador, 'excluiu cadastro', tipo, id, alvo[0].nome + ' (' + alvo[0].email + ')')

    res.redirect('/moderador/' + lista + '?sucesso=' + encodeURIComponent('Cadastro de ' + alvo[0].nome + ' excluído definitivamente.'))
}

// =======================
// EXPORTAR CSV (alunos e professores)
// =======================

// Células que começam com = + - @ viram fórmula no Excel; o apóstrofo evita isso.
function celulaCsv(valor) {
    let texto = String(valor === null || valor === undefined ? '' : valor)

    if (/^[=+\-@]/.test(texto)) texto = "'" + texto

    return '"' + texto.replace(/"/g, '""') + '"'
}

exports.exportar = async (req, res) => {
    const [alunos] = await db.query(
        `SELECT 'Aluno' AS tipo, a.nome, a.email, COALESCE(p.nome, 'Free') AS plano, a.criado_em
         FROM aluno a
         LEFT JOIN plano p ON p.id_plano = a.id_plano
         ORDER BY a.nome ASC`
    )

    const [professores] = await db.query(
        `SELECT 'Professor' AS tipo, p.nome, p.email, COALESCE(p.cref, '') AS plano, p.criado_em
         FROM professor p
         ORDER BY p.nome ASC`
    )

    const cabecalho = 'tipo,nome,email,plano_ou_cref,criado_em\n'

    const corpo = alunos.concat(professores).map(item => [
        item.tipo,
        item.nome,
        item.email,
        item.plano,
        item.criado_em ? fmt.dataCurta(item.criado_em) : ''
    ].map(celulaCsv).join(',')).join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios-planob.csv"')
    // BOM para o Excel abrir acentos corretamente
    res.send('\uFEFF' + cabecalho + corpo)
}
