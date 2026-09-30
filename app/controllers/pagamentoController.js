const db = require('../config/pool_conexoes')
const { redirecionarPainelAluno } = require('../utils/redirecionamentos')

// =======================
// VALIDADORES INTERNOS
// =======================

function cpfValido(cpf) {
    if (!cpf || cpf.length !== 11) return false
    if (/^(\d)\1+$/.test(cpf)) return false

    let soma = 0

    for (let i = 0; i < 9; i++) {
        soma += Number(cpf.charAt(i)) * (10 - i)
    }

    let resto = (soma * 10) % 11

    if (resto === 10 || resto === 11) resto = 0
    if (resto !== Number(cpf.charAt(9))) return false

    soma = 0

    for (let i = 0; i < 10; i++) {
        soma += Number(cpf.charAt(i)) * (11 - i)
    }

    resto = (soma * 10) % 11

    if (resto === 10 || resto === 11) resto = 0

    return resto === Number(cpf.charAt(10))
}

function validadeValida(valor) {
    if (!/^\d{2}\/\d{2}$/.test(valor)) return false

    const partes = valor.split('/')
    const mes = Number(partes[0])
    const ano = Number('20' + partes[1])

    if (!mes || !ano) return false
    if (mes < 1 || mes > 12) return false

    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth() + 1

    if (ano < anoAtual) return false
    if (ano === anoAtual && mes < mesAtual) return false

    return true
}

// =======================
// EXIBIR TELA DE PAGAMENTO
// =======================

exports.exibir = async (req, res) => {
    const idPlano = Number(req.query.plano) || 2

    try {
        const [rows] = await db.query(
            'SELECT id_plano, nome, valor_mensal, descricao FROM plano WHERE id_plano = ?',
            [idPlano]
        )

        res.render('pagamento', {
            aluno: req.session.aluno,
            planoSelecionado: rows[0] || {
                id_plano: 2,
                nome: 'Lazuli',
                valor_mensal: 59.00
            }
        })
    } catch (err) {
        console.error('[pagamento GET]', err)

        res.render('pagamento', {
            aluno: req.session.aluno,
            planoSelecionado: {
                id_plano: 2,
                nome: 'Lazuli',
                valor_mensal: 59.00
            },
            erro: 'Não foi possível carregar o plano. Tente novamente.'
        })
    }
}

// =======================
// PROCESSAR PAGAMENTO
// =======================

exports.processar = async (req, res) => {
    const idAluno = req.session.aluno.id
    const idPlano = Number(req.body['id-plano']) || 2

    const nomeTitular = req.body['card-name'] || ''
    const numeroRaw = req.body['card-number'] || ''
    const cpfTitular = req.body['card-cpf'] || ''
    const validade = req.body['card-expiry'] || ''
    const cvvRaw = req.body['card-cvv'] || ''

    const numeroLimpo = numeroRaw.replace(/\D/g, '')
    const cpfLimpo = cpfTitular.replace(/\D/g, '')
    const cvvLimpo = cvvRaw.replace(/\D/g, '')
    const ultimos4 = numeroLimpo.slice(-4)

    async function renderizarErroPagamento(mensagem) {
        try {
            const [rows] = await db.query(
                'SELECT id_plano, nome, valor_mensal, descricao FROM plano WHERE id_plano = ?',
                [idPlano]
            )

            return res.render('pagamento', {
                aluno: req.session.aluno,
                planoSelecionado: rows[0] || {
                    id_plano: idPlano,
                    nome: idPlano === 3 ? 'Diamante' : 'Lazuli',
                    valor_mensal: idPlano === 3 ? 149.00 : 59.00
                },
                erro: mensagem
            })
        } catch (err) {
            console.error('[pagamento erro render]', err)

            return res.render('pagamento', {
                aluno: req.session.aluno,
                planoSelecionado: {
                    id_plano: idPlano,
                    nome: idPlano === 3 ? 'Diamante' : 'Lazuli',
                    valor_mensal: idPlano === 3 ? 149.00 : 59.00
                },
                erro: mensagem
            })
        }
    }

    if (![2, 3].includes(idPlano)) {
        return renderizarErroPagamento('Plano inválido.')
    }

    if (!nomeTitular.trim() || nomeTitular.trim().length < 5 || !nomeTitular.trim().includes(' ')) {
        return renderizarErroPagamento('Informe o nome completo do titular do cartão.')
    }

    if (!cpfValido(cpfLimpo)) {
        return renderizarErroPagamento('CPF inválido.')
    }

    if (numeroLimpo.length < 13 || numeroLimpo.length > 16) {
        return renderizarErroPagamento('Número do cartão inválido.')
    }

    if (!validadeValida(validade)) {
        return renderizarErroPagamento('Validade do cartão inválida ou vencida.')
    }

    if (cvvLimpo.length < 3 || cvvLimpo.length > 4) {
        return renderizarErroPagamento('CVV inválido.')
    }

    const primeiroDigito = numeroLimpo[0]

    const bandeira = primeiroDigito === '4'
        ? 'visa'
        : primeiroDigito === '5'
            ? 'mastercard'
            : 'outro'

    try {
        const [planoRows] = await db.query(
            'SELECT id_plano, nome, valor_mensal FROM plano WHERE id_plano = ?',
            [idPlano]
        )

        if (planoRows.length === 0) {
            return renderizarErroPagamento('Plano inválido.')
        }

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
            const percentual = parseFloat(descontoRows[0].percentual)
            valorFinal = valorPlano * (1 - percentual / 100)
            idDesconto = descontoRows[0].id_desconto
        }

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
             (id_assinatura, id_aluno, valor, status, metodo, nome_titular, ultimos_4, bandeira)
             VALUES (?, ?, ?, 'aprovado', 'cartao_credito', ?, ?, ?)`,
            [idAssinatura, idAluno, valorFinal.toFixed(2), nomeTitular.trim(), ultimos4, bandeira]
        )

        await db.query(
            'UPDATE aluno SET id_plano = ?, cpf = ? WHERE id_aluno = ?',
            [idPlano, cpfLimpo, idAluno]
        )

        if (idDesconto) {
            await db.query(
                'UPDATE desconto SET usado = 1, id_assinatura = ? WHERE id_desconto = ?',
                [idAssinatura, idDesconto]
            )
        }

        req.session.aluno.id_plano = idPlano

        res.redirect(redirecionarPainelAluno(idPlano))
    } catch (err) {
        console.error('[pagamento]', err)

        return renderizarErroPagamento('Erro ao processar pagamento.')
    }
}
