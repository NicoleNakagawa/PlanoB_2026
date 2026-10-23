const db = require('../config/pool_conexoes')
const {
    fmt,
    paginar,
    ultimosMeses,
    serieMensal,
    variacaoPct,
    renderizarModerador
} = require('../utils/moderacao')

const POR_PAGINA = 15

const STATUS = ['aprovado', 'recusado', 'pendente', 'estornado']

const PERIODOS = {
    mes: { rotulo: 'Este mês', sql: `pg.data_pagamento >= DATE_FORMAT(CURDATE(), '%Y-%m-01')` },
    '30d': { rotulo: 'Últimos 30 dias', sql: `pg.data_pagamento >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)` },
    '90d': { rotulo: 'Últimos 90 dias', sql: `pg.data_pagamento >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)` },
    ano: { rotulo: 'Este ano', sql: `pg.data_pagamento >= DATE_FORMAT(CURDATE(), '%Y-01-01')` },
    tudo: { rotulo: 'Todo o período', sql: '' }
}

// Lê os filtros da URL e monta o WHERE (usado na tela e no CSV, para os dois baterem)
function montarFiltros(query) {
    const status = STATUS.includes(query.status) ? query.status : ''
    const plano = Number(query.plano) || 0
    const periodo = PERIODOS[query.periodo] ? query.periodo : 'tudo'

    const condicoes = []
    const parametros = []

    if (status) {
        condicoes.push('pg.status = ?')
        parametros.push(status)
    }

    if (plano) {
        condicoes.push('s.id_plano = ?')
        parametros.push(plano)
    }

    if (PERIODOS[periodo].sql) {
        condicoes.push(PERIODOS[periodo].sql)
    }

    return {
        status,
        plano: plano || '',
        periodo,
        where: condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : '',
        parametros
    }
}

const FROM_PAGAMENTOS = `
    FROM pagamento pg
    JOIN aluno a ON a.id_aluno = pg.id_aluno
    JOIN assinatura s ON s.id_assinatura = pg.id_assinatura
    JOIN plano pl ON pl.id_plano = s.id_plano`

// =======================
// TELA FINANCEIRO
// =======================

