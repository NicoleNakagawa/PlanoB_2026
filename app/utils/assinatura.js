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
// Tudo em uma transação: ou grava tudo, ou não grava nada (sem assinatura "pela metade").
async function ativarPlano({ idAluno, idPlano, valorFinal, idDesconto, metodo, nomeTitular, ultimos4, bandeira, tokenGateway, cpf }) {
    const dataInicio = new Date().toISOString().slice(0, 10)
    const conexao = await db.getConnection()

    try {
        await conexao.beginTransaction()

        const [assinaturaResult] = await conexao.query(
            `INSERT INTO assinatura
             (id_aluno, id_plano, status, valor_cobrado, data_inicio, periodicidade)
             VALUES (?, ?, 'ativa', ?, ?, 'mensal')`,
            [idAluno, idPlano, valorFinal.toFixed(2), dataInicio]
        )

        const idAssinatura = assinaturaResult.insertId

        await conexao.query(
            `INSERT INTO pagamento
             (id_assinatura, id_aluno, valor, status, metodo, nome_titular, ultimos_4, bandeira, token_gateway)
             VALUES (?, ?, ?, 'aprovado', ?, ?, ?, ?, ?)`,
            [idAssinatura, idAluno, valorFinal.toFixed(2), metodo, nomeTitular, ultimos4 || null, bandeira || null, tokenGateway || null]
        )

        // O CPF é único na tabela aluno. Se já estiver em outra conta (comum em testes
        // com o mesmo CPF fictício), o plano é trocado do mesmo jeito, sem salvar o CPF.
        let salvouCpf = false

        if (cpf) {
            const [outro] = await conexao.query(
                'SELECT id_aluno FROM aluno WHERE cpf = ? AND id_aluno <> ? LIMIT 1',
                [cpf, idAluno]
            )

            if (outro.length === 0) {
                await conexao.query('UPDATE aluno SET id_plano = ?, cpf = ? WHERE id_aluno = ?', [idPlano, cpf, idAluno])
                salvouCpf = true
            }
        }

        if (!salvouCpf) {
            await conexao.query('UPDATE aluno SET id_plano = ? WHERE id_aluno = ?', [idPlano, idAluno])
        }

        if (idDesconto) {
            await conexao.query(
                'UPDATE desconto SET usado = 1, id_assinatura = ? WHERE id_desconto = ?',
                [idAssinatura, idDesconto]
            )
        }

        await conexao.commit()

        return idAssinatura
    } catch (err) {
        await conexao.rollback()
        throw err
    } finally {
        conexao.release()
    }
}

module.exports = { calcularCobranca, ativarPlano }
