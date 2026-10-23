const db = require('../config/pool_conexoes')
const { tabelaExiste } = require('./moderacao')

// Cada tipo de atividade é uma consulta que devolve sempre as mesmas colunas:
// tipo, titulo, detalhe, quando, ref_id
const CONSULTAS = {
    cadastro_aluno: `
        SELECT 'cadastro_aluno' AS tipo, a.nome AS titulo, a.email AS detalhe,
               a.criado_em AS quando, a.id_aluno AS ref_id
        FROM aluno a
        ORDER BY a.criado_em DESC
        LIMIT ?`,

    cadastro_professor: `
        SELECT 'cadastro_professor' AS tipo, p.nome AS titulo, CONCAT('CREF ', p.cref) AS detalhe,
               p.criado_em AS quando, p.id_professor AS ref_id
        FROM professor p
        ORDER BY p.criado_em DESC
        LIMIT ?`,

    pagamento: `
        SELECT 'pagamento' AS tipo, a.nome AS titulo,
               CONCAT(pl.nome, ' • R$ ', FORMAT(pg.valor, 2), ' • ', pg.status) AS detalhe,
               pg.data_pagamento AS quando, a.id_aluno AS ref_id
        FROM pagamento pg
        JOIN aluno a ON a.id_aluno = pg.id_aluno
        JOIN assinatura s ON s.id_assinatura = pg.id_assinatura
        JOIN plano pl ON pl.id_plano = s.id_plano
        ORDER BY pg.data_pagamento DESC
        LIMIT ?`,

    video: `
        SELECT 'video' AS tipo, v.titulo AS titulo, CONCAT('Prof. ', p.nome) AS detalhe,
               v.criado_em AS quando, v.id_video AS ref_id
        FROM video v
        JOIN professor p ON p.id_professor = v.id_professor
        ORDER BY v.criado_em DESC
        LIMIT ?`,

    suporte: `
        SELECT 'suporte' AS tipo, COALESCE(s.assunto, 'Sem assunto') AS titulo,
               CONCAT(s.nome, ' • ', s.status) AS detalhe,
               s.criado_em AS quando, s.id_suporte AS ref_id
        FROM suporte s
        ORDER BY s.criado_em DESC
        LIMIT ?`,

    treino: `
        SELECT 'treino' AS tipo, a.nome AS titulo,
               CONCAT('Treino de ', st.duracao_min, ' min') AS detalhe,
               st.criado_em AS quando, a.id_aluno AS ref_id
        FROM sessao_treino st
        JOIN aluno a ON a.id_aluno = st.id_aluno
        ORDER BY st.criado_em DESC
        LIMIT ?`,

    acao_moderador: `
        SELECT 'acao_moderador' AS tipo, CONCAT(l.moderador_nome, ' • ', l.acao) AS titulo,
               COALESCE(l.detalhe, '') AS detalhe,
               l.criado_em AS quando, l.alvo_id AS ref_id
        FROM moderacao_log l
        ORDER BY l.criado_em DESC
        LIMIT ?`
}

const TIPOS = Object.keys(CONSULTAS)

// tipo = '' busca todos os tipos; senão filtra por um tipo só.
async function buscarAtividades({ tipo = '', limite = 30 } = {}) {
    const escolhidos = TIPOS.includes(tipo) ? [tipo] : TIPOS
    const partes = []
    const parametros = []

    for (const nome of escolhidos) {
        if (nome === 'acao_moderador' && !(await tabelaExiste('moderacao_log'))) continue

        partes.push('(' + CONSULTAS[nome].trim() + ')')
        parametros.push(limite)
    }

    if (partes.length === 0) return []

    const [linhas] = await db.query(
        partes.join(' UNION ALL ') + ' ORDER BY quando DESC LIMIT ?',
        [...parametros, limite]
    )

    return linhas
}

module.exports = { buscarAtividades, TIPOS }