exports.financeiro = async (req, res) => {
    const filtros = montarFiltros(req.query)
    const meses = ultimosMeses(6)

    const [[kpis]] = await db.query(
        `SELECT
            COALESCE(SUM(CASE WHEN DATE_FORMAT(data_pagamento, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
                              THEN valor END), 0) AS mes_atual,
            COALESCE(SUM(CASE WHEN DATE_FORMAT(data_pagamento, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')
                              THEN valor END), 0) AS mes_anterior,
            COALESCE(SUM(valor), 0) AS total,
            COUNT(*) AS aprovados
         FROM pagamento
         WHERE status = 'aprovado'`
    )

    const [[recorrente]] = await db.query(
        `SELECT COALESCE(SUM(p.valor_mensal), 0) AS mrr, COUNT(*) AS pagantes
         FROM aluno a
         JOIN plano p ON p.id_plano = a.id_plano
         WHERE p.valor_mensal > 0`
    )

    const [[alunos]] = await db.query('SELECT COUNT(*) AS total FROM aluno')

    const [[statusMes]] = await db.query(
        `SELECT
            COALESCE(SUM(status = 'recusado'), 0) AS recusados,
            COALESCE(SUM(status = 'pendente'), 0) AS pendentes,
            COALESCE(SUM(status = 'estornado'), 0) AS estornados
         FROM pagamento
         WHERE data_pagamento >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
    )

    const [serie] = await db.query(
        `SELECT DATE_FORMAT(data_pagamento, '%Y-%m') AS mes, SUM(valor) AS total
         FROM pagamento
         WHERE status = 'aprovado'
           AND data_pagamento >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
         GROUP BY DATE_FORMAT(data_pagamento, '%Y-%m')`
    )

    const [porPlano] = await db.query(
        `SELECT pl.id_plano, pl.nome, COUNT(*) AS qtd, COALESCE(SUM(pg.valor), 0) AS total
         FROM pagamento pg
         JOIN assinatura s ON s.id_assinatura = pg.id_assinatura
         JOIN plano pl ON pl.id_plano = s.id_plano
         WHERE pg.status = 'aprovado'
         GROUP BY pl.id_plano, pl.nome
         ORDER BY total DESC`
    )

    const [[contagem]] = await db.query(
        `SELECT COUNT(*) AS total ${FROM_PAGAMENTOS} ${filtros.where}`,
        filtros.parametros
    )

    const paginacao = paginar(contagem.total, req.query.pagina, POR_PAGINA)

    const [pagamentos] = await db.query(
        `SELECT pg.id_pagamento, pg.valor, pg.status, pg.metodo, pg.bandeira, pg.ultimos_4,
                pg.data_pagamento, a.id_aluno, a.nome AS aluno, pl.nome AS plano
         ${FROM_PAGAMENTOS}
         ${filtros.where}
         ORDER BY pg.data_pagamento DESC, pg.id_pagamento DESC
         LIMIT ? OFFSET ?`,
        [...filtros.parametros, paginacao.porPagina, paginacao.offset]
    )

    const [planos] = await db.query('SELECT id_plano, nome FROM plano ORDER BY id_plano')

    const totalReceita = Number(kpis.total)

    await renderizarModerador(req, res, 'moderador/financeiro', {
        kpis: {
            mesAtual: Number(kpis.mes_atual),
            mesAnterior: Number(kpis.mes_anterior),
            variacao: variacaoPct(kpis.mes_atual, kpis.mes_anterior),
            total: totalReceita,
            ticketMedio: kpis.aprovados ? totalReceita / Number(kpis.aprovados) : 0,
            aprovados: Number(kpis.aprovados),
            mrr: Number(recorrente.mrr),
            pagantes: Number(recorrente.pagantes),
            conversao: alunos.total ? Math.round((Number(recorrente.pagantes) / Number(alunos.total)) * 100) : 0,
            recusados: Number(statusMes.recusados),
            pendentes: Number(statusMes.pendentes),
            estornados: Number(statusMes.estornados)
        },
        serie: serieMensal(meses, serie),
        porPlano: porPlano.map(p => ({
            ...p,
            pct: totalReceita ? Math.round((Number(p.total) / totalReceita) * 100) : 0
        })),
        pagamentos,
        planos,
        periodos: PERIODOS,
        statusLista: STATUS,
        filtros: { status: filtros.status, plano: filtros.plano, periodo: filtros.periodo },
        paginacao
    }, 'financeiro')
}

// =======================
// EXPORTAR PAGAMENTOS (CSV)
// =======================

function celulaCsv(valor) {
    let texto = String(valor === null || valor === undefined ? '' : valor)

    if (/^[=+\-@]/.test(texto)) texto = "'" + texto

    return '"' + texto.replace(/"/g, '""') + '"'
}

exports.exportar = async (req, res) => {
    const filtros = montarFiltros(req.query)

    const [linhas] = await db.query(
        `SELECT pg.id_pagamento, pg.data_pagamento, a.nome AS aluno, a.email, pl.nome AS plano,
                pg.valor, pg.status, pg.metodo, pg.bandeira, pg.ultimos_4
         ${FROM_PAGAMENTOS}
         ${filtros.where}
         ORDER BY pg.data_pagamento DESC, pg.id_pagamento DESC`,
        filtros.parametros
    )

    const cabecalho = 'id,data,aluno,email,plano,valor,status,metodo,bandeira,final_cartao\n'

    const corpo = linhas.map(l => [
        l.id_pagamento,
        fmt.dataHora(l.data_pagamento),
        l.aluno,
        l.email,
        l.plano,
        Number(l.valor).toFixed(2).replace('.', ','),
        l.status,
        l.metodo,
        l.bandeira || '',
        l.ultimos_4 || ''
    ].map(celulaCsv).join(',')).join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="pagamentos-planob.csv"')
    res.send('\uFEFF' + cabecalho + corpo)
}
