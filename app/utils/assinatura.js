const db = require('../config/pool_conexoes')

// Lógica de assinatura compartilhada pelo checkout com cartão (simulado)
// e pelo Mercado Pago: calcular o valor (com desconto de ofensiva) e ativar o plano.

// Devolve o plano, o valor final e o desconto que seria aplicado ao aluno.
async function calcularCobranca(idAluno, idPlano) {
    const [planoRows] = await db.query(
        'SELECT id_plano, nome, valor_mensal FROM plano WHERE id_plano = ?',
        [idPlano]
    )

    if (planoRows.length === 0) return null

    const plano = planoRows[0]
    const valorPlano = parseFloat(plano.valor_mensal)

    const [descontoRows] = await db.query(
        `SELECT id_desconto, percentual
         FROM desconto
         WHERE id_aluno = ?
         AND usado = 0
         AND (validade IS NULL OR validade >= CURDATE())
         ORDER BY percentual DESC
         LIMIT 1`,
        [idAluno]
    )

    let valorFinal = valorPlano
    let idDesconto = null

    if (descontoRows.length > 0) {
        valorFinal = valorPlano * (1 - parseFloat(descontoRows[0].percentual) / 100)
        idDesconto = descontoRows[0].id_desconto
    }

    return {
        plano,
        valorFinal: Math.round(valorFinal * 100) / 100,
        idDesconto
    }
}

// Cria a assinatura e o pagamento aprovado, troca o plano do aluno e consome o desconto.
async function ativarPlano({ idAluno, idPlano, valorFinal, idDesconto, metodo, nomeTitular, ultimos4, bandeira, tokenGateway, cpf }) {
    const dataInicio = new Date().toISOString().slice(0, 10)

    const [assinaturaResult] = await db.query(
        `INSERT INTO assinatura
         (id_aluno, id_plano, status, valor_cobrado, data_inicio, periodicidade)
         VALUES (?, ?, 'ativa', ?, ?, 'mensal')`,
        [idAluno, idPlano, valorFinal.toFixed(2), dataInicio]
    )

    const idAssinatura = assinaturaResult.insertId

    await db.query(
        `INSERT INTO pagamento
         (id_assinatura, id_aluno, valor, status, metodo, nome_titular, ultimos_4, bandeira, token_gateway)
         VALUES (?, ?, ?, 'aprovado', ?, ?, ?, ?, ?)`,
        [idAssinatura, idAluno, valorFinal.toFixed(2), metodo, nomeTitular, ultimos4 || null, bandeira || null, tokenGateway || null]
    )

    if (cpf) {
        await db.query('UPDATE aluno SET id_plano = ?, cpf = ? WHERE id_aluno = ?', [idPlano, cpf, idAluno])
    } else {
        await db.query('UPDATE aluno SET id_plano = ? WHERE id_aluno = ?', [idPlano, idAluno])
    }

    if (idDesconto) {
        await db.query(
            'UPDATE desconto SET usado = 1, id_assinatura = ? WHERE id_desconto = ?',
            [idAssinatura, idDesconto]
        )
    }

    return idAssinatura
}

module.exports = { calcularCobranca, ativarPlano }
